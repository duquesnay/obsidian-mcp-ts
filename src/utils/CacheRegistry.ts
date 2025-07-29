/**
 * Central registry for all cache instances in the system
 * Provides unified cache management and synchronization
 */

import { LRUCache } from './Cache.js';
import { NotificationManager } from './NotificationManager.js';
import { SUBSCRIPTION_EVENTS } from '../constants.js';

interface CacheInfo {
  name: string;
  instance: LRUCache<string, any>;
  invalidationPatterns?: RegExp[];
}

/**
 * Central registry for managing all cache instances
 */
export class CacheRegistry {
  private static instance: CacheRegistry;
  private caches: Map<string, CacheInfo> = new Map();
  private initialized = false;

  /**
   * Get singleton instance
   */
  static getInstance(): CacheRegistry {
    if (!CacheRegistry.instance) {
      CacheRegistry.instance = new CacheRegistry();
    }
    return CacheRegistry.instance;
  }

  /**
   * Register a cache instance
   */
  register(name: string, cache: LRUCache<string, any>, invalidationPatterns?: RegExp[]): void {
    this.caches.set(name, {
      name,
      instance: cache,
      invalidationPatterns
    });

    // Initialize notification listener if not already done
    if (!this.initialized) {
      this.initializeNotificationListener();
      this.initialized = true;
    }
  }

  /**
   * Unregister a cache
   */
  unregister(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * Get a cache by name
   */
  getCache(name: string): LRUCache<string, any> | undefined {
    return this.caches.get(name)?.instance;
  }

  /**
   * Get all registered caches
   */
  getAllCaches(): Map<string, CacheInfo> {
    return new Map(this.caches);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cacheInfo of this.caches.values()) {
      cacheInfo.instance.clear();
    }
  }

  /**
   * Clear caches matching a pattern
   */
  clearMatching(pattern: RegExp): void {
    for (const cacheInfo of this.caches.values()) {
      const keys = Array.from(cacheInfo.instance.keys());
      for (const key of keys) {
        if (pattern.test(key)) {
          cacheInfo.instance.delete(key);
        }
      }
    }
  }

  /**
   * Invalidate caches based on file path
   */
  invalidateByPath(filepath: string): void {
    for (const cacheInfo of this.caches.values()) {
      // Check if this cache has specific invalidation patterns
      if (cacheInfo.invalidationPatterns) {
        for (const pattern of cacheInfo.invalidationPatterns) {
          if (pattern.test(filepath)) {
            // Clear entire cache or specific keys based on the cache type
            this.invalidateCacheForPath(cacheInfo, filepath);
            break;
          }
        }
      } else {
        // Default invalidation - clear keys containing the filepath
        this.invalidateCacheForPath(cacheInfo, filepath);
      }
    }
  }

  /**
   * Invalidate specific cache for a given path
   */
  private invalidateCacheForPath(cacheInfo: CacheInfo, filepath: string): void {
    const keys = Array.from(cacheInfo.instance.keys());
    for (const key of keys) {
      // Check if key contains the filepath
      if (key.includes(filepath) || key.includes(encodeURIComponent(filepath))) {
        cacheInfo.instance.delete(key);
      }
    }
  }

  /**
   * Initialize notification listener for cache invalidation
   */
  private initializeNotificationListener(): void {
    const notificationManager = NotificationManager.getInstance();

    // Subscribe to cache invalidation events
    notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, (data) => {
      if (data.key) {
        // Invalidate caches based on the key (filepath)
        this.invalidateByPath(data.key);
      }
    });

    // Subscribe to file operation events
    const fileEvents = [
      SUBSCRIPTION_EVENTS.FILE_CREATED,
      SUBSCRIPTION_EVENTS.FILE_UPDATED,
      SUBSCRIPTION_EVENTS.FILE_DELETED
    ];

    for (const event of fileEvents) {
      notificationManager.subscribe(event, (data) => {
        if (data.path) {
          this.invalidateByPath(data.path);
        }
        // Handle rename/move operations
        if (data.metadata?.newPath) {
          this.invalidateByPath(data.metadata.newPath as string);
        }
      });
    }
  }

  /**
   * Get statistics for all caches
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, cacheInfo] of this.caches.entries()) {
      stats[name] = cacheInfo.instance.getStats();
    }
    return stats;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    if (CacheRegistry.instance) {
      CacheRegistry.instance.caches.clear();
      CacheRegistry.instance = undefined as any;
    }
  }
}