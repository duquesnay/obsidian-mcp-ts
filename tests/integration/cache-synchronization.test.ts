/**
 * Integration tests for cache synchronization across tools
 * Verifies that all caches are properly invalidated when file operations occur
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheRegistry } from '../../src/utils/CacheRegistry.js';
import { NotificationManager } from '../../src/utils/NotificationManager.js';
import { CacheSubscriptionManager } from '../../src/utils/CacheSubscriptionManager.js';
import { ResponseModeSystem } from '../../src/utils/ResponseModeSystem.js';
import { LRUCache } from '../../src/utils/Cache.js';
import { SUBSCRIPTION_EVENTS } from '../../src/constants.js';
import { defaultCachedHandlers, CachedTagsHandler } from '../../src/resources/CachedConcreteHandlers.js';

describe('Cache Synchronization Integration', () => {
  let registry: CacheRegistry;
  let notificationManager: NotificationManager;
  let cacheSubscriptionManager: CacheSubscriptionManager;

  beforeEach(() => {
    // Reset singletons
    CacheRegistry.reset();
    NotificationManager.reset();
    CacheSubscriptionManager.reset();
    ResponseModeSystem.reset();

    // Get instances
    registry = CacheRegistry.getInstance();
    notificationManager = NotificationManager.getInstance();
    cacheSubscriptionManager = CacheSubscriptionManager.getInstance();
  });

  afterEach(() => {
    // Clean up
    CacheRegistry.reset();
    NotificationManager.reset();
    CacheSubscriptionManager.reset();
    ResponseModeSystem.reset();
  });

  describe('Central Cache Registry', () => {
    it('should register all system caches', () => {
      // Trigger ResponseModeSystem initialization
      ResponseModeSystem.createSummary('test content');
      
      // Response mode caches should now be registered
      const allCaches = registry.getAllCaches();
      
      expect(allCaches.has('response-mode-preview')).toBe(true);
      expect(allCaches.has('response-mode-summary')).toBe(true);
    });

    it('should register resource handler caches', () => {
      // Create a fresh cached handler to trigger registration
      const tagsHandler = new CachedTagsHandler();
      
      const allCaches = registry.getAllCaches();
      const resourceCaches = Array.from(allCaches.keys()).filter(k => k.startsWith('resource-'));
      
      expect(resourceCaches.length).toBeGreaterThan(0);
    });

    it('should invalidate all caches when file is updated', async () => {
      // Create test caches
      const cache1 = new LRUCache<string, string>({ maxSize: 10 });
      const cache2 = new LRUCache<string, string>({ maxSize: 10 });
      
      registry.register('test-cache-1', cache1);
      registry.register('test-cache-2', cache2);
      
      // Add test data
      cache1.set('notes/test.md', 'content1');
      cache1.set('notes/other.md', 'other1');
      cache2.set('vault://note/notes/test.md', 'content2');
      cache2.set('vault://note/notes/other.md', 'other2');
      
      expect(cache1.has('notes/test.md')).toBe(true);
      expect(cache2.has('vault://note/notes/test.md')).toBe(true);
      
      // Trigger file update notification
      notificationManager.notifyCacheInvalidation('notes/test.md', { reason: 'file-updated' });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check that relevant caches were invalidated
      expect(cache1.has('notes/test.md')).toBe(false);
      expect(cache2.has('vault://note/notes/test.md')).toBe(false);
      
      // Other entries should remain
      expect(cache1.has('notes/other.md')).toBe(true);
      expect(cache2.has('vault://note/notes/other.md')).toBe(true);
    });

    it('should handle URL-encoded paths in cache keys', async () => {
      const cache = new LRUCache<string, string>({ maxSize: 10 });
      registry.register('test-cache', cache);
      
      const filepath = 'notes/My Notes/test file.md';
      const encodedPath = encodeURIComponent(filepath);
      
      // Add entries with encoded path
      cache.set(`vault://note/${encodedPath}`, 'content');
      cache.set(`search-${encodedPath}`, 'results');
      
      expect(cache.has(`vault://note/${encodedPath}`)).toBe(true);
      expect(cache.has(`search-${encodedPath}`)).toBe(true);
      
      // Trigger invalidation with unencoded path
      notificationManager.notifyCacheInvalidation(filepath, { reason: 'file-updated' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should invalidate encoded entries
      expect(cache.has(`vault://note/${encodedPath}`)).toBe(false);
      expect(cache.has(`search-${encodedPath}`)).toBe(false);
    });
  });

  describe('Cross-System Cache Synchronization', () => {
    it('should synchronize ResponseModeSystem caches with file operations', async () => {
      // Trigger ResponseModeSystem initialization
      ResponseModeSystem.createSummary('test content');
      
      // Get ResponseModeSystem caches
      const previewCache = registry.getCache('response-mode-preview');
      const summaryCache = registry.getCache('response-mode-summary');
      
      expect(previewCache).toBeDefined();
      expect(summaryCache).toBeDefined();
      
      // Add test data
      previewCache!.set('notes/test.md', 'preview content');
      summaryCache!.set('notes/test.md', 'summary content');
      
      // Trigger file update
      notificationManager.notifyFileUpdated('notes/test.md', { operation: 'update' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Caches should be invalidated
      expect(previewCache!.has('notes/test.md')).toBe(false);
      expect(summaryCache!.has('notes/test.md')).toBe(false);
    });

    it('should handle rename operations across all caches', async () => {
      const cache1 = new LRUCache<string, string>({ maxSize: 10 });
      const cache2 = new LRUCache<string, string>({ maxSize: 10 });
      
      registry.register('test-cache-1', cache1);
      registry.register('test-cache-2', cache2);
      
      // Ensure registry is listening to notifications
      // This would normally happen on first cache registration, but in tests we need to trigger it
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add entries for old path
      cache1.set('notes/old.md', 'content1');
      cache1.set('vault://note/notes/old.md', 'resource1');
      cache2.set('search-notes/old.md', 'results1');
      
      // Add entries for new path (should be invalidated too)
      cache1.set('notes/new.md', 'content2');
      cache2.set('vault://note/notes/new.md', 'resource2');
      
      // Trigger rename notification
      notificationManager.notifyFileUpdated('notes/old.md', { 
        operation: 'rename', 
        newPath: 'notes/new.md' 
      });
      
      await new Promise(resolve => setTimeout(resolve, 50)); // Give more time for event propagation
      
      // Both old and new paths should be invalidated
      expect(cache1.has('notes/old.md')).toBe(false);
      expect(cache1.has('vault://note/notes/old.md')).toBe(false);
      expect(cache2.has('search-notes/old.md')).toBe(false);
      
      expect(cache1.has('notes/new.md')).toBe(false);
      expect(cache2.has('vault://note/notes/new.md')).toBe(false);
    });

    it('should propagate cache invalidation through subscription chain', async () => {
      // Track invalidation events
      const invalidationEvents: any[] = [];
      
      // Subscribe to cache invalidation events
      cacheSubscriptionManager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: (data) => {
          invalidationEvents.push(data);
        }
      });
      
      // Create and register a test cache
      const testCache = new LRUCache<string, string>({ maxSize: 10 });
      registry.register('test-cache', testCache);
      testCache.set('notes/test.md', 'content');
      
      // Connect notification manager to cache subscription manager
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, async (data) => {
        await cacheSubscriptionManager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, data);
      });
      
      // Trigger file operation
      notificationManager.notifyFileUpdated('notes/test.md', { operation: 'update' });
      notificationManager.notifyCacheInvalidation('notes/test.md', { reason: 'file-updated' });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Check that invalidation event was received
      expect(invalidationEvents.length).toBeGreaterThan(0);
      expect(invalidationEvents.some(e => e.key === 'notes/test.md')).toBe(true);
      
      // Cache should be invalidated
      expect(testCache.has('notes/test.md')).toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle mass invalidation efficiently', async () => {
      const cache = new LRUCache<string, string>({ maxSize: 1000 });
      registry.register('large-cache', cache);
      
      // Add many entries
      for (let i = 0; i < 100; i++) {
        cache.set(`notes/file${i}.md`, `content${i}`);
        cache.set(`vault://note/notes/file${i}.md`, `resource${i}`);
      }
      
      const startTime = Date.now();
      
      // Trigger invalidation for multiple files
      for (let i = 0; i < 10; i++) {
        notificationManager.notifyCacheInvalidation(`notes/file${i}.md`, { reason: 'file-updated' });
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 10 files)
      expect(duration).toBeLessThan(100);
      
      // Check that correct entries were invalidated
      for (let i = 0; i < 10; i++) {
        expect(cache.has(`notes/file${i}.md`)).toBe(false);
        expect(cache.has(`vault://note/notes/file${i}.md`)).toBe(false);
      }
      
      // Others should remain
      for (let i = 10; i < 20; i++) {
        expect(cache.has(`notes/file${i}.md`)).toBe(true);
        expect(cache.has(`vault://note/notes/file${i}.md`)).toBe(true);
      }
    });

    it('should handle concurrent cache operations safely', async () => {
      const cache = new LRUCache<string, string>({ maxSize: 100 });
      registry.register('concurrent-cache', cache);
      
      // Add initial data
      for (let i = 0; i < 10; i++) {
        cache.set(`notes/file${i}.md`, `content${i}`);
      }
      
      // Trigger multiple concurrent operations
      const promises = [];
      
      // Invalidations
      for (let i = 0; i < 5; i++) {
        promises.push(
          notificationManager.notifyCacheInvalidation(`notes/file${i}.md`, { reason: 'file-updated' })
        );
      }
      
      // Cache reads
      for (let i = 5; i < 10; i++) {
        promises.push(
          Promise.resolve(cache.get(`notes/file${i}.md`))
        );
      }
      
      // Cache writes
      for (let i = 10; i < 15; i++) {
        promises.push(
          Promise.resolve(cache.set(`notes/file${i}.md`, `new-content${i}`))
        );
      }
      
      // Wait for all operations
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify state
      for (let i = 0; i < 5; i++) {
        expect(cache.has(`notes/file${i}.md`)).toBe(false);
      }
      for (let i = 5; i < 10; i++) {
        expect(cache.has(`notes/file${i}.md`)).toBe(true);
      }
      for (let i = 10; i < 15; i++) {
        expect(cache.get(`notes/file${i}.md`)).toBe(`new-content${i}`);
      }
    });
  });

  describe('Cache Registry Statistics', () => {
    it('should provide comprehensive cache statistics', () => {
      const cache1 = new LRUCache<string, string>({ maxSize: 10 });
      const cache2 = new LRUCache<string, string>({ maxSize: 20 });
      
      registry.register('cache-1', cache1);
      registry.register('cache-2', cache2);
      
      // Add some data and trigger hits/misses
      cache1.set('key1', 'value1');
      cache1.get('key1'); // hit
      cache1.get('key2'); // miss
      
      cache2.set('key1', 'value1');
      cache2.set('key2', 'value2');
      cache2.get('key1'); // hit
      
      const stats = registry.getStats();
      
      expect(stats['cache-1']).toBeDefined();
      expect(stats['cache-2']).toBeDefined();
      expect(stats['cache-1'].hits).toBe(1);
      expect(stats['cache-1'].misses).toBe(1);
      expect(stats['cache-2'].hits).toBe(1);
    });
  });
});