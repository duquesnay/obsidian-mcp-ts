import { BaseResourceHandler } from './BaseResourceHandler.js';

export class SearchHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const query = this.extractQuery(uri);
    
    const client = this.getObsidianClient(server);
    const searchResults = await client.search(query);
    
    return {
      query,
      results: searchResults.results,
      totalResults: searchResults.totalResults,
      hasMore: searchResults.hasMore
    };
  }
  
  private extractQuery(uri: string): string {
    const prefix = 'vault://search/';
    
    // Extract query and handle edge cases
    if (uri === prefix || uri === prefix.slice(0, -1)) {
      throw new Error('Search query is required');
    }
    
    // Extract and decode the query
    let query = uri.substring(prefix.length);
    
    // Remove trailing slash if present
    if (query.endsWith('/')) {
      query = query.slice(0, -1);
    }
    
    // URL decode the query
    query = decodeURIComponent(query);
    
    // Validate query is not empty after trimming
    if (!query.trim()) {
      throw new Error('Search query is required');
    }
    
    return query;
  }
}