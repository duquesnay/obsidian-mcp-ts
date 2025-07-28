import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchHandler } from '../../../src/resources/SearchHandler.js';

describe('SearchHandler', () => {
  let handler: SearchHandler;
  let mockClient: any;
  let mockServer: any;

  beforeEach(() => {
    // Create mock ObsidianClient with search method
    mockClient = {
      search: vi.fn()
    };
    
    // Create mock server with ObsidianClient
    mockServer = {
      obsidianClient: mockClient
    };
    
    handler = new SearchHandler();
  });

  describe('handleRequest', () => {
    it('should extract query from vault://search/query-term URI', async () => {
      const searchResults = {
        results: [
          {
            filename: 'note1.md',
            score: 0.95,
            matches: [
              {
                match: { start: 0, end: 10 },
                context: 'query-term found here'
              }
            ]
          }
        ],
        totalResults: 1,
        hasMore: false
      };
      
      mockClient.search.mockResolvedValue(searchResults);

      const result = await handler.handleRequest('vault://search/query-term', mockServer);

      expect(mockClient.search).toHaveBeenCalledWith('query-term', undefined, undefined, undefined);
      expect(result).toEqual({
        query: 'query-term',
        results: searchResults.results,
        totalResults: searchResults.totalResults,
        hasMore: searchResults.hasMore
      });
    });

    it('should handle URL-encoded queries with spaces', async () => {
      const searchResults = {
        results: [],
        totalResults: 0,
        hasMore: false
      };
      
      mockClient.search.mockResolvedValue(searchResults);

      const result = await handler.handleRequest('vault://search/multiple%20words', mockServer);

      expect(mockClient.search).toHaveBeenCalledWith('multiple words', undefined, undefined, undefined);
      expect(result.query).toBe('multiple words');
    });

    it('should throw error for missing query parameter', async () => {
      await expect(handler.handleRequest('vault://search/', mockServer))
        .rejects.toThrow('Search query is required');
    });

    it('should throw error for empty query after decoding', async () => {
      await expect(handler.handleRequest('vault://search/%20%20', mockServer))
        .rejects.toThrow('Search query is required');
    });

    it('should handle search API errors', async () => {
      mockClient.search.mockRejectedValue(new Error('Search API failed'));

      await expect(handler.handleRequest('vault://search/test', mockServer))
        .rejects.toThrow('Search API failed');
    });
  });
});