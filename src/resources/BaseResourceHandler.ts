import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';
import { ResourceHandler, ResourceMetadata } from './types.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';
import { ResponseModeSystem, ResponseMode, ResponseContent, ModeResponse } from '../utils/ResponseModeSystem.js';
import { PaginationSystem, PaginationParams, PaginationOptions } from '../utils/PaginationSystem.js';
import { ResourceMetadataUtil } from '../utils/ResourceMetadataUtil.js';

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
   * Fetch resource metadata for a file path
   * @param filepath Path to the file in the vault
   * @param server Server instance containing ObsidianClient
   * @returns Resource metadata with size and lastModified, or null if unavailable
   */
  protected async getResourceMetadata(filepath: string, server: ServerWithClient): Promise<ResourceMetadata | null> {
    try {
      const client = this.getObsidianClient(server);
      return await ResourceMetadataUtil.fetchMetadata(client, filepath);
    } catch (error) {
      // Return null if metadata can't be fetched
      // Resources should still work without metadata
      return null;
    }
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
  protected processResponseContent(content: ResponseContent, mode: ResponseMode): any {
    // Return structured response object so execute() will detect it as JSON
    return ResponseModeSystem.createModeResponse(content, mode);
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

  // Pagination System Integration

  /**
   * Extract pagination parameters from URI using PaginationSystem
   */
  protected extractPaginationParameters(uri: string, options?: PaginationOptions): PaginationParams {
    return PaginationSystem.parseParameters(uri, options);
  }

  /**
   * Create a paginated response with standardized metadata
   */
  protected createPaginatedResponse<T>(
    data: T[],
    params: PaginationParams,
    additionalMetadata?: Record<string, any>
  ) {
    return PaginationSystem.createPaginatedResponse(data, params, data.length, additionalMetadata);
  }

  /**
   * Apply pagination to data array
   */
  protected applyPagination<T>(data: T[], params: PaginationParams): T[] {
    return PaginationSystem.applyPagination(data, params);
  }

  /**
   * Generate pagination metadata
   */
  protected generatePaginationMetadata(params: PaginationParams, totalItems: number) {
    return PaginationSystem.generateMetadata(params, totalItems);
  }

  /**
   * Check if pagination is requested
   */
  protected isPaginationRequested(params: PaginationParams): boolean {
    return PaginationSystem.isPaginationRequested(params);
  }

  /**
   * Generate continuation token for stateful pagination
   */
  protected generateContinuationToken(type: string, query: string, offset: number): string {
    return PaginationSystem.generateContinuationToken(type, query, offset);
  }
}