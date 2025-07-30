import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CachedResourceHandler } from '../../src/resources/CachedResourceHandler.js';
import { VaultStructureHandler } from '../../src/resources/VaultStructureHandler.js';
import { TagNotesHandler } from '../../src/resources/TagNotesHandler.js';
import { SearchHandler } from '../../src/resources/SearchHandler.js';
import { RecentChangesHandler } from '../../src/resources/RecentChangesHandler.js';

// Mock ObsidianClient methods
const createMockObsidianClient = () => ({
  listFilesInVault: vi.fn().mockImplementation(async () => {
    // Simulate a delay to test concurrent behavior
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      '/test1.md',
      '/test2.md',
      '/test3.md'
    ];
  }),
  getAllTags: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      '#tag1': 5,
      '#tag2': 3,
      '#tag3': 1
    };
  }),
  searchSimple: vi.fn().mockImplementation(async (query: string) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        filename: `result1-${query}.md`,
        matches: [{ match: `Found ${query}`, context: `Context for ${query}` }]
      },
      {
        filename: `result2-${query}.md`,
        matches: [{ match: `Another ${query}`, context: `More context for ${query}` }]
      }
    ];
  }),
  getRecentChanges: vi.fn().mockImplementation(async (directory, limit, offset, contentLength) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { path: '/recent1.md', mtime: Date.now() - 1000, content: 'Recent content 1' },
      { path: '/recent2.md', mtime: Date.now() - 2000, content: 'Recent content 2' },
      { path: '/recent3.md', mtime: Date.now() - 3000, content: 'Recent content 3' }
    ];
  })
});

