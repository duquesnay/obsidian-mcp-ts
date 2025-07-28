import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchHandler } from '../../src/resources/SearchHandler.js';
import { SearchClient } from '../../src/obsidian/services/SearchClient.js';
import { SimpleSearchTool } from '../../src/tools/SimpleSearchTool.js';
import { OBSIDIAN_DEFAULTS } from '../../src/constants.js';
import { defaultCachedHandlers } from '../../src/resources/CachedConcreteHandlers.js';

describe('Search Pagination Integration', () => {
  let searchHandler: SearchHandler;
  let searchClient: SearchClient;
  let mockServer: any;

  beforeEach(() => {
    searchHandler = new SearchHandler();
    
    // Mock search client with realistic paginated data
    const mockResults = Array.from({ length: 25 }, (_, i) => ({
      path: `note${i + 1}.md`,
      score: 1.0 - (i * 0.02), // Decreasing relevance scores
      matches: [{
        match: { start: 10, end: 20 },
        context: `This is search result ${i + 1} with relevant context about the query term`
      }]
    }));

    mockServer = {
      obsidianClient: {
        search: vi.fn().mockImplementation((query, contextLength, limit, offset) => {
          const actualLimit = limit || OBSIDIAN_DEFAULTS.DEFAULT_RESOURCE_SEARCH_LIMIT;
          const startIndex = offset || 0;
          const endIndex = Math.min(startIndex + actualLimit, mockResults.length);
          const paginatedResults = mockResults.slice(startIndex, endIndex);

          let continuationToken: string | undefined;
          if (endIndex < mockResults.length) {
            const tokenData = {
              type: 'search',
              query,
              offset: endIndex,
              contextLength
            };
            continuationToken = btoa(JSON.stringify(tokenData));
          }

          return Promise.resolve({
            results: paginatedResults,
            totalResults: mockResults.length,
            hasMore: endIndex < mockResults.length,
            offset: startIndex,
            limit: actualLimit,
            continuationToken
          });
        })
      }
    };
  });

  describe('vault://search/{query} resource pagination', () => {
    it('should return first page with default limit of 10', async () => {
      const result = await searchHandler.handleRequest('vault://search/test', mockServer);

      expect(result).toEqual(expect.objectContaining({
        query: 'test',
        totalResults: 25,
        hasMore: true
      }));
      expect(result.results).toHaveLength(10);
      expect(result.results[0].score).toBe(1.0); // Highest relevance first
      expect(result.results[9].score).toBeCloseTo(0.82, 2); // 10th result
    });

    it('should support custom limit parameter', async () => {
      const result = await searchHandler.handleRequest('vault://search/test?limit=5', mockServer);

      expect(result).toEqual(expect.objectContaining({
        query: 'test',
        totalResults: 25,
        hasMore: true
      }));
      expect(result.results).toHaveLength(5);
      expect(result.results[0].score).toBe(1.0);
      expect(result.results[4].score).toBeCloseTo(0.92, 2);
    });

    it('should support offset parameter for pagination', async () => {
      const result = await searchHandler.handleRequest('vault://search/test?limit=5&offset=10', mockServer);

      expect(result).toEqual(expect.objectContaining({
        query: 'test',
        totalResults: 25,
        hasMore: true
      }));
      expect(result.results).toHaveLength(5);
      expect(result.results[0].score).toBeCloseTo(0.8, 2); // 11th result (offset 10)
      expect(result.results[4].score).toBeCloseTo(0.72, 2); // 15th result
    });

    it('should generate continuation tokens for consistent ordering', async () => {
      const result = await searchHandler.handleRequest('vault://search/test?limit=5', mockServer);

      expect(result).toHaveProperty('continuationToken');
      expect(typeof result.continuationToken).toBe('string');

      // Decode and verify token structure
      const decodedToken = JSON.parse(atob(result.continuationToken!));
      expect(decodedToken).toEqual({
        type: 'search',
        query: 'test',
        offset: 5, // Next page starts at offset 5
        contextLength: 100
      });
    });

    it('should handle continuation tokens for next page', async () => {
      const continuationToken = btoa(JSON.stringify({
        type: 'search',
        query: 'test',
        offset: 5,
        contextLength: 100
      }));

      const result = await searchHandler.handleRequest(
        `vault://search/test?token=${continuationToken}&limit=5`, mockServer
      );

      expect(result.results).toHaveLength(5);
      expect(result.results[0].score).toBeCloseTo(0.9, 2); // 6th result (offset 5)
      expect(result.results[4].score).toBeCloseTo(0.82, 2); // 10th result
    });

    it('should include relevance scores in results', async () => {
      const result = await searchHandler.handleRequest('vault://search/test?limit=3', mockServer);

      expect(result.results[0]).toEqual(expect.objectContaining({
        path: 'note1.md',
        score: 1.0,
        matches: expect.any(Array)
      }));
      expect(result.results[1]).toEqual(expect.objectContaining({
        path: 'note2.md',
        score: 0.98
      }));
      expect(result.results[2]).toEqual(expect.objectContaining({
        path: 'note3.md',
        score: 0.96
      }));
    });
  });

  describe('SimpleSearchTool integration', () => {
    it('should support pagination through tool interface', async () => {
      const tool = new SimpleSearchTool();
      
      // Mock the resource handler
      const mockResourceData = {
        query: 'test',
        results: [
          { path: 'note1.md', score: 0.95, matches: ['match1'] }
        ],
        totalResults: 20,
        hasMore: true,
        continuationToken: 'eyJ0eXBlIjoic2VhcmNoIiwib2Zmc2V0IjoxfQ=='
      };

      vi.spyOn(defaultCachedHandlers.search, 'handleRequest')
        .mockResolvedValue(mockResourceData);

      const result = await tool.executeTyped({
        query: 'test',
        limit: 1,
        offset: 0
      });

      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      expect(response).toEqual({
        results: mockResourceData.results,
        totalResults: mockResourceData.totalResults,
        hasMore: mockResourceData.hasMore
      });
    });
  });
});