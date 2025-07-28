import { describe, it, expect, vi } from 'vitest';
import { CachedResourceHandler, ResourceCacheConfig } from '../../../src/resources/CachedResourceHandler.js';
import { TagsHandler, StatsHandler, RecentHandler, NoteHandler } from '../../../src/resources/concreteHandlers.js';

describe('Cache Performance Demo', () => {
  it('should demonstrate significant performance improvement with caching', async () => {
    // Create handlers with slow mock APIs
    let tagsCallCount = 0;
    let statsCallCount = 0;
    let recentCallCount = 0;
    
    const mockServer = {
      obsidianClient: {
        getAllTags: vi.fn().mockImplementation(async () => {
          tagsCallCount++;
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate 100ms API call
          return [{ name: '#project', count: 10 }, { name: '#meeting', count: 5 }];
        }),
        
        listFilesInVault: vi.fn().mockImplementation(async () => {
          statsCallCount++;
          await new Promise(resolve => setTimeout(resolve, 150)); // Simulate 150ms API call
          return ['file1.md', 'file2.md', 'Projects/project1.md'];
        }),
        
        getRecentChanges: vi.fn().mockImplementation(async () => {
          recentCallCount++;
          await new Promise(resolve => setTimeout(resolve, 75)); // Simulate 75ms API call
          return [{ path: 'recent1.md', mtime: Date.now() }];
        })
      }
    };

    // Create cached handlers with different TTL configurations
    const config: ResourceCacheConfig = {
      maxSize: 100,
      defaultTtl: 300000, // 5 minutes
      resourceTtls: {
        'vault://recent': 30000 // 30 seconds for recent
      }
    };

    const cachedTagsHandler = new CachedResourceHandler(new TagsHandler(), config);
    const cachedStatsHandler = new CachedResourceHandler(new StatsHandler(), config);
    const cachedRecentHandler = new CachedResourceHandler(new RecentHandler(), config);

    // Measure performance for multiple resource calls
    const start = Date.now();
    
    // First calls - should hit API (cache misses)
    await cachedTagsHandler.execute('vault://tags', mockServer);
    await cachedStatsHandler.execute('vault://stats', mockServer);
    await cachedRecentHandler.execute('vault://recent', mockServer);
    
    const firstCallTime = Date.now() - start;
    
    // Second calls - should use cache (cache hits)
    const cacheStart = Date.now();
    await cachedTagsHandler.execute('vault://tags', mockServer);
    await cachedStatsHandler.execute('vault://stats', mockServer);
    await cachedRecentHandler.execute('vault://recent', mockServer);
    
    const cacheCallTime = Date.now() - cacheStart;
    
    // Verify API was called only once for each resource
    expect(tagsCallCount).toBe(1);
    expect(statsCallCount).toBe(1);
    expect(recentCallCount).toBe(1);
    
    // Cache should be dramatically faster (at least 10x faster)
    expect(cacheCallTime).toBeLessThan(firstCallTime / 10);
    expect(cacheCallTime).toBeLessThan(50); // Should be nearly instantaneous
    
    // Verify cache statistics
    const tagsStats = cachedTagsHandler.getCacheStats();
    const statsStats = cachedStatsHandler.getCacheStats();
    const recentStats = cachedRecentHandler.getCacheStats();
    
    expect(tagsStats.hits).toBe(1);
    expect(tagsStats.misses).toBe(1);
    expect(tagsStats.hitRate).toBe(0.5);
    
    expect(statsStats.hits).toBe(1);
    expect(statsStats.misses).toBe(1);
    expect(statsStats.hitRate).toBe(0.5);
    
    expect(recentStats.hits).toBe(1);
    expect(recentStats.misses).toBe(1);
    expect(recentStats.hitRate).toBe(0.5);
    
    console.log(`Performance improvement: ${Math.round(firstCallTime / cacheCallTime)}x faster with cache`);
    console.log(`First calls: ${firstCallTime}ms, Cached calls: ${cacheCallTime}ms`);
  });

  it('should demonstrate TTL expiration behavior', async () => {
    const mockGetAllTags = vi.fn()
      .mockResolvedValueOnce([{ name: '#old', count: 1 }])
      .mockResolvedValueOnce([{ name: '#new', count: 2 }]);
    
    const mockServer = {
      obsidianClient: { getAllTags: mockGetAllTags }
    };

    // Short TTL for testing
    const config: ResourceCacheConfig = {
      maxSize: 100,
      defaultTtl: 50, // 50ms
      resourceTtls: {}
    };

    const cachedHandler = new CachedResourceHandler(new TagsHandler(), config);
    
    // First call
    const result1 = await cachedHandler.execute('vault://tags', mockServer);
    const data1 = JSON.parse(result1.contents[0].text);
    expect(data1.topTags[0].name).toBe('#old');
    
    // Immediate second call should use cache
    const result2 = await cachedHandler.execute('vault://tags', mockServer);
    const data2 = JSON.parse(result2.contents[0].text);
    expect(data2.topTags[0].name).toBe('#old'); // Same cached result
    expect(mockGetAllTags).toHaveBeenCalledTimes(1);
    
    // Wait for TTL expiration
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Third call should hit API again due to TTL expiration
    const result3 = await cachedHandler.execute('vault://tags', mockServer);
    const data3 = JSON.parse(result3.contents[0].text);
    expect(data3.topTags[0].name).toBe('#new'); // New result from API
    expect(mockGetAllTags).toHaveBeenCalledTimes(2);
    
    // Verify cache statistics reflect the behavior
    const stats = cachedHandler.getCacheStats();
    expect(stats.hits).toBe(1); // Only one cache hit
    expect(stats.misses).toBe(2); // Two cache misses (initial + after expiration)
    expect(stats.hitRate).toBeCloseTo(0.333, 2);
  });

  it('should handle mixed cache hits and misses for parameterized resources', async () => {
    const mockGetFileContents = vi.fn()
      .mockResolvedValueOnce('# Note 1 Content')
      .mockResolvedValueOnce('# Note 2 Content')
      .mockResolvedValueOnce('# Note 3 Content');
    
    const mockServer = {
      obsidianClient: { getFileContents: mockGetFileContents }
    };

    const config: ResourceCacheConfig = {
      maxSize: 100,
      defaultTtl: 300000,
      resourceTtls: {}
    };

    const cachedHandler = new CachedResourceHandler(new NoteHandler(), config);
    
    // Request different notes (should all be cache misses)
    await cachedHandler.execute('vault://note/note1.md', mockServer);
    await cachedHandler.execute('vault://note/note2.md', mockServer);
    await cachedHandler.execute('vault://note/note3.md', mockServer);
    
    // Repeat requests (should all be cache hits)
    await cachedHandler.execute('vault://note/note1.md', mockServer);
    await cachedHandler.execute('vault://note/note2.md', mockServer);
    await cachedHandler.execute('vault://note/note3.md', mockServer);
    
    // Verify API was called only once per unique note
    expect(mockGetFileContents).toHaveBeenCalledTimes(3);
    expect(mockGetFileContents).toHaveBeenCalledWith('note1.md');
    expect(mockGetFileContents).toHaveBeenCalledWith('note2.md');
    expect(mockGetFileContents).toHaveBeenCalledWith('note3.md');
    
    // Verify cache statistics
    const stats = cachedHandler.getCacheStats();
    expect(stats.hits).toBe(3); // Three cache hits
    expect(stats.misses).toBe(3); // Three cache misses
    expect(stats.hitRate).toBe(0.5);
    expect(stats.size).toBe(3); // Three items cached
  });
});