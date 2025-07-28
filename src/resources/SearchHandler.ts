import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';

export class SearchHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const { query, contextLength, limit, offset, token } = this.extractSearchParams(uri);
    
    const client = this.getObsidianClient(server);
    
    try {
      // Handle continuation token if provided
      let actualOffset = offset;
      if (token && !offset) {
        try {
          const decoded = JSON.parse(atob(token));
          if (decoded.type === 'search' && decoded.query === query) {
            actualOffset = decoded.offset;
          }
        } catch (e) {
          // Invalid token, ignore and use provided offset
        }
      }
      
      const searchResults = await client.search(query, contextLength, limit, actualOffset);
      
      // If we're in preview mode (contextLength is defined), truncate contexts
      let processedResults = searchResults.results;
      if (contextLength !== undefined && Array.isArray(searchResults.results)) {
        processedResults = this.truncateContexts(searchResults.results, contextLength);
      }
      
      const response: any = {
        query,
        results: processedResults,
        totalResults: searchResults.totalResults,
        hasMore: searchResults.hasMore
      };
      
      // Include continuation token if available
      if (searchResults.continuationToken) {
        response.continuationToken = searchResults.continuationToken;
      }
      
      return response;
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Search results', query);
    }
  }
  
  private extractSearchParams(uri: string): { query: string; contextLength?: number; limit?: number; offset?: number; token?: string } {
    const prefix = 'vault://search/';
    
    // Extract the part after vault://search/
    const remainder = uri.substring(prefix.length);
    
    // Split on first '?' to separate query from URL parameters
    const questionMarkIndex = remainder.indexOf('?');
    let queryPart: string;
    let urlParams: URLSearchParams = new URLSearchParams();
    
    if (questionMarkIndex !== -1) {
      queryPart = remainder.substring(0, questionMarkIndex);
      const paramString = remainder.substring(questionMarkIndex + 1);
      urlParams = new URLSearchParams(paramString);
    } else {
      queryPart = remainder;
    }
    
    // URL decode the query part
    const query = decodeURIComponent(queryPart);
    
    try {
      ResourceValidationUtil.validateRequiredParameter(query, 'Search query');
    } catch (error) {
      // Convert the generic validation error to the specific error expected by tests
      throw new Error('Search query is required');
    }
    
    // Extract mode parameter and determine contextLength
    const mode = urlParams.get('mode');
    let contextLength: number | undefined;
    
    if (mode === 'full') {
      contextLength = undefined; // No truncation
    } else {
      // Default to preview mode (mode === 'preview' or no mode or invalid mode)
      contextLength = OBSIDIAN_DEFAULTS.CONTEXT_LENGTH;
    }
    
    // Extract pagination parameters
    const limitParam = urlParams.get('limit');
    const offsetParam = urlParams.get('offset');
    const token = urlParams.get('token');
    
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
    
    return { query, contextLength, limit, offset, token };
  }
  
  private truncateContexts(results: any[], maxLength: number): any[] {
    return results.map(result => ({
      ...result,
      matches: result.matches?.map((match: any) => ({
        ...match,
        context: match.context && match.context.length > maxLength 
          ? match.context.substring(0, maxLength)
          : match.context
      }))
    }));
  }
  
  private extractQuery(uri: string): string {
    const prefix = 'vault://search/';
    const query = ResourceValidationUtil.extractUriParameter(uri, prefix, 'query');
    
    try {
      ResourceValidationUtil.validateRequiredParameter(query, 'Search query');
    } catch (error) {
      // Convert the generic validation error to the specific error expected by tests
      throw new Error('Search query is required');
    }
    
    return query;
  }
}