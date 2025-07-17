import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';
import { isTestEnvironment } from '../utils/environment.js';
import { SimplifiedError } from '../types/errors.js';

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
  protected obsidianClient: ObsidianClient | null = null;
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

  protected getClient(): ObsidianClient {
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
    if (!isTestEnvironment()) {
      console.error(`Error in ${this.name}:`, error);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
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
    
    const errorMessage = error instanceof Error ? error.message : String(error);
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

}