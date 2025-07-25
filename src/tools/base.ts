import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import type { IObsidianClient } from '../obsidian/interfaces/IObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';
import { isTestEnvironment } from '../utils/environment.js';
import { SimplifiedError } from '../types/errors.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';
import { hasHttpResponse, getErrorMessage } from '../utils/errorTypeGuards.js';

// Type helper for defining tool argument types
export type ToolArgs = Record<string, unknown>;

// Type for a collection of tools with unknown argument types
export type AnyTool = ToolInterface<any>;


// MCP tool response format
export interface ToolResponse {
  type: 'text';
  text: string;
}

// Common error response structure
export interface ErrorResponse {
  success: false;
  error: string;
  tool: string;
  suggestion?: string;
  working_alternative?: string;
  example?: Record<string, unknown>;
}

// Success response structure
export interface SuccessResponse {
  success: true;
  [key: string]: unknown;
}

export type ToolResult = SuccessResponse | ErrorResponse | ToolResponse;

// Type for tool argument schemas
export type ToolSchema<T> = {
  type: 'object';
  properties: Record<string, unknown>; // Keep flexible for now
  required?: string[]; // Keep as string[] for backward compatibility
};

// Future type-safe version when we update all tools:
// export type StrictToolSchema<T> = {
//   type: 'object';
//   properties: {
//     [K in keyof T]: {
//       type: string;
//       description: string;
//       default?: T[K];
//       enum?: readonly T[K][];
//     }
//   };
//   required?: ReadonlyArray<keyof T>;
// };

// Tool categories for organization
export type ToolCategory =
  | 'file-operations'
  | 'search'
  | 'editing'
  | 'tags'
  | 'periodic-notes'
  | 'directory-operations';

// Tool metadata for enhanced discovery and documentation
export interface ToolMetadata {
  category: ToolCategory;
  keywords?: string[];
  version?: string;
  deprecated?: boolean;
}

// Base interface for tool registration with generics
export interface ToolInterface<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: ToolSchema<TArgs>;
  execute(args: TArgs): Promise<ToolResponse>;
  metadata?: ToolMetadata;
}

export abstract class BaseTool<TArgs = Record<string, unknown>> implements ToolInterface<TArgs> {
  protected obsidianClient: IObsidianClient | null = null;
  protected configLoader: ConfigLoader;

  constructor() {
    this.configLoader = ConfigLoader.getInstance();
  }

  abstract name: string;
  abstract description: string;
  abstract inputSchema: ToolSchema<TArgs>;
  metadata?: ToolMetadata;

  protected getApiKey(): string {
    return this.configLoader.getApiKey();
  }

  protected getObsidianHost(): string {
    return this.configLoader.getHost();
  }

  protected getClient(): IObsidianClient {
    if (!this.obsidianClient) {
      this.obsidianClient = new ObsidianClient({
        apiKey: this.getApiKey(),
        host: this.getObsidianHost(),
        verifySsl: false  // Disable SSL verification for self-signed Obsidian certificates
      });
    }
    return this.obsidianClient;
  }

  // Concrete execute method that subclasses implement
  abstract executeTyped(args: TArgs): Promise<ToolResponse>;

  // Interface implementation - no more casting needed
  async execute(args: TArgs): Promise<ToolResponse> {
    return this.executeTyped(args);
  }

  protected formatResponse(data: unknown): ToolResponse {
    return {
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    };
  }

  protected handleError(error: unknown): ToolResponse {
    // Only log errors in non-test environments to avoid confusing test output
    // @TODO review and ponder wether that's a good idea to not have the error lgos at the tests... shouln't the error be out there, and no errir during tests... except when testing for errors?
    if (!isTestEnvironment()) {
      console.error(`Error in ${this.name}:`, error);
    }

    const errorMessage = getErrorMessage(error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
      tool: this.name
    };

    return this.formatResponse(errorResponse);
  }

  /**
   * Handle errors with simplified error structure
   */
  protected handleSimplifiedError(
    error: unknown,
    suggestion?: string,
    example?: Record<string, unknown>
  ): ToolResponse {
    // Only log errors in non-test environments to avoid confusing test output
    if (!isTestEnvironment()) {
      console.error(`Error in ${this.name}:`, error);
    }

    const errorMessage = getErrorMessage(error);
    const simplifiedError: SimplifiedError = {
      success: false,
      error: errorMessage,
      tool: this.name
    };

    if (suggestion) {
      simplifiedError.suggestion = suggestion;
    }

    if (example) {
      simplifiedError.example = example;
    }

    return this.formatResponse(simplifiedError);
  }

  /**
   * Handle HTTP errors with custom status code handlers
   * @param error - The error object (must have error.response?.status for HTTP errors)
   * @param statusHandlers - Optional map of status codes to custom messages or handler objects
   * @returns ToolResponse with appropriate error message and metadata
   */
  protected handleHttpError(
    error: unknown,
    statusHandlers?: Record<number, string | { message: string; suggestion?: string; example?: Record<string, unknown> }>
  ): ToolResponse {
    // If no response property, use the general error handler
    if (!hasHttpResponse(error)) {
      return ObsidianErrorHandler.handleHttpError(error, this.name);
    }

    const status = error.response!.status!;

    // Check if we have a custom handler for this status code
    if (statusHandlers && statusHandlers[status]) {
      const handler = statusHandlers[status];

      if (typeof handler === 'string') {
        // Simple string message
        return this.formatResponse({
          success: false,
          error: handler,
          tool: this.name
        });
      } else {
        // Handler object with message, suggestion, and/or example
        const errorResponse: SimplifiedError = {
          success: false,
          error: handler.message,
          tool: this.name
        };

        if (handler.suggestion) {
          errorResponse.suggestion = handler.suggestion;
        }

        if (handler.example) {
          errorResponse.example = handler.example;
        }

        return this.formatResponse(errorResponse);
      }
    }

    // Fall back to ObsidianErrorHandler for unhandled status codes
    return ObsidianErrorHandler.handleHttpError(error, this.name);
  }

}
