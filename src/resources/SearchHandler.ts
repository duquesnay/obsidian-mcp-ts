import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';

export class SearchHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const { query, contextLength, limit, offset } = this.extractSearchParams(uri);
    
    const client = this.getObsidianClient(server);
    
    try {
      const searchResults = await client.search(query, contextLength, limit, offset);
      
      return {
        query,
        results: searchResults.results,
        totalResults: searchResults.totalResults,
        hasMore: searchResults.hasMore
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Search results', query);
    }
  }
  
  private extractSearchParams(uri: string): { query: string; contextLength?: number; limit?: number; offset?: number } {
    const prefix = 'vault://search/';
    
    // Extract the part after vault://search/
    const remainder = uri.substring(prefix.length);
    
    // For now, treat the entire remainder as the query
    // In the future, we could support URL-encoded parameters
    const query = decodeURIComponent(remainder);
    
    try {
      ResourceValidationUtil.validateRequiredParameter(query, 'Search query');
    } catch (error) {
      // Convert the generic validation error to the specific error expected by tests
      throw new Error('Search query is required');
    }
    
    return { query };
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