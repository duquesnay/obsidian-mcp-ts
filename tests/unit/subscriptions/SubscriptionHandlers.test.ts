import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SubscriptionHandlers } from '../../../src/subscriptions/SubscriptionHandlers.js';
import { SubscriptionManager } from '../../../src/subscriptions/SubscriptionManager.js';

// Mock MCP SDK types
vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  SubscribeRequestSchema: {
    parse: vi.fn((data) => data)
  },
  UnsubscribeRequestSchema: {
    parse: vi.fn((data) => data)  
  }
}));

describe('SubscriptionHandlers', () => {
  let server: Server;
  let subscriptionManager: SubscriptionManager;
  let subscriptionHandlers: SubscriptionHandlers;
  let mockNotificationSender: any;

  beforeEach(() => {
    // Create mock server
    server = {
      setRequestHandler: vi.fn(),
      sendNotification: vi.fn()
    } as any;
    
    subscriptionManager = new SubscriptionManager();
    mockNotificationSender = vi.fn();
    subscriptionHandlers = new SubscriptionHandlers(subscriptionManager, mockNotificationSender);
  });

  describe('registerHandlers', () => {
    it('should register subscribe and unsubscribe request handlers', () => {
      subscriptionHandlers.registerHandlers(server);

      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        expect.anything(), // SubscribeRequestSchema
        expect.any(Function)
      );
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        expect.anything(), // UnsubscribeRequestSchema  
        expect.any(Function)
      );
    });
  });

  describe('subscribe handler', () => {
    it('should handle valid subscription request', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      // Get the subscribe handler that was registered (first call)
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const subscribeHandler = registerCalls[0]?.[1];

      const request = {
        method: 'resources/subscribe',
        params: {
          uri: 'vault://recent'
        }
      };

      const result = await subscribeHandler(request);

      expect(result).toEqual({});
      expect(subscriptionManager.getSubscriptions('default-client')).toContain('vault://recent');
    });

    it('should reject subscription to non-subscribable resource', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const subscribeHandler = registerCalls[0]?.[1]; // First handler

      const request = {
        method: 'resources/subscribe',
        params: {
          uri: 'vault://note/test.md'
        }
      };

      await expect(subscribeHandler(request)).rejects.toThrow('Resource vault://note/test.md is not subscribable');
    });

    it('should reject subscription with invalid URI', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const subscribeHandler = registerCalls[0]?.[1];

      const request = {
        method: 'resources/subscribe',
        params: {
          uri: 'invalid://uri'
        }
      };

      await expect(subscribeHandler(request)).rejects.toThrow('Invalid resource URI format');
    });

    it('should reject subscription without URI parameter', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const subscribeHandler = registerCalls[0]?.[1];

      const request = {
        method: 'resources/subscribe',
        params: {}
      };

      await expect(subscribeHandler(request)).rejects.toThrow('URI parameter is required');
    });
  });

  describe('unsubscribe handler', () => {
    it('should handle valid unsubscription request', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      // First subscribe
      subscriptionManager.subscribe('default-client', 'vault://recent');
      
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const unsubscribeHandler = registerCalls[1]?.[1]; // Second handler

      const request = {
        method: 'resources/unsubscribe',
        params: {
          uri: 'vault://recent'
        }
      };

      const result = await unsubscribeHandler(request);

      expect(result).toEqual({});
      expect(subscriptionManager.getSubscriptions('default-client')).not.toContain('vault://recent');
    });

    it('should handle unsubscription from non-existent subscription gracefully', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const unsubscribeHandler = registerCalls[1]?.[1];

      const request = {
        method: 'resources/unsubscribe',
        params: {
          uri: 'vault://recent'
        }
      };

      const result = await unsubscribeHandler(request);
      expect(result).toEqual({});
    });

    it('should reject unsubscription without URI parameter', async () => {
      subscriptionHandlers.registerHandlers(server);
      
      const registerCalls = (server.setRequestHandler as any).mock.calls;
      const unsubscribeHandler = registerCalls[1]?.[1];

      const request = {
        method: 'resources/unsubscribe',
        params: {}
      };

      await expect(unsubscribeHandler(request)).rejects.toThrow('URI parameter is required');
    });
  });

  describe('notifyResourceUpdate', () => {
    it('should send notification to subscribed clients', async () => {
      const clientId = 'test-client';
      const resourceUri = 'vault://recent';
      
      subscriptionManager.subscribe(clientId, resourceUri);
      
      await subscriptionHandlers.notifyResourceUpdate(resourceUri);
      
      expect(mockNotificationSender).toHaveBeenCalledWith({
        method: 'notifications/resources/updated',
        params: {
          uri: resourceUri
        }
      }, clientId);
    });

    it('should not send notification if no clients subscribed', async () => {
      const resourceUri = 'vault://recent';
      
      await subscriptionHandlers.notifyResourceUpdate(resourceUri);
      
      expect(mockNotificationSender).not.toHaveBeenCalled();
    });

    it('should send notification to multiple subscribed clients', async () => {
      const clientId1 = 'test-client-1';
      const clientId2 = 'test-client-2';
      const resourceUri = 'vault://recent';
      
      subscriptionManager.subscribe(clientId1, resourceUri);
      subscriptionManager.subscribe(clientId2, resourceUri);
      
      await subscriptionHandlers.notifyResourceUpdate(resourceUri);
      
      expect(mockNotificationSender).toHaveBeenCalledTimes(2);
      expect(mockNotificationSender).toHaveBeenCalledWith({
        method: 'notifications/resources/updated',
        params: {
          uri: resourceUri
        }
      }, clientId1);
      expect(mockNotificationSender).toHaveBeenCalledWith({
        method: 'notifications/resources/updated',
        params: {
          uri: resourceUri
        }
      }, clientId2);
    });
  });
});