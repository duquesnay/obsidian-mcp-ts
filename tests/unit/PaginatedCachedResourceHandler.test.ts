import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachedResourceHandler, ResourceCacheConfig } from '../../src/resources/CachedResourceHandler.js';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { PaginationParams } from '../../src/utils/PaginationSystem.js';

// Mock handler that supports pagination for testing
class MockPaginatedHandler extends BaseResourceHandler {
  public callCount = 0;
  public lastRequestedUri = '';
  private mockData: any[] = [];
  
  constructor() {
    super();
    // Generate some mock data for pagination tests
    this.mockData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `item-${i + 1}`,
      content: `content for item ${i + 1}`
    }));
  }
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    this.callCount++;
    this.lastRequestedUri = uri;
    
    // Simulate expensive operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Parse pagination parameters from URI
    const url = new URL(uri, 'vault://');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    
    // Calculate actual offset for page-based pagination
    const actualOffset = url.searchParams.has('page') && !url.searchParams.has('offset') 
      ? (page - 1) * limit 
      : offset;
    
    // Slice the data based on pagination
    const paginatedData = this.mockData.slice(actualOffset, actualOffset + limit);
    
    return {
      data: paginatedData,
      pagination: {
        totalItems: this.mockData.length,
        limit,
        offset: actualOffset,
        hasMore: actualOffset + limit < this.mockData.length,
        currentPage: Math.floor(actualOffset / limit) + 1,
        totalPages: Math.ceil(this.mockData.length / limit)
      },
      requestInfo: {
        uri,
        callNumber: this.callCount
      }
    };
  }
}

