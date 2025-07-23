import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';
import { ResourceHandler } from './types.js';

// Extend Server type to include obsidianClient for testing
interface ServerWithClient {
  obsidianClient?: ObsidianClient;
}

export abstract class BaseResourceHandler {
  /**
   * Main handler method that subclasses must implement
   */
  abstract handleRequest(uri: string, server?: any): Promise<any>;
  
  /**
   * Execute the handler and format the response
   */
  async execute(uri: string, server?: any): Promise<ReadResourceResult> {
    const data = await this.handleRequest(uri, server);
    
    // Auto-detect response type based on data
    if (typeof data === 'string') {
      return this.formatTextResponse(uri, data);
    } else {
      return this.formatJsonResponse(uri, data);
    }
  }
  
  /**
   * Format JSON data as a resource response
   */
  protected formatJsonResponse(uri: string, data: any): ReadResourceResult {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }
  
  /**
   * Format text as a resource response
   */
  protected formatTextResponse(uri: string, text: string, mimeType: string = 'text/markdown'): ReadResourceResult {
    return {
      contents: [{
        uri,
        mimeType,
        text
      }]
    };
  }
  
  /**
   * Extract path from a URI given a prefix
   */
  protected extractPath(uri: string, prefix: string): string {
    // Handle edge cases for folders
    if (uri === prefix.slice(0, -1) || uri === prefix) {
      return '';
    }
    return uri.substring(prefix.length);
  }
  
  /**
   * Get ObsidianClient instance (from server or create new)
   */
  protected getObsidianClient(server: ServerWithClient): ObsidianClient {
    // For testing, use the provided client
    if (server?.obsidianClient) {
      return server.obsidianClient;
    }
    
    // For production, create a new client
    const configLoader = ConfigLoader.getInstance();
    return new ObsidianClient({
      apiKey: configLoader.getApiKey(),
      host: configLoader.getHost(),
      verifySsl: false  // Disable SSL verification for self-signed Obsidian certificates
    });
  }
  
  /**
   * Handle common error cases
   */
  protected handleError(error: any, resourceType: string, path: string): never {
    // Handle 404 specifically
    if (error?.response?.status === 404) {
      throw new Error(`${resourceType} not found: ${path}`);
    }
    throw error;
  }
}