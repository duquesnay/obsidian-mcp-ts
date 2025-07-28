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

      expect(mockClient.search).toHaveBeenCalledWith('query-term', 100, undefined, undefined);
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

      expect(mockClient.search).toHaveBeenCalledWith('multiple words', 100, undefined, undefined);
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

    describe('Mode parameter support', () => {
      it('should default to preview mode (100-character context)', async () => {
        const searchResults = {
          results: [
            {
              filename: 'note1.md',
              score: 0.95,
              matches: [
                {
                  match: { start: 0, end: 10 },
                  context: 'This is a very long context that should be truncated to 100 characters in preview mode and this text should not appear in the preview'
                }
              ]
            }
          ],
          totalResults: 1,
          hasMore: false
        };
        
        mockClient.search.mockResolvedValue(searchResults);

        const result = await handler.handleRequest('vault://search/query-term', mockServer);

        expect(mockClient.search).toHaveBeenCalledWith('query-term', 100, undefined, undefined);
        expect(result.results[0].matches[0].context).toHaveLength(100);
        expect(result.results[0].matches[0].context).toBe('This is a very long context that should be truncated to 100 characters in preview mode and this text');
      });

      it('should support full mode with ?mode=full parameter', async () => {
        const fullContext = 'This is a very long context that should not be truncated in full mode and this text should appear in the full response when mode=full';
        const searchResults = {
          results: [
            {
              filename: 'note1.md',
              score: 0.95,
              matches: [
                {
                  match: { start: 0, end: 10 },
                  context: fullContext
                }
              ]
            }
          ],
          totalResults: 1,
          hasMore: false
        };
        
        mockClient.search.mockResolvedValue(searchResults);

        const result = await handler.handleRequest('vault://search/query-term?mode=full', mockServer);

        expect(mockClient.search).toHaveBeenCalledWith('query-term', undefined, undefined, undefined);
        expect(result.results[0].matches[0].context).toBe(fullContext);
      });

      it('should support preview mode with explicit ?mode=preview parameter', async () => {
        const searchResults = {
          results: [
            {
              filename: 'note1.md',
              score: 0.95,
              matches: [
                {
                  match: { start: 0, end: 10 },
                  context: 'This is a very long context that should be truncated to 100 characters in preview mode and this text should not appear in the preview'
                }
              ]
            }
          ],
          totalResults: 1,
          hasMore: false
        };
        
        mockClient.search.mockResolvedValue(searchResults);

        const result = await handler.handleRequest('vault://search/query-term?mode=preview', mockServer);

        expect(mockClient.search).toHaveBeenCalledWith('query-term', 100, undefined, undefined);
        expect(result.results[0].matches[0].context).toHaveLength(100);
      });

      it('should handle URL-encoded query with mode parameter', async () => {
        const searchResults = {
          results: [
            {
              filename: 'note1.md',
              score: 0.95,
              matches: [
                {
                  match: { start: 0, end: 10 },
                  context: 'Multiple words context that should be returned in full'
                }
              ]
            }
          ],
          totalResults: 1,
          hasMore: false
        };
        
        mockClient.search.mockResolvedValue(searchResults);

        const result = await handler.handleRequest('vault://search/multiple%20words?mode=full', mockServer);

        expect(mockClient.search).toHaveBeenCalledWith('multiple words', undefined, undefined, undefined);
        expect(result.query).toBe('multiple words');
      });

      it('should ignore invalid mode parameter and default to preview', async () => {
        const searchResults = {
          results: [
            {
              filename: 'note1.md',
              score: 0.95,
              matches: [
                {
                  match: { start: 0, end: 10 },
                  context: 'This context should be truncated since invalid mode defaults to preview'
                }
              ]
            }
          ],
          totalResults: 1,
          hasMore: false
        };
        
        mockClient.search.mockResolvedValue(searchResults);

        const result = await handler.handleRequest('vault://search/query?mode=invalid', mockServer);

        expect(mockClient.search).toHaveBeenCalledWith('query', 100, undefined, undefined);
        expect(result.results[0].matches[0].context).toHaveLength(71); // Length of the test context
      });

      it('should handle multiple query parameters with mode', async () => {
        const searchResults = {
          results: [],
          totalResults: 0,
          hasMore: false
        };
        
        mockClient.search.mockResolvedValue(searchResults);

        const result = await handler.handleRequest('vault://search/test?mode=full&other=param', mockServer);

        expect(mockClient.search).toHaveBeenCalledWith('test', undefined, undefined, undefined);
        expect(result.query).toBe('test');
      });
    });
  });
});