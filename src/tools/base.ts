import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';

export interface AlternativeAction {
  description: string;
  tool?: string;
  example?: Record<string, any>;
}

export interface RecoveryOptions {
  suggestion: string;
  workingAlternative?: string;
  example?: Record<string, any>;
}

export abstract class BaseTool {
  protected obsidianClient: ObsidianClient | null = null;
  protected configLoader: ConfigLoader;

  constructor() {
    this.configLoader = ConfigLoader.getInstance();
  }

  abstract name: string;
  abstract description: string;
  abstract inputSchema: {
    type: 'object';
    properties: Record<string, any>;
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
        host: this.getObsidianHost()
      });
    }
    return this.obsidianClient;
  }

  abstract execute(args: any): Promise<any>;

  protected formatResponse(data: any): any {
    return {
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    };
  }

  protected handleError(error: any, alternatives?: AlternativeAction[]): any {
    console.error(`Error in ${this.name}:`, error);
    
    const errorResponse: any = {
      success: false,
      error: error.message || String(error),
      tool: this.name
    };

    if (alternatives && alternatives.length > 0) {
      errorResponse.alternatives = alternatives;
    }

    return this.formatResponse(errorResponse);
  }

  protected handleErrorWithRecovery(error: any, recovery: RecoveryOptions): any {
    console.error(`Error in ${this.name}:`, error);
    
    const errorResponse = {
      success: false,
      error: error.message || String(error),
      tool: this.name,
      suggestion: recovery.suggestion,
      working_alternative: recovery.workingAlternative,
      example: recovery.example
    };

    return this.formatResponse(errorResponse);
  }
}