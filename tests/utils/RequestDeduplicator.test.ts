import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestDeduplicator } from '../../src/utils/RequestDeduplicator.js';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator(1000); // 1 second TTL
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('deduplication', () => {
    it('should return same promise for identical concurrent requests', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        return `result-${callCount}`;
      });

      // Make two identical requests
      const promise1 = deduplicator.dedupe('key1', requestFn);
      const promise2 = deduplicator.dedupe('key1', requestFn);

      // Should be the same promise
      expect(promise1).toBe(promise2);

      // Should only call the function once
      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-1');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should allow different keys to execute independently', async () => {
      const requestFn1 = vi.fn(async () => 'result1');
      const requestFn2 = vi.fn(async () => 'result2');

      const promise1 = deduplicator.dedupe('key1', requestFn1);
      const promise2 = deduplicator.dedupe('key2', requestFn2);

      // Should be different promises
      expect(promise1).not.toBe(promise2);

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('should execute new request after previous completes', async () => {
      const requestFn = vi.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');

      // First request
      const result1 = await deduplicator.dedupe('key1', requestFn);
      expect(result1).toBe('result1');

      // Second request after first completes
      const result2 = await deduplicator.dedupe('key1', requestFn);
      expect(result2).toBe('result2');

      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should handle request failures properly', async () => {
      const error = new Error('Request failed');
      const requestFn = vi.fn().mockRejectedValue(error);

      // First request fails
      await expect(deduplicator.dedupe('key1', requestFn)).rejects.toThrow('Request failed');

      // Should allow retry after failure
      await expect(deduplicator.dedupe('key1', requestFn)).rejects.toThrow('Request failed');

      // Should have been called twice
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('TTL expiration', () => {
    it('should cleanup expired pending requests', async () => {
      const requestFn = vi.fn(() => new Promise(resolve => {
        // Never resolves
      }));

      deduplicator.dedupe('key1', requestFn);
      expect(deduplicator.size()).toBe(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Should be cleaned up
      expect(deduplicator.size()).toBe(0);
    });

    it('should allow new request after TTL expires', async () => {
      let resolver: (value: string) => void;
      const promise1 = new Promise<string>(resolve => { resolver = resolve; });
      const requestFn = vi.fn()
        .mockReturnValueOnce(promise1)
        .mockResolvedValueOnce('result2');

      // First request (doesn't complete)
      const firstPromise = deduplicator.dedupe('key1', requestFn);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Second request should create new promise
      const secondPromise = deduplicator.dedupe('key1', requestFn);

      expect(firstPromise).not.toBe(secondPromise);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // Complete first request
      resolver!('result1');

      const result1 = await firstPromise;
      const result2 = await secondPromise;

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });
  });

  describe('management methods', () => {
    it('should clear all pending requests', () => {
      const requestFn = vi.fn(() => new Promise(() => {}));

      deduplicator.dedupe('key1', requestFn);
      deduplicator.dedupe('key2', requestFn);
      deduplicator.dedupe('key3', requestFn);

      expect(deduplicator.size()).toBe(3);

      deduplicator.clear();
      expect(deduplicator.size()).toBe(0);
    });

    it('should return correct size', () => {
      const requestFn = vi.fn(() => new Promise(() => {}));

      expect(deduplicator.size()).toBe(0);

      deduplicator.dedupe('key1', requestFn);
      expect(deduplicator.size()).toBe(1);

      deduplicator.dedupe('key2', requestFn);
      expect(deduplicator.size()).toBe(2);
    });
  });

  describe('race conditions', () => {
    it('should handle rapid successive calls correctly', async () => {
      const requestFn = vi.fn().mockResolvedValue('result');

      // Make many rapid calls
      const promises = Array(10).fill(null).map(() =>
        deduplicator.dedupe('key1', requestFn)
      );

      // All should be the same promise
      const firstPromise = promises[0];
      promises.forEach(p => expect(p).toBe(firstPromise));

      // Should only execute once
      const results = await Promise.all(promises);
      results.forEach(r => expect(r).toBe('result'));
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('metrics', () => {
    it('should track hit rate metrics', async () => {
      const requestFn = vi.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');

      // Initial stats should be zero
      const initialStats = deduplicator.getStats();
      expect(initialStats).toEqual({
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        activeRequests: 0
      });

      // First request - should be a miss
      await deduplicator.dedupe('key1', requestFn);
      
      let stats = deduplicator.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalRequests).toBe(1);

      // Concurrent requests with same key - should be hits
      const promise1 = deduplicator.dedupe('key2', () => requestFn());
      const promise2 = deduplicator.dedupe('key2', () => requestFn());
      const promise3 = deduplicator.dedupe('key2', () => requestFn());

      await Promise.all([promise1, promise2, promise3]);

      stats = deduplicator.getStats();
      expect(stats.hits).toBe(2); // Two hits (promise2 and promise3)
      expect(stats.misses).toBe(2); // Two misses (key1 and first key2 request)
      expect(stats.hitRate).toBe(0.5); // 2 hits out of 4 total requests
      expect(stats.totalRequests).toBe(4);
    });

    it('should track response times', async () => {
      // Use real timers for this test
      vi.useRealTimers();
      
      const requestFn = vi.fn(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      await deduplicator.dedupe('key1', requestFn);

      const stats = deduplicator.getStats();
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      
      // Switch back to fake timers
      vi.useFakeTimers();
    });

    it('should reset metrics', async () => {
      const requestFn = vi.fn().mockResolvedValue('result');

      // Generate some metrics
      await deduplicator.dedupe('key1', requestFn);
      const promise1 = deduplicator.dedupe('key2', requestFn);
      const promise2 = deduplicator.dedupe('key2', requestFn);
      await Promise.all([promise1, promise2]);

      // Should have some stats
      let stats = deduplicator.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);

      // Reset and check
      deduplicator.resetStats();
      stats = deduplicator.getStats();
      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        activeRequests: 0
      });
    });

    it('should track active requests', () => {
      const requestFn = vi.fn(() => new Promise(() => {})); // Never resolves

      expect(deduplicator.getStats().activeRequests).toBe(0);

      deduplicator.dedupe('key1', requestFn);
      expect(deduplicator.getStats().activeRequests).toBe(1);

      deduplicator.dedupe('key2', requestFn);
      expect(deduplicator.getStats().activeRequests).toBe(2);

      // Same key should not increase active requests
      deduplicator.dedupe('key1', requestFn);
      expect(deduplicator.getStats().activeRequests).toBe(2);
    });

    it('should provide metrics logging when enabled', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const deduplicatorWithLogging = new RequestDeduplicator(1000, { enableMetricsLogging: true });
      
      const requestFn = vi.fn().mockResolvedValue('result');

      // Make some requests to generate metrics
      await deduplicatorWithLogging.dedupe('key1', requestFn);
      const promise1 = deduplicatorWithLogging.dedupe('key2', requestFn);
      const promise2 = deduplicatorWithLogging.dedupe('key2', requestFn);
      await Promise.all([promise1, promise2]);

      // Log metrics
      deduplicatorWithLogging.logMetrics();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('RequestDeduplicator Metrics:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hit Rate:')
      );

      consoleLogSpy.mockRestore();
    });

    it('should track metrics correctly with rapid concurrent requests', async () => {
      const requestFn = vi.fn().mockResolvedValue('result');

      // Make 10 rapid calls with same key - should result in 1 miss and 9 hits
      const promises = Array(10).fill(null).map(() =>
        deduplicator.dedupe('key1', requestFn)
      );

      await Promise.all(promises);

      const stats = deduplicator.getStats();
      expect(stats.hits).toBe(9); // 9 hits
      expect(stats.misses).toBe(1); // 1 miss
      expect(stats.hitRate).toBe(0.9); // 90% hit rate
      expect(stats.totalRequests).toBe(10);
      expect(requestFn).toHaveBeenCalledTimes(1); // Only executed once
    });
  });
});
