import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestDeduplicator } from './RequestDeduplicator.js';

// @Todo test in the source base???

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
});
