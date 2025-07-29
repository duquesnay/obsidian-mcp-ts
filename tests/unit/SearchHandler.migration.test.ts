import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchHandler } from '../../src/resources/SearchHandler.js';

// Mock ObsidianClient
const mockObsidianClient = {
  search: vi.fn()
};

const mockServer = {
  obsidianClient: mockObsidianClient
};

// Sample search results
const sampleSearchResults = Array.from({ length: 50 }, (_, i) => ({
  path: `result-${i}.md`,
  matches: [{
    line: i + 1,
    text: `This is search result number ${i}`,
    context: `Context for search result ${i}`.repeat(5)
  }]
}));

describe('SearchHandler Migration to Shared Pagination', () => {
  const handler = new SearchHandler();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock implementation that simulates pagination based on parameters
    mockObsidianClient.search.mockImplementation(async (query: string, contextLength?: number, limit = 10, offset = 0) => {
      const paginatedResults = sampleSearchResults.slice(offset, offset + limit);
      return {
        results: paginatedResults,
        totalResults: sampleSearchResults.length,
        hasMore: offset + limit < sampleSearchResults.length,
        offset,
        limit
      };
    });
  });

  describe('Pagination Parameters Extraction', () => {
    it('should extract limit and offset parameters', async () => {
      const uri = 'vault://search/test?limit=10&offset=5';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.results).toHaveLength(10);
      expect(response.pagination?.limit).toBe(10);
      expect(response.pagination?.offset).toBe(5);
    });

    it('should handle page-based pagination', async () => {
      const uri = 'vault://search/test?page=2&limit=10';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination?.limit).toBe(10);
      expect(response.pagination?.offset).toBe(10); // page 2 * limit 10 - limit 10
      expect(response.pagination?.currentPage).toBe(2);
    });
  });

  describe('Standardized Pagination Metadata', () => {
    it('should include complete pagination metadata', async () => {
      const uri = 'vault://search/test?limit=10&offset=5';
      
      const response = await handler.handleRequest(uri, mockServer);
      
      expect(response.pagination).toMatchObject({
        totalItems: 50,
        hasMore: true,
        limit: 10,
        offset: 5,
        nextOffset: 15,
        previousOffset: 0, // Max of (5-10, 0) = 0
        currentPage: 1, // Math.floor(5/10) + 1 = 1
        totalPages: 5
      });
    });
  });

  describe('Performance Comparison', () => {
    it('should perform pagination efficiently', async () => {
      const uri = 'vault://search/test?limit=10&offset=20';
      
      const start = performance.now();
      const response = await handler.handleRequest(uri, mockServer);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100);
      expect(response.results).toHaveLength(10);
      expect(response.results[0].path).toBe('result-20.md');
    });
  });
});