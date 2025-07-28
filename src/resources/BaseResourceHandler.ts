import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';
import { ResourceHandler } from './types.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';
import { ResponseModeSystem, ResponseMode, ResponseContent, ModeResponse } from '../utils/ResponseModeSystem.js';

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
    return ResourceValidationUtil.extractUriParameter(uri, prefix, 'path');
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
   * @deprecated Use ResourceErrorHandler.handle() instead
   */
  protected handleError(error: any, resourceType: string, path: string): never {
    ResourceErrorHandler.handleApiError(error, resourceType, path);
  }

  // Response Mode System Integration

  /**
   * Extract response mode from URI query parameters using ResponseModeSystem
   */
  protected extractModeFromUri(uri: string): ResponseMode {
    return ResponseModeSystem.extractModeFromUri(uri);
  }

  /**
   * Process content based on response mode using ResponseModeSystem
   */
  protected processResponseContent(content: ResponseContent, mode: ResponseMode): string {
    return ResponseModeSystem.processContent(content, mode);
  }

  /**
   * Create optimized summary response with optional caching
   */
  protected createSummaryResponse(content: string, cacheKey?: string): string {
    return ResponseModeSystem.createSummary(content, cacheKey);
  }

  /**
   * Create optimized preview response with optional caching
   */
  protected createPreviewResponse(content: string, cacheKey?: string): string {
    return ResponseModeSystem.createPreview(content, cacheKey);
  }

  /**
   * Format a response with mode information as JSON
   */
  protected formatModeResponse(uri: string, content: ResponseContent, mode: ResponseMode): ReadResourceResult {
    const modeResponse = ResponseModeSystem.createModeResponse(content, mode);
    return this.formatJsonResponse(uri, modeResponse);
  }

  /**
   * Create a structured mode response object
   */
  protected createModeResponse(content: ResponseContent, mode: ResponseMode): ModeResponse {
    return ResponseModeSystem.createModeResponse(content, mode);
  }
}