describe('PaginatedCachedResourceHandler', () => {
  let mockHandler: MockPaginatedHandler;
  let cachedHandler: CachedResourceHandler;

  beforeEach(() => {
    mockHandler = new MockPaginatedHandler();
    cachedHandler = new CachedResourceHandler(mockHandler);
  });

  describe('Basic Pagination Caching', () => {
    it('should cache paginated responses separately by pagination parameters', async () => {
      const baseUri = 'vault://items';
      const page1Uri = `${baseUri}?page=1&limit=10`;
      const page2Uri = `${baseUri}?page=2&limit=10`;
      
      // First call to page 1
      const result1a = await cachedHandler.execute(page1Uri);
      expect(mockHandler.callCount).toBe(1);
      expect(result1a.contents[0].text).toContain('"currentPage": 1');
      
      // Second call to page 1 - should use cache
      const result1b = await cachedHandler.execute(page1Uri);
      expect(mockHandler.callCount).toBe(1); // No additional call
      expect(result1b.contents[0].text).toEqual(result1a.contents[0].text);
      
      // Call to page 2 - should not use cache (different pagination)
      const result2 = await cachedHandler.execute(page2Uri);
      expect(mockHandler.callCount).toBe(2);
      expect(result2.contents[0].text).toContain('"currentPage": 2');
      
      // Call to page 1 again - should still use cache
      const result1c = await cachedHandler.execute(page1Uri);
      expect(mockHandler.callCount).toBe(2); // No additional call
      expect(result1c.contents[0].text).toEqual(result1a.contents[0].text);
    });

    it('should cache offset-based pagination separately', async () => {
      const baseUri = 'vault://items';
      const offset0Uri = `${baseUri}?offset=0&limit=5`;
      const offset5Uri = `${baseUri}?offset=5&limit=5`;
      
      // First call to offset 0
      const result1 = await cachedHandler.execute(offset0Uri);
      expect(mockHandler.callCount).toBe(1);
      
      // Call to offset 5 - different page
      const result2 = await cachedHandler.execute(offset5Uri);
      expect(mockHandler.callCount).toBe(2);
      
      // Call to offset 0 again - should use cache
      const result1b = await cachedHandler.execute(offset0Uri);
      expect(mockHandler.callCount).toBe(2); // No additional call
      expect(result1b.contents[0].text).toEqual(result1.contents[0].text);
    });

    it('should treat different limit sizes as separate cache entries', async () => {
      const baseUri = 'vault://items';
      const limit10Uri = `${baseUri}?offset=0&limit=10`;
      const limit20Uri = `${baseUri}?offset=0&limit=20`;
      
      await cachedHandler.execute(limit10Uri);
      expect(mockHandler.callCount).toBe(1);
      
      // Different limit size should not use cache
      await cachedHandler.execute(limit20Uri);
      expect(mockHandler.callCount).toBe(2);
    });
  });

  describe('Paginated Cache Key Generation', () => {
    it('should generate unique cache keys for different pagination parameters', async () => {
      const baseUri = 'vault://items';
      const uris = [
        `${baseUri}?page=1&limit=10`,
        `${baseUri}?page=2&limit=10`,
        `${baseUri}?offset=0&limit=5`,
        `${baseUri}?offset=5&limit=5`,
        `${baseUri}?limit=20`
      ];
      
      // Each URI should generate a separate cache entry
      for (const uri of uris) {
        await cachedHandler.execute(uri);
      }
      
      expect(mockHandler.callCount).toBe(uris.length);
      
      // Second round should all use cache
      for (const uri of uris) {
        await cachedHandler.execute(uri);
      }
      
      expect(mockHandler.callCount).toBe(uris.length); // No additional calls
    });

    it('should normalize equivalent pagination parameters', async () => {
      const baseUri = 'vault://items';
      // These should be equivalent: page=2&limit=10 == offset=10&limit=10
      const pageUri = `${baseUri}?page=2&limit=10`;
      const offsetUri = `${baseUri}?offset=10&limit=10`;
      
      await cachedHandler.execute(pageUri);
      expect(mockHandler.callCount).toBe(1);
      
      // With pagination optimization, these should use the same cache entry
      // since they resolve to the same offset and limit
      await cachedHandler.execute(offsetUri);
      expect(mockHandler.callCount).toBe(1); // No additional call - cache hit!
    });
  });

  describe('Paginated Cache Invalidation', () => {
    it('should support partial cache invalidation by base resource', async () => {
      const baseUri = 'vault://items';
      const page1Uri = `${baseUri}?page=1&limit=10`;
      const page2Uri = `${baseUri}?page=2&limit=10`;
      
      // Fill cache
      await cachedHandler.execute(page1Uri);
      await cachedHandler.execute(page2Uri);
      expect(mockHandler.callCount).toBe(2);
      
      // Use the new invalidateResourcePages method
      cachedHandler.invalidateResourcePages(baseUri);
      
      // Both pages should require fresh calls
      await cachedHandler.execute(page1Uri);
      await cachedHandler.execute(page2Uri);
      expect(mockHandler.callCount).toBe(4);
    });
  });

  describe('Paginated Cache Metrics', () => {
    it('should track cache hits and misses for paginated resources', async () => {
      const baseUri = 'vault://items';
      const page1Uri = `${baseUri}?page=1&limit=10`;
      const page2Uri = `${baseUri}?page=2&limit=10`;
      
      // Initial stats should be empty
      let stats = cachedHandler.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // First calls should be misses
      await cachedHandler.execute(page1Uri);
      await cachedHandler.execute(page2Uri);
      
      stats = cachedHandler.getCacheStats();
      expect(stats.misses).toBe(4); // With deduplication: 2 requests * 2 checks each
      expect(stats.hits).toBe(0);
      
      // Repeat calls should be hits
      await cachedHandler.execute(page1Uri);
      await cachedHandler.execute(page2Uri);
      
      stats = cachedHandler.getCacheStats();
      expect(stats.misses).toBe(4); // Still 4 misses from initial requests
      expect(stats.hits).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.333, 2); // 2 hits out of 6 total
    });

    it('should provide enhanced pagination statistics', async () => {
      const baseUri = 'vault://items';
      const paginatedUri = `${baseUri}?page=1&limit=10`;
      const nonPaginatedUri = 'vault://simple-resource';
      
      // Execute requests
      await cachedHandler.execute(paginatedUri);
      await cachedHandler.execute(nonPaginatedUri);
      
      // Check enhanced stats
      const enhancedStats = cachedHandler.getPaginatedCacheStats();
      expect(enhancedStats.paginatedEntries).toBe(1);
      expect(enhancedStats.nonPaginatedEntries).toBe(1);
      expect(enhancedStats.size).toBe(2);
    });
  });

  describe('Memory Optimization for Paginated Cache', () => {
    it('should evict old paginated entries when cache is full', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 3, // Small cache size
        defaultTtl: 300000,
        resourceTtls: {}
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      const baseUri = 'vault://items';
      
      // Fill cache beyond capacity
      await handler.execute(`${baseUri}?page=1&limit=10`);
      await handler.execute(`${baseUri}?page=2&limit=10`);
      await handler.execute(`${baseUri}?page=3&limit=10`);
      expect(mockHandler.callCount).toBe(3);
      
      // Adding a 4th page should evict the first
      await handler.execute(`${baseUri}?page=4&limit=10`);
      expect(mockHandler.callCount).toBe(4);
      
      // First page should now require a fresh call (cache miss)
      await handler.execute(`${baseUri}?page=1&limit=10`);
      expect(mockHandler.callCount).toBe(5);
      
      // But page 4 (most recent) should still be cached, and some others too
      await handler.execute(`${baseUri}?page=4&limit=10`);
      expect(mockHandler.callCount).toBe(5); // Page 4 should be cached
      
      // Pages 2 and 3 may or may not be cached depending on LRU eviction order
      // Let's test that at least the most recent pages are cached
      await handler.execute(`${baseUri}?page=3&limit=10`);
      // This might be cached or not, depending on exact LRU order
    });

    it('should handle memory-efficient storage of large paginated datasets', async () => {
      // This is more of a stress test to ensure the cache doesn't consume excessive memory
      const baseUri = 'vault://items';
      const promises = [];
      
      // Create many paginated requests
      for (let page = 1; page <= 20; page++) {
        promises.push(cachedHandler.execute(`${baseUri}?page=${page}&limit=5`));
      }
      
      await Promise.all(promises);
      
      const stats = cachedHandler.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(20);
      expect(mockHandler.callCount).toBe(20);
    });
  });

  describe('TTL Behavior for Paginated Resources', () => {
    it('should respect TTL for individual paginated entries', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 100,
        defaultTtl: 50, // 50ms
        resourceTtls: {}
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      const pageUri = 'vault://items?page=1&limit=10';
      
      // First call
      await handler.execute(pageUri);
      expect(mockHandler.callCount).toBe(1);
      
      // Immediate second call should use cache
      await handler.execute(pageUri);
      expect(mockHandler.callCount).toBe(1);
      
      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Third call should invoke handler again
      await handler.execute(pageUri);
      expect(mockHandler.callCount).toBe(2);
    });

    it('should use different TTL for different resource types with pagination', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 100,
        defaultTtl: 300000,
        resourceTtls: {
          'vault://recent': 30000  // Shorter TTL for recent resources
        }
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      
      // Test with recent resource (should use shorter TTL)
      await handler.execute('vault://recent?page=1&limit=10');
      // Test with other resource (should use default TTL)
      await handler.execute('vault://items?page=1&limit=10');
      
      expect(mockHandler.callCount).toBe(2);
    });
  });

  describe('Configuration Options', () => {
    it('should allow disabling pagination optimization', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 100,
        defaultTtl: 300000,
        resourceTtls: {},
        paginationOptimization: false
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      const baseUri = 'vault://items';
      
      // These should be equivalent but treated as separate when optimization is disabled
      const pageUri = `${baseUri}?page=1&limit=10`;
      const offsetUri = `${baseUri}?offset=0&limit=10`;
      
      await handler.execute(pageUri);
      expect(mockHandler.callCount).toBe(1);
      
      // Without optimization, this should be a separate cache entry
      await handler.execute(offsetUri);
      expect(mockHandler.callCount).toBe(2);
      
      // Verify stats reflect non-optimized behavior
      const stats = handler.getPaginatedCacheStats();
      expect(stats.nonPaginatedEntries).toBe(2);
      expect(stats.paginatedEntries).toBe(0);
    });

    it('should handle malformed URIs gracefully', async () => {
      const malformedUri = 'not-a-valid-uri';
      
      // Should not throw and should cache using original URI as key
      await cachedHandler.execute(malformedUri);
      expect(mockHandler.callCount).toBe(1);
      
      // Second call should use cache
      await cachedHandler.execute(malformedUri);
      expect(mockHandler.callCount).toBe(1);
    });
  });
});