describe('CachedResourceHandler Deduplication Integration', () => {
  let mockClient: any;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Create mock client
    mockClient = createMockObsidianClient();
    mockServer = { obsidianClient: mockClient };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('VaultStructureHandler with deduplication', () => {
    it('should deduplicate concurrent requests for vault structure', async () => {
      const handler = new VaultStructureHandler();
      const cachedHandler = new CachedResourceHandler(handler, {
        enableDeduplication: true,
        deduplicationTtl: 5000
      });

      // Start multiple concurrent requests
      const promises = [
        cachedHandler.handleRequest('vault://structure', mockServer),
        cachedHandler.handleRequest('vault://structure', mockServer),
        cachedHandler.handleRequest('vault://structure', mockServer)
      ];

      // Advance timers to complete the requests
      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      // All results should be identical
      expect(results[0]).toBeDefined();
      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);

      // The underlying API should only be called once
      expect(mockClient.listFilesInVault).toHaveBeenCalledTimes(1);

      // Check deduplication stats
      const stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication).toBeDefined();
      expect(stats.deduplication?.hits).toBe(2); // 2 hits
      expect(stats.deduplication?.misses).toBe(1); // 1 miss
    });

    it('should serve from cache after deduplication', async () => {
      const handler = new VaultStructureHandler();
      const cachedHandler = new CachedResourceHandler(handler, {
        enableDeduplication: true
      });

      // First batch of requests
      const firstBatch = [
        cachedHandler.handleRequest('vault://structure', mockServer),
        cachedHandler.handleRequest('vault://structure', mockServer)
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(firstBatch);

      expect(mockClient.listFilesInVault).toHaveBeenCalledTimes(1);

      // Second request should come from cache
      const cached = await cachedHandler.handleRequest('vault://structure', mockServer);
      expect(cached).toBeDefined();
      expect(mockClient.listFilesInVault).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('RecentChangesHandler with deduplication', () => {
    it('should deduplicate concurrent requests for recent changes', async () => {
      const handler = new RecentChangesHandler();
      const cachedHandler = new CachedResourceHandler(handler, {
        enableDeduplication: true
      });

      // Mock getActiveFile for recent changes
      mockClient.getActiveFile = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { path: '/active.md', content: 'Active file content' };
      });

      const promises = [
        cachedHandler.handleRequest('vault://recent', mockServer),
        cachedHandler.handleRequest('vault://recent', mockServer),
        cachedHandler.handleRequest('vault://recent', mockServer),
        cachedHandler.handleRequest('vault://recent', mockServer)
      ];

      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });

      // Should only call API once
      expect(mockClient.getRecentChanges).toHaveBeenCalledTimes(1);

      // Check stats
      const stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication?.hits).toBe(3); // 3 hits
      expect(stats.deduplication?.misses).toBe(1); // 1 miss
    });
  });

  describe('SearchHandler with paginated deduplication', () => {
    it('should deduplicate concurrent requests for the same search page', async () => {
      const handler = new SearchHandler();
      const cachedHandler = new CachedResourceHandler(handler, {
        enableDeduplication: true,
        paginationOptimization: true
      });

      // Mock search with pagination support
      mockClient.search = vi.fn().mockImplementation(async (query, contextLength, limit, offset) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const startIdx = offset || 0;
        const pageSize = limit || 10;
        return {
          results: Array.from({ length: pageSize }, (_, i) => ({
            path: `result${startIdx + i}.md`,
            score: 1.0,
            matches: [{ match: query, context: `Context ${startIdx + i}` }]
          })),
          totalResults: 50,
          hasMore: startIdx + pageSize < 50
        };
      });

      // Multiple requests for the same page
      const promises = [
        cachedHandler.handleRequest('vault://search/test?limit=10&offset=0', mockServer),
        cachedHandler.handleRequest('vault://search/test?limit=10&offset=0', mockServer),
        cachedHandler.handleRequest('vault://search/test?limit=10&offset=0', mockServer)
      ];

      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      // All should be identical
      expect(results[0]).toBeDefined();
      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);

      // Only one API call
      expect(mockClient.search).toHaveBeenCalledTimes(1);
      expect(mockClient.search).toHaveBeenCalledWith('test', 100, 10, 0);
    });

    it('should not deduplicate different pages of the same search', async () => {
      const handler = new SearchHandler();
      const cachedHandler = new CachedResourceHandler(handler, {
        enableDeduplication: true,
        paginationOptimization: true
      });

      // Mock search
      mockClient.search = vi.fn().mockImplementation(async (query, contextLength, limit, offset) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          results: [{ path: `page-${offset}.md`, score: 1.0, matches: [] }],
          totalResults: 30
        };
      });

      // Different pages
      const promises = [
        cachedHandler.handleRequest('vault://search/test?limit=10&offset=0', mockServer),
        cachedHandler.handleRequest('vault://search/test?limit=10&offset=10', mockServer),
        cachedHandler.handleRequest('vault://search/test?limit=10&offset=20', mockServer)
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(promises);

      // Should call API for each different page
      expect(mockClient.search).toHaveBeenCalledTimes(3);
      expect(mockClient.search).toHaveBeenCalledWith('test', 100, 10, 0);
      expect(mockClient.search).toHaveBeenCalledWith('test', 100, 10, 10);
      expect(mockClient.search).toHaveBeenCalledWith('test', 100, 10, 20);
    });
  });

  describe('error handling with deduplication', () => {
    it('should propagate errors to all deduplicated requests', async () => {
      const handler = new VaultStructureHandler();
      const cachedHandler = new CachedResourceHandler(handler, {
        enableDeduplication: true
      });

      // Make the API throw an error
      mockClient.listFilesInVault.mockRejectedValue(new Error('API Error'));

      const promises = [
        cachedHandler.handleRequest('vault://structure', mockServer).catch(e => e),
        cachedHandler.handleRequest('vault://structure', mockServer).catch(e => e),
        cachedHandler.handleRequest('vault://structure', mockServer).catch(e => e)
      ];

      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      // All should receive the same error
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('API Error');
      });

      // API should only be called once
      expect(mockClient.listFilesInVault).toHaveBeenCalledTimes(1);
    });
  });

  describe('different handlers should not interfere', () => {
    it('should maintain separate deduplication for different resource types', async () => {
      const structureHandler = new CachedResourceHandler(new VaultStructureHandler(), {
        enableDeduplication: true
      });
      const recentHandler = new CachedResourceHandler(new RecentChangesHandler(), {
        enableDeduplication: true
      });

      // Mock getActiveFile for recent changes  
      mockClient.getActiveFile = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { path: '/active.md', content: 'Active file content' };
      });

      // Start requests for both handlers concurrently
      const promises = [
        structureHandler.handleRequest('vault://structure', mockServer),
        structureHandler.handleRequest('vault://structure', mockServer),
        recentHandler.handleRequest('vault://recent', mockServer),
        recentHandler.handleRequest('vault://recent', mockServer)
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(promises);

      // Each API should be called once
      expect(mockClient.listFilesInVault).toHaveBeenCalledTimes(1);
      expect(mockClient.getRecentChanges).toHaveBeenCalledTimes(1);

      // Check stats for each handler
      const structureStats = structureHandler.getPaginatedCacheStats();
      expect(structureStats.deduplication?.hits).toBe(1);
      expect(structureStats.deduplication?.misses).toBe(1);

      const recentStats = recentHandler.getPaginatedCacheStats();
      expect(recentStats.deduplication?.hits).toBe(1);
      expect(recentStats.deduplication?.misses).toBe(1);
    });
  });
});