import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';
import { isTestEnvironment } from '../utils/environment.js';

export interface AlternativeAction {
  description: string;
  tool?: string;
  example?: Record<string, unknown>;
}

export interface RecoveryOptions {
  suggestion: string;
  workingAlternative?: string;
  example?: Record<string, unknown>;
}

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
  alternatives?: AlternativeAction[];
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

// Base interface for tool registration
export interface ToolInterface {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute(args: Record<string, unknown>): Promise<ToolResponse>;
}

export abstract class BaseTool<TArgs = Record<string, unknown>> implements ToolInterface {
  protected obsidianClient: ObsidianClient | null = null;
  protected configLoader: ConfigLoader;

  constructor() {
    this.configLoader = ConfigLoader.getInstance();
  }

  abstract name: string;
  abstract description: string;
  abstract inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };

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
  
  // Interface implementation with type casting
  async execute(args: Record<string, unknown>): Promise<ToolResponse> {
    return this.executeTyped(args as TArgs);
  }

  protected formatResponse(data: unknown): ToolResponse {
    return {
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    };
  }

  protected handleError(error: unknown, alternatives?: AlternativeAction[]): ToolResponse {
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

    if (alternatives && alternatives.length > 0) {
      errorResponse.alternatives = alternatives;
    }

    return this.formatResponse(errorResponse);
  }

  protected handleErrorWithRecovery(error: unknown, recovery: RecoveryOptions): ToolResponse {
    // Only log errors in non-test environments to avoid confusing test output
    if (!isTestEnvironment()) {
      console.error(`Error in ${this.name}:`, error);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
      tool: this.name,
      suggestion: recovery.suggestion,
      working_alternative: recovery.workingAlternative,
      example: recovery.example
    };

    return this.formatResponse(errorResponse);
  }
}