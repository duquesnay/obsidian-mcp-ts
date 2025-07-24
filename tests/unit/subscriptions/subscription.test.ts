import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from '../../../src/resources/index.js';
import { registerSubscriptions, notifyResourceUpdate } from '../../../src/subscriptions/index.js';
import { SubscriptionManager } from '../../../src/subscriptions/SubscriptionManager.js';

describe('Subscription Manager', () => {
  let server: any;
  let subscriptionManager: SubscriptionManager;
  let notificationSpy: any;

  beforeEach(() => {
    // Create mock server with notification capability
    notificationSpy = vi.fn();
    server = {
      setRequestHandler: vi.fn(),
      notification: notificationSpy,
      subscriptionManager: undefined,
      subscriptionHandlers: undefined
    };
    
    subscriptionManager = new SubscriptionManager();
    server.subscriptionManager = subscriptionManager;
  });

  describe('End-to-end subscription flow', () => {
    it('should register subscription handlers and allow subscription workflow', async () => {
      // Register subscriptions
      await registerSubscriptions(server);
      
      // Verify handlers were registered
      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
      
      // Get the subscription handlers
      const subscribeHandler = server.setRequestHandler.mock.calls[0][1];
      const unsubscribeHandler = server.setRequestHandler.mock.calls[1][1];
      
      // Test subscription
      const subscribeRequest = {
        method: 'resources/subscribe',
        params: { uri: 'vault://recent' }
      };
      
      const result = await subscribeHandler(subscribeRequest);
      expect(result).toEqual({});
      
      // Verify client is subscribed
      expect(subscriptionManager.getSubscriptions('default-client')).toContain('vault://recent');
      
      // Test notification
      await notifyResourceUpdate(server, 'vault://recent');
      
      expect(notificationSpy).toHaveBeenCalledWith({
        method: 'notifications/resources/updated',
        params: {
          uri: 'vault://recent'
        }
      });
      
      // Test unsubscription
      const unsubscribeRequest = {
        method: 'resources/unsubscribe',
        params: { uri: 'vault://recent' }
      };
      
      await unsubscribeHandler(unsubscribeRequest);
      expect(subscriptionManager.getSubscriptions('default-client')).not.toContain('vault://recent');
    });

    it('should handle multiple resource subscriptions', async () => {
      await registerSubscriptions(server);
      
      const subscribeHandler = server.setRequestHandler.mock.calls[0][1];
      
      // Subscribe to multiple resources
      const resources = ['vault://recent', 'vault://stats', 'vault://tags'];
      
      for (const uri of resources) {
        const request = {
          method: 'resources/subscribe',
          params: { uri }
        };
        await subscribeHandler(request);
      }
      
      // Verify all subscriptions
      const subscriptions = subscriptionManager.getSubscriptions('default-client');
      for (const uri of resources) {
        expect(subscriptions).toContain(uri);
      }
      
      // Test notifications for all resources
      for (const uri of resources) {
        notificationSpy.mockClear();
        await notifyResourceUpdate(server, uri);
        
        expect(notificationSpy).toHaveBeenCalledWith({
          method: 'notifications/resources/updated',
          params: { uri }
        });
      }
    });

    it('should validate subscribable resources', async () => {
      await registerSubscriptions(server);
      
      const subscribeHandler = server.setRequestHandler.mock.calls[0][1];
      
      // Try to subscribe to non-subscribable resource
      const request = {
        method: 'resources/subscribe',
        params: { uri: 'vault://note/test.md' }
      };
      
      await expect(subscribeHandler(request)).rejects.toThrow(
        'Resource vault://note/test.md is not subscribable'
      );
    });

    it('should not send notifications for resources with no subscribers', async () => {
      await registerSubscriptions(server);
      
      // Try to notify with no subscribers
      await notifyResourceUpdate(server, 'vault://recent');
      
      expect(notificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration with resource system', () => {
    it('should work alongside existing resource handlers', async () => {
      // Register both resources and subscriptions
      await registerResources(server);
      await registerSubscriptions(server);
      
      // Should have resource handlers + subscription handlers
      expect(server.setRequestHandler).toHaveBeenCalledTimes(5); // 3 resource + 2 subscription handlers
      
      // Verify subscription manager is available
      expect(server.subscriptionManager).toBeDefined();
      expect(server.subscriptionHandlers).toBeDefined();
    });
  });
});