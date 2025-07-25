import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LRUCache } from '../../src/utils/Cache.js';
import { LRU_CACHE } from '../../src/constants.js';

describe('LRUCache', () => {
  let cache: LRUCache<string, any>;

  beforeEach(() => {
    cache = new LRUCache<string, any>({ maxSize: 3, ttl: 1000 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.delete('key1')).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used item when cache is full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update LRU order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.get('key1'); // Makes key1 most recently used
      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update LRU order on set for existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.set('key1', 'updated'); // Makes key1 most recently used
      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('updated');
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL expiration', () => {
    it('should expire items after TTL', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    it('should allow custom TTL per item', () => {
      cache.set('key1', 'value1', 500);
      cache.set('key2', 'value2', 2000);

      vi.advanceTimersByTime(600);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');

      vi.advanceTimersByTime(1500);
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should not expire if TTL is 0', () => {
      const noTtlCache = new LRUCache<string, string>({ maxSize: 3, ttl: 0 });
      noTtlCache.set('key1', 'value1');

      vi.advanceTimersByTime(10000);
      expect(noTtlCache.get('key1')).toBe('value1');
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 3);
    });

    it('should reset statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2');

      cache.resetStats();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('constants usage', () => {
    it('should use NO_EXPIRATION constant for TTL checks', () => {
      // Test that cache with ttl: 0 uses the NO_EXPIRATION constant correctly
      const noExpirationCache = new LRUCache<string, string>({ maxSize: 3, ttl: LRU_CACHE.NO_EXPIRATION });
      noExpirationCache.set('key1', 'value1');
      
      vi.advanceTimersByTime(100000);
      expect(noExpirationCache.get('key1')).toBe('value1');
    });

    it('should use NO_EXPIRATION for expiry calculations', () => {
      // Test that custom TTL of 0 means no expiration
      cache.set('key1', 'value1', LRU_CACHE.NO_EXPIRATION);
      
      vi.advanceTimersByTime(100000);
      expect(cache.get('key1')).toBe('value1');
    });
  });
});
