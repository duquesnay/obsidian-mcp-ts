import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionManager } from '../../../src/subscriptions/SubscriptionManager.js';

describe('SubscriptionManager', () => {
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  describe('Basic subscription management', () => {
    it('should allow subscribing to a resource', () => {
      const clientId = 'test-client-1';
      const resourceUri = 'vault://recent';

      subscriptionManager.subscribe(clientId, resourceUri);

      expect(subscriptionManager.getSubscriptions(clientId)).toContain(resourceUri);
    });

    it('should allow unsubscribing from a resource', () => {
      const clientId = 'test-client-1';
      const resourceUri = 'vault://recent';

      subscriptionManager.subscribe(clientId, resourceUri);
      subscriptionManager.unsubscribe(clientId, resourceUri);

      expect(subscriptionManager.getSubscriptions(clientId)).not.toContain(resourceUri);
    });

    it('should handle multiple subscriptions per client', () => {
      const clientId = 'test-client-1';
      const resourceUri1 = 'vault://recent';
      const resourceUri2 = 'vault://stats';

      subscriptionManager.subscribe(clientId, resourceUri1);
      subscriptionManager.subscribe(clientId, resourceUri2);

      const subscriptions = subscriptionManager.getSubscriptions(clientId);
      expect(subscriptions).toContain(resourceUri1);
      expect(subscriptions).toContain(resourceUri2);
      expect(subscriptions).toHaveLength(2);
    });

    it('should handle multiple clients', () => {
      const clientId1 = 'test-client-1';
      const clientId2 = 'test-client-2';
      const resourceUri = 'vault://recent';

      subscriptionManager.subscribe(clientId1, resourceUri);
      subscriptionManager.subscribe(clientId2, resourceUri);

      expect(subscriptionManager.getSubscriptions(clientId1)).toContain(resourceUri);
      expect(subscriptionManager.getSubscriptions(clientId2)).toContain(resourceUri);
    });

    it('should not duplicate subscriptions for the same resource', () => {
      const clientId = 'test-client-1';
      const resourceUri = 'vault://recent';

      subscriptionManager.subscribe(clientId, resourceUri);
      subscriptionManager.subscribe(clientId, resourceUri); // Duplicate

      expect(subscriptionManager.getSubscriptions(clientId)).toHaveLength(1);
    });

    it('should return empty array for client with no subscriptions', () => {
      const clientId = 'test-client-1';
      expect(subscriptionManager.getSubscriptions(clientId)).toEqual([]);
    });

    it('should get all clients subscribed to a resource', () => {
      const clientId1 = 'test-client-1';
      const clientId2 = 'test-client-2';
      const resourceUri = 'vault://recent';

      subscriptionManager.subscribe(clientId1, resourceUri);
      subscriptionManager.subscribe(clientId2, resourceUri);

      const subscribedClients = subscriptionManager.getSubscribedClients(resourceUri);
      expect(subscribedClients).toContain(clientId1);
      expect(subscribedClients).toContain(clientId2);
      expect(subscribedClients).toHaveLength(2);
    });

    it('should clean up client subscriptions', () => {
      const clientId = 'test-client-1';
      const resourceUri1 = 'vault://recent';
      const resourceUri2 = 'vault://stats';

      subscriptionManager.subscribe(clientId, resourceUri1);
      subscriptionManager.subscribe(clientId, resourceUri2);
      subscriptionManager.unsubscribeAll(clientId);

      expect(subscriptionManager.getSubscriptions(clientId)).toEqual([]);
      expect(subscriptionManager.getSubscribedClients(resourceUri1)).not.toContain(clientId);
      expect(subscriptionManager.getSubscribedClients(resourceUri2)).not.toContain(clientId);
    });
  });

  describe('Resource validation', () => {
    it('should validate subscribable resource URIs', () => {
      const clientId = 'test-client-1';
      
      // Valid subscribable resources
      expect(() => subscriptionManager.subscribe(clientId, 'vault://recent')).not.toThrow();
      expect(() => subscriptionManager.subscribe(clientId, 'vault://stats')).not.toThrow();
      expect(() => subscriptionManager.subscribe(clientId, 'vault://tags')).not.toThrow();
    });

    it('should reject non-subscribable resource URIs', () => {
      const clientId = 'test-client-1';
      
      // Static resources that don't change frequently
      expect(() => subscriptionManager.subscribe(clientId, 'vault://note/test.md')).toThrow('Resource vault://note/test.md is not subscribable');
      expect(() => subscriptionManager.subscribe(clientId, 'vault://folder/test')).toThrow('Resource vault://folder/test is not subscribable');
    });

    it('should reject invalid resource URIs', () => {
      const clientId = 'test-client-1';
      
      expect(() => subscriptionManager.subscribe(clientId, 'invalid://uri')).toThrow('Invalid resource URI format');
      expect(() => subscriptionManager.subscribe(clientId, 'vault://')).toThrow('Invalid resource URI format');
      expect(() => subscriptionManager.subscribe(clientId, '')).toThrow('Resource URI cannot be empty');
    });
  });
});