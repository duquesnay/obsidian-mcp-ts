import { ObsidianClient } from '../obsidian/ObsidianClient.js';

export abstract class BaseTool {
  protected obsidianClient: ObsidianClient | null = null;

  abstract name: string;
  abstract description: string;
  abstract inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  protected getApiKey(): string {
    const apiKey = process.env.OBSIDIAN_API_KEY;
    if (!apiKey) {
      throw new Error(`OBSIDIAN_API_KEY environment variable required. Working directory: ${process.cwd()}`);
    }
    return apiKey;
  }

  protected getObsidianHost(): string {
    return process.env.OBSIDIAN_HOST || '127.0.0.1';
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

  protected handleError(error: any): any {
    console.error(`Error in ${this.name}:`, error);
    
    return {
      type: 'text',
      text: `Error: ${error.message || String(error)}`
    };
  }
}