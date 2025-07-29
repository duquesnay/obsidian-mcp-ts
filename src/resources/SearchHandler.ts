import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';

export class SearchHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const { query, contextLength } = this.extractSearchParams(uri);
    
    // Extract pagination parameters using shared system
    const paginationParams = this.extractPaginationParameters(uri, {
      defaultLimit: OBSIDIAN_DEFAULTS.DEFAULT_RESOURCE_SEARCH_LIMIT,
      maxLimit: OBSIDIAN_DEFAULTS.MAX_SEARCH_RESULTS
    });
    
    const client = this.getObsidianClient(server);
    
    try {
      const searchResults = await client.search(query, contextLength, paginationParams.limit, paginationParams.offset);
      
      // If we're in preview mode (contextLength is defined), truncate contexts
      let processedResults = searchResults.results;
      if (contextLength !== undefined && Array.isArray(searchResults.results)) {
        processedResults = this.truncateContexts(searchResults.results, contextLength);
      }
      
      // Create standardized pagination metadata
      const totalResults = 'totalResults' in searchResults ? (searchResults.totalResults as number) : 0;
      const paginationMetadata = this.generatePaginationMetadata(paginationParams, totalResults);
      
      const response: any = {
        query,
        results: processedResults,
        totalResults: totalResults,
        hasMore: 'hasMore' in searchResults ? searchResults.hasMore : false,
        pagination: paginationMetadata
      };
      
      // Include continuation token if available from client
      if (searchResults.continuationToken) {
        response.continuationToken = searchResults.continuationToken;
      }
      
      return response;
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Search results', query);
    }
  }
  
  private extractSearchParams(uri: string): { query: string; contextLength?: number } {
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
    
    return { query, contextLength };
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