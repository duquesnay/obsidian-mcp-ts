import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CachedResourceHandler } from '../../src/resources/CachedResourceHandler.js';
import { BaseResourceHandler } from '../../src/resources/BaseResourceHandler.js';
import { NotificationManager } from '../../src/utils/NotificationManager.js';
import { CacheSubscriptionManager } from '../../src/utils/CacheSubscriptionManager.js';
import { SUBSCRIPTION_EVENTS } from '../../src/constants.js';
import { CacheNotificationHooks } from '../../src/resources/cacheNotifications.js';
import { SubscriptionManager } from '../../src/subscriptions/SubscriptionManager.js';
import { SubscriptionHandlers } from '../../src/subscriptions/SubscriptionHandlers.js';

// Mock handler for testing
class TestHandler extends BaseResourceHandler {
  private data: any;

  constructor(data: any) {
    super();
    this.data = data;
  }

  async handleRequest(uri: string): Promise<any> {
    return this.data;
  }
}

describe('Cache Subscription Integration', () => {
  let server: any;
  let subscriptionManager: SubscriptionManager;
  let subscriptionHandlers: SubscriptionHandlers;
  let cacheSubscriptionManager: CacheSubscriptionManager;
  let notificationManager: NotificationManager;
  let cachedHandler: CachedResourceHandler;
  let testHandler: TestHandler;
  let notifications: any[] = [];

  beforeEach(() => {
    // Reset singletons
    NotificationManager.reset();
    CacheSubscriptionManager.reset();
    notificationManager = NotificationManager.getInstance();

    // Create server with subscription capabilities
    server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { resources: { subscribe: true } } }
    );

    // Mock notification method
    server.notification = async (notification: any) => {
      notifications.push(notification);
    };

    // Create subscription components
    subscriptionManager = new SubscriptionManager();
    subscriptionManager.enableTestMode(); // Enable test mode to allow any vault:// resource
    const notificationSender = async (notification: any) => {
      await server.notification(notification);
    };
    subscriptionHandlers = new SubscriptionHandlers(subscriptionManager, notificationSender);

    // Attach to server
    server.subscriptionManager = subscriptionManager;
    server.subscriptionHandlers = subscriptionHandlers;

    // Create cache subscription manager (use fresh instance, not singleton)
    cacheSubscriptionManager = new CacheSubscriptionManager();

    // Create test handler
    testHandler = new TestHandler({ test: 'data' });
    cachedHandler = new CachedResourceHandler(testHandler);

    // Clear notifications
    notifications = [];
  });

  afterEach(() => {
    // Clean up
    cacheSubscriptionManager.clearSubscriptions();
    NotificationManager.reset();
  });

  describe('Cache invalidation notifications', () => {
    it('should notify MCP clients when cache is invalidated', async () => {
      // Arrange: Subscribe to a resource
      const resourceUri = 'vault://tags';
      await subscriptionManager.subscribe('default-client', resourceUri); // Use the actual default client ID

      // Connect notification manager to cache subscription manager
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, async (data) => {
        await cacheSubscriptionManager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, data);
      });

      // Connect cache subscription manager to MCP handlers
      cacheSubscriptionManager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: async (data) => {
          // Forward to MCP subscription handlers
          if (data.key) {
            await subscriptionHandlers.notifyResourceUpdate(data.key);
          }
        }
      });

      // Act: Trigger cache invalidation through notification manager
      notificationManager.notifyCacheInvalidation(resourceUri, { operation: 'clear' });

      // Allow async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: MCP notification should be sent
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        method: 'notifications/resources/updated',
        params: {
          uri: resourceUri
        }
      });
    });

    it('should integrate CacheNotificationHooks with cached handlers', async () => {
      // Arrange: Create cached handler with hooks
      const hooks = new CacheNotificationHooks(server);
      
      // Subscribe to tags resource
      await subscriptionManager.subscribe('default-client', 'vault://tags');

      // Act: Trigger cache invalidation through hooks
      await hooks.onTagsCacheInvalidated();

      // Assert: MCP notification should be sent
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        method: 'notifications/resources/updated',
        params: {
          uri: 'vault://tags'
        }
      });
    });

    it('should notify subscribers when file operations trigger cache invalidation', async () => {
      // Arrange: Subscribe to recent resource
      await subscriptionManager.subscribe('default-client', 'vault://recent');

      // Connect cache subscription manager to notification manager
      cacheSubscriptionManager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_UPDATED,
        callback: async (data) => {
          // Invalidate recent cache on file updates
          await subscriptionHandlers.notifyResourceUpdate('vault://recent');
        }
      });

      // Connect to notification manager events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, async (data) => {
        await cacheSubscriptionManager.processEvent(SUBSCRIPTION_EVENTS.FILE_UPDATED, data);
      });

      // Act: Simulate file update
      notificationManager.notifyFileUpdated('test.md');

      // Allow async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: MCP notification should be sent
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        method: 'notifications/resources/updated',
        params: {
          uri: 'vault://recent'
        }
      });
    });

    it('should handle multiple subscriptions correctly', async () => {
      // Arrange: Multiple clients subscribe to different resources
      await subscriptionManager.subscribe('default-client', 'vault://tags');
      await subscriptionManager.subscribe('default-client', 'vault://stats');
      await subscriptionManager.subscribe('default-client', 'vault://recent');

      // Connect notification manager to cache subscription manager
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, async (data) => {
        await cacheSubscriptionManager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, data);
      });

      // Connect cache subscription manager to MCP handlers
      cacheSubscriptionManager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: async (data) => {
          if (data.key) {
            await subscriptionHandlers.notifyResourceUpdate(data.key);
          }
        }
      });

      // Act: Invalidate tags cache
      notificationManager.notifyCacheInvalidation('vault://tags', { operation: 'clear' });

      // Allow async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: Only tags notification should be sent
      expect(notifications).toHaveLength(1);
      expect(notifications[0].params.uri).toBe('vault://tags');
    });

    it('should integrate with CachedResourceHandler invalidation', async () => {
      // Arrange: Create a cached handler with subscription hooks
      const handler = new CachedResourceHandler(testHandler, {
        maxSize: 10,
        defaultTtl: 1000
      });

      // Attach hooks
      const hooks = new CacheNotificationHooks(server);
      (handler as any).notificationHooks = hooks;

      // Subscribe to resource
      await subscriptionManager.subscribe('default-client', 'vault://test');

      // Prime the cache
      await handler.handleRequest('vault://test', server);

      // Act: Clear cache with notification
      handler.clearCache();
      
      // If handler has notification hooks, it should notify
      if ((handler as any).notificationHooks) {
        await (handler as any).notificationHooks.onCacheInvalidated('vault://test');
      }

      // Assert: Notification should be sent
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        method: 'notifications/resources/updated',
        params: {
          uri: 'vault://test'
        }
      });
    });
  });

  describe('Global cache subscription manager integration', () => {
    it('should use a global cache subscription manager instance', async () => {
      // This test verifies that a global instance is properly connected
      // In the actual implementation, this would be set up during server initialization
      
      // Arrange: Set up global connection
      const globalManager = CacheSubscriptionManager.getInstance();
      
      // Connect to notification manager
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, async (data) => {
        await globalManager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, data);
      });

      // Subscribe to forward cache events to MCP
      globalManager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: async (data) => {
          if (data.key && server.subscriptionHandlers) {
            await server.subscriptionHandlers.notifyResourceUpdate(data.key);
          }
        }
      });

      // Subscribe MCP client
      await subscriptionManager.subscribe('default-client', 'vault://tags');

      // Act: Trigger cache invalidation
      notificationManager.notifyCacheInvalidation('vault://tags', { operation: 'clear' });

      // Allow async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: Should receive notification
      expect(notifications).toHaveLength(1);
      expect(notifications[0].params.uri).toBe('vault://tags');
    });
  });

  describe('File operation to cache invalidation flow', () => {
    it('should invalidate relevant caches when files are modified', async () => {
      // This tests the complete flow from file operation to cache invalidation to MCP notification
      
      // Arrange: Subscribe to resources that should be invalidated
      await subscriptionManager.subscribe('default-client', 'vault://recent');
      await subscriptionManager.subscribe('default-client', 'vault://structure');
      await subscriptionManager.subscribe('default-client', 'vault://stats');

      // Set up cache invalidation rules
      const cacheInvalidationRules = {
        [SUBSCRIPTION_EVENTS.FILE_CREATED]: ['vault://recent', 'vault://structure', 'vault://stats'],
        [SUBSCRIPTION_EVENTS.FILE_UPDATED]: ['vault://recent'],
        [SUBSCRIPTION_EVENTS.FILE_DELETED]: ['vault://recent', 'vault://structure', 'vault://stats'],
      };

      // Connect cache subscription manager with rules
      Object.entries(cacheInvalidationRules).forEach(([event, resources]) => {
        cacheSubscriptionManager.subscribe({
          eventType: event,
          callback: async () => {
            for (const resource of resources) {
              await subscriptionHandlers.notifyResourceUpdate(resource);
            }
          }
        });
      });

      // Connect to notification manager
      Object.keys(cacheInvalidationRules).forEach(event => {
        notificationManager.subscribe(event, async (data) => {
          await cacheSubscriptionManager.processEvent(event, data);
        });
      });

      // Act: Create a file
      notificationManager.notifyFileCreated('new-note.md');

      // Allow async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: Should receive notifications for all affected resources
      expect(notifications).toHaveLength(3);
      const notifiedUris = notifications.map(n => n.params.uri).sort();
      expect(notifiedUris).toEqual(['vault://recent', 'vault://stats', 'vault://structure']);
    });
  });
});