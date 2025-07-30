import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachedResourceHandler, ResourceCacheConfig } from '../../src/resources/CachedResourceHandler.js';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';

// Mock handler that extends BaseResourceHandler for testing
class MockHandler extends BaseResourceHandler {
  public callCount = 0;
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    this.callCount++;
    // Simulate expensive operation
    await new Promise(resolve => setTimeout(resolve, 10));
    return { uri, data: `result-${this.callCount}` };
  }
}

describe('CachedResourceHandler', () => {
  let mockHandler: MockHandler;
  let cachedHandler: CachedResourceHandler;

  beforeEach(() => {
    mockHandler = new MockHandler();
    cachedHandler = new CachedResourceHandler(mockHandler);
  });

  describe('Cache Configuration', () => {
    it('should use default cache configuration', () => {
      const handler = new CachedResourceHandler(mockHandler);
      expect(handler).toBeDefined();
    });

    it('should accept custom cache configuration', () => {
      const config: ResourceCacheConfig = {
        maxSize: 50,
        defaultTtl: 60000,
        resourceTtls: {
          'vault://tags': 120000,
          'vault://stats': 300000
        }
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      expect(handler).toBeDefined();
    });
  });

  describe('Cache Behavior', () => {
    it('should cache successful responses', async () => {
      const uri = 'vault://tags';
      
      // First call should invoke underlying handler
      const result1 = await cachedHandler.execute(uri);
      expect(mockHandler.callCount).toBe(1);
      expect(result1.contents[0].text).toContain('result-1');

      // Second call should use cache
      const result2 = await cachedHandler.execute(uri);
      expect(mockHandler.callCount).toBe(1); // No additional call
      expect(result2.contents[0].text).toContain('result-1'); // Same result
    });

    it('should handle different URIs separately', async () => {
      const uri1 = 'vault://tags';
      const uri2 = 'vault://stats';
      
      await cachedHandler.execute(uri1);
      await cachedHandler.execute(uri2);
      
      expect(mockHandler.callCount).toBe(2);
    });

    it('should respect TTL expiration', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 100,
        defaultTtl: 50, // 50ms
        resourceTtls: {}
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      const uri = 'vault://tags';
      
      // First call
      await handler.execute(uri);
      expect(mockHandler.callCount).toBe(1);
      
      // Immediate second call should use cache
      await handler.execute(uri);
      expect(mockHandler.callCount).toBe(1);
      
      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Third call should invoke handler again
      await handler.execute(uri);
      expect(mockHandler.callCount).toBe(2);
    });

    it('should use resource-specific TTL when configured', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 100,
        defaultTtl: 300000,
        resourceTtls: {
          'vault://recent': 30000  // Shorter TTL for recent
        }
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      
      // Test that configuration is accepted (actual TTL behavior tested above)
      await handler.execute('vault://recent');
      await handler.execute('vault://tags');
      
      expect(mockHandler.callCount).toBe(2);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate unique cache keys for different URIs', async () => {
      const uris = [
        'vault://tags',
        'vault://stats',
        'vault://note/test.md',
        'vault://folder/documents'
      ];
      
      for (const uri of uris) {
        await cachedHandler.execute(uri);
      }
      
      expect(mockHandler.callCount).toBe(uris.length);
    });

    it('should handle parameterized resources correctly', async () => {
      const uri1 = 'vault://note/file1.md';
      const uri2 = 'vault://note/file2.md';
      
      await cachedHandler.execute(uri1);
      await cachedHandler.execute(uri2);
      await cachedHandler.execute(uri1); // Should use cache
      
      expect(mockHandler.callCount).toBe(2); // Two unique resources
    });
  });

  describe('Error Handling', () => {
    it('should not cache error responses', async () => {
      const errorHandler = new (class extends BaseResourceHandler {
        async handleRequest(uri: string, server?: any): Promise<any> {
          throw new Error('Test error');
        }
      })();
      
      const cachedErrorHandler = new CachedResourceHandler(errorHandler);
      const uri = 'vault://failing';
      
      // First call should fail
      await expect(cachedErrorHandler.execute(uri)).rejects.toThrow('Test error');
      
      // Second call should also fail (not cached)
      await expect(cachedErrorHandler.execute(uri)).rejects.toThrow('Test error');
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', async () => {
      const uri = 'vault://tags';
      
      // Generate some cache hits and misses
      await cachedHandler.execute(uri); // Miss
      await cachedHandler.execute(uri); // Hit
      await cachedHandler.execute(uri); // Hit
      
      const stats = cachedHandler.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2); // With deduplication, double-check causes 2 misses
      expect(stats.hitRate).toBeCloseTo(0.5, 2); // 2 hits out of 4 total
      expect(stats.size).toBe(1);
    });

    it('should allow resetting cache statistics', async () => {
      const uri = 'vault://tags';
      
      await cachedHandler.execute(uri);
      await cachedHandler.execute(uri);
      
      cachedHandler.resetCacheStats();
      const stats = cachedHandler.getCacheStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache when requested', async () => {
      const uri = 'vault://tags';
      
      await cachedHandler.execute(uri);
      expect(mockHandler.callCount).toBe(1);
      
      cachedHandler.clearCache();
      
      await cachedHandler.execute(uri);
      expect(mockHandler.callCount).toBe(2); // Cache was cleared
    });

    it('should respect maximum cache size', async () => {
      const config: ResourceCacheConfig = {
        maxSize: 2,
        defaultTtl: 300000,
        resourceTtls: {}
      };
      
      const handler = new CachedResourceHandler(mockHandler, config);
      
      // Fill cache to capacity
      await handler.execute('vault://uri1');
      await handler.execute('vault://uri2');
      
      // Adding third item should evict first
      await handler.execute('vault://uri3');
      
      // First URI should now require fresh call
      await handler.execute('vault://uri1');
      
      expect(mockHandler.callCount).toBe(4);
    });
  });
});