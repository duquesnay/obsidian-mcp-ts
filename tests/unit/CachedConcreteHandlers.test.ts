import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachedResourceHandler } from '../../src/resources/CachedResourceHandler.js';
import { TagsHandler, StatsHandler, RecentHandler, NoteHandler, FolderHandler } from '../../src/resources/concreteHandlers.js';
import { VaultStructureHandler } from '../../src/resources/VaultStructureHandler.js';

describe('Cached Concrete Handlers', () => {
  describe('Cached TagsHandler', () => {
    it('should cache tags data across multiple calls', async () => {
      const mockGetAllTags = vi.fn()
        .mockResolvedValueOnce([{ name: '#project', count: 10 }])
        .mockResolvedValueOnce([{ name: '#updated', count: 20 }]); // Different result if called again
      
      const server = {
        obsidianClient: { getAllTags: mockGetAllTags }
      };
      
      const baseHandler = new TagsHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // First call should hit the API
      const result1 = await cachedHandler.execute('vault://tags', server);
      expect(mockGetAllTags).toHaveBeenCalledTimes(1);
      
      const data1 = JSON.parse(result1.contents[0].text);
      expect(data1.mode).toBe('summary');
      expect(data1.topTags[0].name).toBe('#project');
      
      // Second call should use cache (same result)
      const result2 = await cachedHandler.execute('vault://tags', server);
      expect(mockGetAllTags).toHaveBeenCalledTimes(1); // Still only one call
      
      const data2 = JSON.parse(result2.contents[0].text);
      expect(data2.topTags[0].name).toBe('#project'); // Same cached result
      
      // Verify cache statistics
      // Note: With deduplication enabled, there's a double-check for cache
      // which results in 2 misses for the first request (main check + dedupe check)
      const stats = cachedHandler.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2); // 2 misses due to deduplication double-check
      expect(stats.hitRate).toBe(1/3); // 1 hit out of 3 total requests
    });

    it('should use STABLE_TTL for tags (5 minutes)', async () => {
      const mockGetAllTags = vi.fn().mockResolvedValue([]);
      const server = { obsidianClient: { getAllTags: mockGetAllTags } };
      
      const baseHandler = new TagsHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      await cachedHandler.execute('vault://tags', server);
      
      // Immediate second call should be cached
      await cachedHandler.execute('vault://tags', server);
      expect(mockGetAllTags).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cached StatsHandler', () => {
    it('should cache stats data across multiple calls', async () => {
      const mockListFilesInVault = vi.fn()
        .mockResolvedValueOnce(['file1.md', 'file2.md'])
        .mockResolvedValueOnce(['file1.md', 'file2.md', 'file3.md']); // Different result
      
      const server = {
        obsidianClient: { listFilesInVault: mockListFilesInVault }
      };
      
      const baseHandler = new StatsHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // First call
      const result1 = await cachedHandler.execute('vault://stats', server);
      const data1 = JSON.parse(result1.contents[0].text);
      expect(data1.fileCount).toBe(2);
      
      // Second call should use cache
      const result2 = await cachedHandler.execute('vault://stats', server);
      const data2 = JSON.parse(result2.contents[0].text);
      expect(data2.fileCount).toBe(2); // Same cached result
      
      expect(mockListFilesInVault).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cached RecentHandler', () => {
    it('should cache recent data with FAST_TTL (30 seconds)', async () => {
      const mockGetRecentChanges = vi.fn()
        .mockResolvedValue([{ path: 'recent1.md', mtime: 1640995200000 }]);
      
      const server = {
        obsidianClient: { getRecentChanges: mockGetRecentChanges }
      };
      
      const baseHandler = new RecentHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // First call
      await cachedHandler.execute('vault://recent', server);
      expect(mockGetRecentChanges).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await cachedHandler.execute('vault://recent', server);
      expect(mockGetRecentChanges).toHaveBeenCalledTimes(1);
    });

    it('should respect shorter TTL for recent data', async () => {
      const mockGetRecentChanges = vi.fn().mockResolvedValue([]);
      const server = { obsidianClient: { getRecentChanges: mockGetRecentChanges } };
      
      // Use short TTL for testing
      const config = {
        maxSize: 100,
        defaultTtl: 300000,
        resourceTtls: { 'vault://recent': 50 } // 50ms
      };
      
      const baseHandler = new RecentHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler, config);
      
      // First call
      await cachedHandler.execute('vault://recent', server);
      expect(mockGetRecentChanges).toHaveBeenCalledTimes(1);
      
      // Immediate second call should use cache
      await cachedHandler.execute('vault://recent', server);
      expect(mockGetRecentChanges).toHaveBeenCalledTimes(1);
      
      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Third call should hit API again
      await cachedHandler.execute('vault://recent', server);
      expect(mockGetRecentChanges).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cached NoteHandler', () => {
    it('should cache individual notes by path', async () => {
      const mockGetFileContents = vi.fn()
        .mockResolvedValueOnce('# Note 1 Content')
        .mockResolvedValueOnce('# Note 2 Content')
        .mockResolvedValueOnce('# Updated Note 1'); // Different content if called again
      
      const server = {
        obsidianClient: { getFileContents: mockGetFileContents }
      };
      
      const baseHandler = new NoteHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // Cache different notes (use full mode to get raw text)
      const result1 = await cachedHandler.execute('vault://note/note1.md?mode=full', server);
      const result2 = await cachedHandler.execute('vault://note/note2.md?mode=full', server);
      
      expect(mockGetFileContents).toHaveBeenCalledTimes(2);
      expect(result1.contents[0].text).toBe('# Note 1 Content');
      expect(result2.contents[0].text).toBe('# Note 2 Content');
      
      // Second call to first note should use cache
      const result3 = await cachedHandler.execute('vault://note/note1.md?mode=full', server);
      expect(mockGetFileContents).toHaveBeenCalledTimes(2); // No additional call
      expect(result3.contents[0].text).toBe('# Note 1 Content'); // Cached result
    });

    it('should handle note errors without caching', async () => {
      const mockGetFileContents = vi.fn()
        .mockRejectedValue({ response: { status: 404 } });
      
      const server = {
        obsidianClient: { getFileContents: mockGetFileContents }
      };
      
      const baseHandler = new NoteHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // First call should fail
      await expect(cachedHandler.execute('vault://note/missing.md', server))
        .rejects.toThrow('Note not found: missing.md');
      
      // Second call should also fail (error not cached)
      await expect(cachedHandler.execute('vault://note/missing.md', server))
        .rejects.toThrow('Note not found: missing.md');
      
      expect(mockGetFileContents).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cached FolderHandler', () => {
    it('should cache folder listings by path', async () => {
      const mockListFilesInDir = vi.fn()
        .mockResolvedValueOnce(['file1.md', 'file2.md'])
        .mockResolvedValueOnce(['other.md'])
        .mockResolvedValueOnce(['updated.md']); // Different if called again
      
      const server = {
        obsidianClient: { listFilesInDir: mockListFilesInDir }
      };
      
      const baseHandler = new FolderHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // Cache different folders
      const result1 = await cachedHandler.execute('vault://folder/projects', server);
      const result2 = await cachedHandler.execute('vault://folder/archive', server);
      
      expect(mockListFilesInDir).toHaveBeenCalledWith('projects');
      expect(mockListFilesInDir).toHaveBeenCalledWith('archive');
      expect(mockListFilesInDir).toHaveBeenCalledTimes(2);
      
      const data1 = JSON.parse(result1.contents[0].text);
      const data2 = JSON.parse(result2.contents[0].text);
      // New folder handler returns summary mode by default
      expect(data1.mode).toBe('summary');
      expect(data1.fileCount).toBe(2);
      expect(data2.mode).toBe('summary');
      expect(data2.fileCount).toBe(1);
      
      // Second call to first folder should use cache
      const result3 = await cachedHandler.execute('vault://folder/projects', server);
      expect(mockListFilesInDir).toHaveBeenCalledTimes(2); // No additional call
      
      const data3 = JSON.parse(result3.contents[0].text);
      expect(data3.fileCount).toBe(2); // Cached result, same as data1
    });
  });

  describe('Cached VaultStructureHandler', () => {
    it('should cache vault structure data', async () => {
      const mockListFilesInVault = vi.fn()
        .mockResolvedValueOnce(['file1.md', 'Projects/project1.md'])
        .mockResolvedValueOnce(['file1.md', 'Projects/project1.md', 'new.md']); // Updated if called again
      
      const server = {
        obsidianClient: { listFilesInVault: mockListFilesInVault }
      };
      
      const baseHandler = new VaultStructureHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // First call
      const result1 = await cachedHandler.execute('vault://structure', server);
      const data1 = JSON.parse(result1.contents[0].text);
      expect(data1.totalFiles).toBe(2);
      
      // Second call should use cache
      const result2 = await cachedHandler.execute('vault://structure', server);
      const data2 = JSON.parse(result2.contents[0].text);
      expect(data2.totalFiles).toBe(2); // Same cached result
      
      expect(mockListFilesInVault).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Performance Analysis', () => {
    it('should demonstrate performance improvement with cache', async () => {
      let callCount = 0;
      const mockGetAllTags = vi.fn().mockImplementation(async () => {
        callCount++;
        // Simulate slow API call
        await new Promise(resolve => setTimeout(resolve, 50));
        return [{ name: '#test', count: callCount }];
      });
      
      const server = { obsidianClient: { getAllTags: mockGetAllTags } };
      const baseHandler = new TagsHandler();
      const cachedHandler = new CachedResourceHandler(baseHandler);
      
      // Measure time for first call (cache miss)
      const start1 = Date.now();
      await cachedHandler.execute('vault://tags', server);
      const time1 = Date.now() - start1;
      
      // Measure time for second call (cache hit)
      const start2 = Date.now();
      await cachedHandler.execute('vault://tags', server);
      const time2 = Date.now() - start2;
      
      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1);
      expect(time2).toBeLessThan(10); // Should be nearly instantaneous
      expect(mockGetAllTags).toHaveBeenCalledTimes(1);
      
      const stats = cachedHandler.getCacheStats();
      // With deduplication: 2 misses on first call, 1 hit on second = 1/3 hit rate
      expect(stats.hitRate).toBe(1/3);
    });
  });
});