/**
 * Integration hooks for triggering subscription notifications when cache is invalidated
 * This demonstrates how to connect the cache system with the subscription system
 */

// Extended server interface for cache notifications
interface ServerWithCacheNotifications {
  subscriptionHandlers?: {
    notifyResourceUpdate(resourceUri: string): Promise<void>;
  };
}

/**
 * Cache notification hooks - call these when cache is invalidated
 * to notify subscribers that resources have changed
 */
export class CacheNotificationHooks {
  private server: ServerWithCacheNotifications;

  constructor(server: ServerWithCacheNotifications) {
    this.server = server;
  }

  /**
   * Notify when tags cache is invalidated
   */
  async onTagsCacheInvalidated(): Promise<void> {
    if (this.server.subscriptionHandlers) {
      await this.server.subscriptionHandlers.notifyResourceUpdate('vault://tags');
    }
  }

  /**
   * Notify when stats cache is invalidated
   */
  async onStatsCacheInvalidated(): Promise<void> {
    if (this.server.subscriptionHandlers) {
      await this.server.subscriptionHandlers.notifyResourceUpdate('vault://stats');
    }
  }

  /**
   * Notify when recent files cache is invalidated
   */
  async onRecentCacheInvalidated(): Promise<void> {
    if (this.server.subscriptionHandlers) {
      await this.server.subscriptionHandlers.notifyResourceUpdate('vault://recent');
    }
  }

  /**
   * Generic notification for any cache invalidation
   */
  async onCacheInvalidated(resourceUri: string): Promise<void> {
    if (this.server.subscriptionHandlers) {
      await this.server.subscriptionHandlers.notifyResourceUpdate(resourceUri);
    }
  }
}

/**
 * Factory function to create cache notification hooks
 */
export function createCacheNotificationHooks(server: ServerWithCacheNotifications): CacheNotificationHooks {
  return new CacheNotificationHooks(server);
}

/**
 * Example usage in cache invalidation:
 * 
 * ```typescript
 * const hooks = createCacheNotificationHooks(server);
 * 
 * // When invalidating tags cache
 * tagsCache.clear();
 * await hooks.onTagsCacheInvalidated();
 * 
 * // When invalidating stats cache  
 * statsCache.clear();
 * await hooks.onStatsCacheInvalidated();
 * 
 * // When invalidating recent files cache
 * recentCache.clear();
 * await hooks.onRecentCacheInvalidated();
 * ```
 */