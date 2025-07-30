import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CachedResourceHandler } from '../../../src/resources/CachedResourceHandler.js';
import { BaseResourceHandler } from '../../../src/resources/BaseResourceHandler.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

// Mock implementation of a resource handler
class TestResourceHandler extends BaseResourceHandler {
  public callCount = 0;
  public lastUri?: string;
  private delay: number;
  private response: any;

  constructor(delay = 100, response: any = { data: 'test' }) {
    super();
    this.delay = delay;
    this.response = response;
  }

  async handleRequest(uri: string): Promise<any> {
    this.callCount++;
    this.lastUri = uri;
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    return this.response;
  }
}

describe('CachedResourceHandler - Deduplication', () => {
  let testHandler: TestResourceHandler;
  let cachedHandler: CachedResourceHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('with deduplication enabled', () => {
    beforeEach(() => {
      testHandler = new TestResourceHandler(100, { data: 'test-response' });
      cachedHandler = new CachedResourceHandler(testHandler, {
        maxSize: 10,
        defaultTtl: 60000,
        enableDeduplication: true,
        deduplicationTtl: 5000
      });
    });

    it('should deduplicate concurrent requests for the same resource', async () => {
      // Start multiple concurrent requests
      const promises = [
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md')
      ];

      // Advance time to complete the request
      await vi.advanceTimersByTimeAsync(200);

      const results = await Promise.all(promises);

      // All results should be identical
      expect(results[0]).toEqual({ data: 'test-response' });
      expect(results[1]).toEqual({ data: 'test-response' });
      expect(results[2]).toEqual({ data: 'test-response' });

      // Handler should only be called once
      expect(testHandler.callCount).toBe(1);
    });

    it('should not deduplicate requests for different resources', async () => {
      // Start requests for different resources
      const promises = [
        cachedHandler.handleRequest('vault://note/file1.md'),
        cachedHandler.handleRequest('vault://note/file2.md'),
        cachedHandler.handleRequest('vault://note/file3.md')
      ];

      // Advance time to complete the requests
      await vi.advanceTimersByTimeAsync(200);

      await Promise.all(promises);

      // Handler should be called for each unique resource
      expect(testHandler.callCount).toBe(3);
    });

    it('should serve from cache after deduplication completes', async () => {
      // First batch of concurrent requests
      const firstBatch = [
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md')
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(firstBatch);

      expect(testHandler.callCount).toBe(1);

      // Second request should come from cache
      const cached = await cachedHandler.handleRequest('vault://note/test.md');
      expect(cached).toEqual({ data: 'test-response' });
      expect(testHandler.callCount).toBe(1); // Still only 1 call
    });

    it('should track deduplication statistics', async () => {
      // Start concurrent requests
      const promises = [
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/different.md')
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(promises);

      const stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication).toBeDefined();
      expect(stats.deduplication?.hits).toBe(2); // 2 hits for test.md
      expect(stats.deduplication?.misses).toBe(2); // 2 misses (first test.md and different.md)
      expect(stats.deduplication?.hitRate).toBeCloseTo(0.5); // 50% hit rate
    });

    it('should handle paginated resource deduplication', async () => {
      // Concurrent requests for the same paginated resource
      const promises = [
        cachedHandler.handleRequest('vault://search/query?limit=10&offset=0'),
        cachedHandler.handleRequest('vault://search/query?limit=10&offset=0'),
        cachedHandler.handleRequest('vault://search/query?limit=10&offset=0')
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(promises);

      expect(testHandler.callCount).toBe(1);

      // Different page should trigger new request
      const secondRequest = cachedHandler.handleRequest('vault://search/query?limit=10&offset=10');
      await vi.advanceTimersByTimeAsync(200);
      await secondRequest;

      expect(testHandler.callCount).toBe(2);
    });

    it('should clear deduplicator when clearing cache', async () => {
      // Start a request
      const promise = cachedHandler.handleRequest('vault://note/test.md');
      
      // Clear cache while request is pending
      cachedHandler.clearCache();
      
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      const stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication?.activeRequests).toBe(0);
    });

    it('should reset deduplicator stats when resetting cache stats', async () => {
      // Generate some deduplication activity
      const promises = [
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md')
      ];

      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(promises);

      // Verify stats exist
      let stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication?.hits).toBeGreaterThan(0);

      // Reset stats
      cachedHandler.resetCacheStats();

      // Verify stats are reset
      stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication?.hits).toBe(0);
      expect(stats.deduplication?.misses).toBe(0);
    });
  });

  describe('with deduplication disabled', () => {
    beforeEach(() => {
      testHandler = new TestResourceHandler(100, { data: 'test-response' });
      cachedHandler = new CachedResourceHandler(testHandler, {
        maxSize: 10,
        defaultTtl: 60000,
        enableDeduplication: false
      });
    });

    it('should not deduplicate concurrent requests', async () => {
      // Start multiple concurrent requests
      const promises = [
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md'),
        cachedHandler.handleRequest('vault://note/test.md')
      ];

      // Advance time to complete the requests
      await vi.advanceTimersByTimeAsync(200);
      await Promise.all(promises);

      // Handler should be called for each request (no deduplication)
      expect(testHandler.callCount).toBe(3);
    });

    it('should not include deduplication stats', () => {
      const stats = cachedHandler.getPaginatedCacheStats();
      expect(stats.deduplication).toBeUndefined();
    });
  });

  describe('deduplication with different response types', () => {
    it('should handle string responses', async () => {
      const stringHandler = new TestResourceHandler(100, 'string response');
      const cached = new CachedResourceHandler(stringHandler, {
        enableDeduplication: true
      });

      const promises = [
        cached.handleRequest('vault://note/test.md'),
        cached.handleRequest('vault://note/test.md')
      ];

      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      expect(results[0]).toBe('string response');
      expect(results[1]).toBe('string response');
      expect(stringHandler.callCount).toBe(1);
    });

    it('should handle complex object responses', async () => {
      const complexResponse = {
        metadata: { title: 'Test', tags: ['tag1', 'tag2'] },
        content: 'Test content',
        nested: { deep: { value: 42 } }
      };

      const objectHandler = new TestResourceHandler(100, complexResponse);
      const cached = new CachedResourceHandler(objectHandler, {
        enableDeduplication: true
      });

      const promises = [
        cached.handleRequest('vault://note/complex.md'),
        cached.handleRequest('vault://note/complex.md')
      ];

      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      expect(results[0]).toEqual(complexResponse);
      expect(results[1]).toEqual(complexResponse);
      expect(objectHandler.callCount).toBe(1);
    });
  });

  describe('deduplication TTL behavior', () => {
    it('should expire deduplication after TTL', async () => {
      testHandler = new TestResourceHandler(100, { data: 'test' });
      cachedHandler = new CachedResourceHandler(testHandler, {
        maxSize: 10,
        defaultTtl: 60000,
        enableDeduplication: true,
        deduplicationTtl: 1000 // 1 second TTL
      });

      // First request
      const firstRequest = cachedHandler.handleRequest('vault://note/test.md');
      await vi.advanceTimersByTimeAsync(200);
      await firstRequest;

      expect(testHandler.callCount).toBe(1);

      // Clear cache to ensure next request isn't served from cache
      cachedHandler.clearCache();

      // Wait for deduplication TTL to expire
      await vi.advanceTimersByTimeAsync(1500);

      // Second request should not be deduplicated
      const secondRequest = cachedHandler.handleRequest('vault://note/test.md');
      await vi.advanceTimersByTimeAsync(200);
      await secondRequest;

      expect(testHandler.callCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle errors in deduplicated requests', async () => {
      const errorHandler = new TestResourceHandler(100, null);
      errorHandler.handleRequest = vi.fn().mockRejectedValue(new Error('Test error'));

      const cached = new CachedResourceHandler(errorHandler, {
        enableDeduplication: true
      });

      // All concurrent requests should receive the same error
      const promises = [
        cached.handleRequest('vault://note/error.md').catch(e => e),
        cached.handleRequest('vault://note/error.md').catch(e => e),
        cached.handleRequest('vault://note/error.md').catch(e => e)
      ];

      await vi.advanceTimersByTimeAsync(200);
      const results = await Promise.all(promises);

      // All should get the same error
      expect(results[0]).toBeInstanceOf(Error);
      expect(results[0].message).toBe('Test error');
      expect(results[1]).toBe(results[0]); // Same error instance
      expect(results[2]).toBe(results[0]); // Same error instance

      // Handler should only be called once
      expect(errorHandler.handleRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle race condition where cache is populated during deduplication', async () => {
      testHandler = new TestResourceHandler(200, { data: 'slow-response' });
      cachedHandler = new CachedResourceHandler(testHandler, {
        enableDeduplication: true
      });

      // Start first request
      const promise1 = cachedHandler.handleRequest('vault://note/test.md');

      // After 50ms, manually populate cache (simulating another process)
      await vi.advanceTimersByTimeAsync(50);
      (cachedHandler as any).cache.set(
        'vault://note/test.md',
        { contents: [{ uri: 'vault://note/test.md', mimeType: 'application/json', text: '{"data":"cached"}' }] }
      );

      // Start second request (should check cache inside dedupe)
      const promise2 = cachedHandler.handleRequest('vault://note/test.md');

      // Complete all timers
      await vi.advanceTimersByTimeAsync(300);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // First request should complete normally
      expect(result1).toEqual({ data: 'slow-response' });
      
      // Second request should get cached value
      expect(result2).toEqual({ data: 'cached' });
      
      // Handler should only be called once
      expect(testHandler.callCount).toBe(1);
    });
  });
});