import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { SearchClient } from '../../../src/obsidian/services/SearchClient.js';
import type { ObsidianClientConfig } from '../../../src/obsidian/ObsidianClient.js';

vi.mock('axios');

describe('SearchClient', () => {
  let client: SearchClient;
  let mockAxiosInstance: AxiosInstance;
  const config: ObsidianClientConfig = {
    apiKey: 'test-key',
    host: '127.0.0.1',
    port: 27124
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { timeout: 30000 }
    } as unknown as AxiosInstance;

    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
    client = new SearchClient(config);
  });

  describe('search', () => {
    it('should perform simple search', async () => {
      const mockResults = [
        { path: 'file1.md', matches: ['match1'] },
        { path: 'file2.md', matches: ['match2'] }
      ];
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: mockResults
      });

      const result = await client.search('query');

      expect(result).toEqual({
        results: mockResults,
        totalResults: 2,
        hasMore: false,
        offset: 0,
        limit: 2
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/search/simple/',
        null,
        { params: { query: 'query', contextLength: 100 } }
      );
    });

    it('should handle pagination', async () => {
      const mockResults = Array(15).fill(null).map((_, i) => ({
        path: `file${i}.md`,
        matches: [`match${i}`]
      }));
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: mockResults
      });

      const result = await client.search('query', 50, 10, 5);

      expect(result).toEqual({
        results: mockResults.slice(5, 15),
        totalResults: 15,
        hasMore: false,
        offset: 5,
        limit: 10
      });
    });

    it('should handle non-array response', async () => {
      const singleResult = { path: 'file.md', matches: ['match'] };
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: singleResult
      });

      const result = await client.search('query');

      expect(result).toEqual(singleResult);
    });
  });

  describe('complexSearch', () => {
    it('should perform complex search with JsonLogic', async () => {
      const query = { and: [{ contains: ['content', 'test'] }] };
      const mockResults = { results: ['file1.md', 'file2.md'] };
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: mockResults
      });

      const result = await client.complexSearch(query);

      expect(result).toEqual(mockResults);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search/', query);
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search with filters', async () => {
      const filters = {
        content: { query: 'test' },
        tags: { include: ['important'] }
      };
      const options = {
        limit: 20,
        includeContent: true,
        sort: { field: 'modified' as const, direction: 'desc' as const }
      };
      const mockResponse = {
        totalResults: 5,
        results: [
          {
            path: 'file1.md',
            score: 0.95,
            matches: [{ type: 'content' as const, context: 'test match' }],
            metadata: {
              size: 1000,
              created: '2024-01-01',
              modified: '2024-01-02',
              tags: ['important']
            }
          }
        ],
        hasMore: false
      };

      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: mockResponse
      });

      const result = await client.advancedSearch(filters, options);

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/search/advanced',
        { filters, options },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
    });

    it('should handle empty results', async () => {
      const filters = { content: { query: 'nonexistent' } };
      const options = { limit: 10 };
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: {}
      });

      const result = await client.advancedSearch(filters, options);

      expect(result).toEqual({
        totalResults: 0,
        results: [],
        hasMore: false
      });
    });
  });
});