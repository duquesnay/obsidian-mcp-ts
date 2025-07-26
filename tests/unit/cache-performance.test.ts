import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LRUCache } from '../../src/utils/Cache.js';

/**
 * Performance tests for LRUCache to verify O(1) operations
 */
describe('LRUCache Performance', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('size() method performance', () => {
    it('should not perform O(n) cleanup on every size() call', () => {
      vi.useFakeTimers();
      
      const cache = new LRUCache<string, string>({ maxSize: 1000, ttl: 1000 });
      
      // Fill cache with entries
      const numEntries = 100;
      for (let i = 0; i < numEntries; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // Advance time to make entries expire
      vi.advanceTimersByTime(1100);
      
      // Spy on the private cleanupExpired method by checking iterations
      let cleanupCallCount = 0;
      const originalCleanup = (cache as any).cleanupExpired;
      (cache as any).cleanupExpired = function() {
        cleanupCallCount++;
        return originalCleanup.call(this);
      };
      
      try {
        // First size() call should trigger cleanup (after cleanup interval passes)
        vi.advanceTimersByTime(250); // 1/4 of TTL = 250ms
        const size1 = cache.size();
        expect(cleanupCallCount).toBe(1);
        expect(size1).toBe(0); // All entries expired
        
        // Second size() call immediately after should NOT trigger cleanup
        cleanupCallCount = 0;
        const size2 = cache.size();
        
        expect(cleanupCallCount).toBe(0); // Should be 0 - no cleanup needed
        expect(size2).toBe(0);
        
        // But after sufficient time, cleanup should happen again if needed
        cache.set('newkey', 'newvalue');
        vi.advanceTimersByTime(1100); // Make new entry expire
        vi.advanceTimersByTime(250); // Pass cleanup interval
        
        cleanupCallCount = 0;
        const size3 = cache.size();
        expect(cleanupCallCount).toBe(1); // Should cleanup the new expired entry
        expect(size3).toBe(0);
        
      } finally {
        (cache as any).cleanupExpired = originalCleanup;
      }
    });

    it('should perform lazy cleanup only when needed', () => {
      vi.useFakeTimers();
      
      const cache = new LRUCache<string, string>({ maxSize: 100, ttl: 1000 });
      
      // Add some entries
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // First size() call on clean cache should be fast
      const cleanSize = cache.size();
      expect(cleanSize).toBe(3);
      
      // Make some entries expire
      vi.advanceTimersByTime(1100);
      
      // Advance enough time to trigger cleanup interval
      vi.advanceTimersByTime(250); // 1/4 of TTL = 250ms
      
      // size() should now clean up expired entries
      const afterExpirySize = cache.size();
      expect(afterExpirySize).toBe(0);
      
      // Subsequent size() calls should be O(1)
      const subsequentSize = cache.size();
      expect(subsequentSize).toBe(0);
    });

    it('should batch cleanup operations efficiently', () => {
      vi.useFakeTimers();
      
      const cache = new LRUCache<string, string>({ maxSize: 1000, ttl: 1000 });
      
      // Add entries with different expiry times
      cache.set('short1', 'value1', 500);
      cache.set('short2', 'value2', 500);
      cache.set('long1', 'value3', 2000);
      cache.set('long2', 'value4', 2000);
      
      // Advance to expire short entries
      vi.advanceTimersByTime(600);
      
      // Cleanup should handle both expired entries efficiently
      const size = cache.size();
      expect(size).toBe(2); // Only long entries remain
      
      expect(cache.has('short1')).toBe(false);
      expect(cache.has('short2')).toBe(false);
      expect(cache.has('long1')).toBe(true);
      expect(cache.has('long2')).toBe(true);
    });
  });

  describe('get() method performance with expired entries', () => {
    it('should not trigger full cache cleanup on individual get()', () => {
      vi.useFakeTimers();
      
      const cache = new LRUCache<string, string>({ maxSize: 100, ttl: 1000 });
      
      // Fill cache
      for (let i = 0; i < 50; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // Make all entries expire
      vi.advanceTimersByTime(1100);
      
      // get() should only check the specific entry, not clean up all entries
      const result = cache.get('key1');
      expect(result).toBeUndefined();
      
      // Cache should still report the old size until explicit cleanup
      // This is acceptable for performance - lazy cleanup
      expect(cache.size()).toBe(0); // Only after size() call should cleanup happen
    });
  });
});