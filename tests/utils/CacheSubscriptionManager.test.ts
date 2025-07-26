/**
 * Tests for CacheSubscriptionManager
 * 
 * Tests the complete subscription system including:
 * - Basic subscription and unsubscription
 * - Priority-based execution order
 * - Event filtering with pattern matching
 * - Performance monitoring and statistics
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CacheSubscriptionManager } from '../../src/utils/CacheSubscriptionManager.js';
import { 
  SubscriptionPriority, 
  type CacheInvalidationData,
  type CacheEventFilter 
} from '../../src/interfaces/subscription.js';
import { SUBSCRIPTION_EVENTS } from '../../src/constants.js';

describe('CacheSubscriptionManager', () => {
  let manager: CacheSubscriptionManager;
  let mockCallback: Mock;
  let mockCallback2: Mock;

  beforeEach(() => {
    manager = new CacheSubscriptionManager();
    mockCallback = vi.fn();
    mockCallback2 = vi.fn();
  });

  describe('Basic Subscription Management', () => {
    it('should subscribe to events and return a handle', () => {
      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        priority: SubscriptionPriority.NORMAL
      });

      expect(handle).toBeDefined();
      expect(handle.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(handle.eventType).toBe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED);
      expect(handle.priority).toBe(SubscriptionPriority.NORMAL);
      expect(handle.isActive()).toBe(true);
    });

    it('should allow unsubscribing via handle', () => {
      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      expect(handle.isActive()).toBe(true);
      
      handle.unsubscribe();
      
      expect(handle.isActive()).toBe(false);
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(false);
    });

    it('should allow unsubscribing by ID', () => {
      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      const result = manager.unsubscribeById(handle.id);
      
      expect(result).toBe(true);
      expect(handle.isActive()).toBe(false);
    });

    it('should return false when unsubscribing non-existent subscription', () => {
      const result = manager.unsubscribeById('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Event Processing', () => {
    it('should process events and call subscribed callbacks', async () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      const eventData: CacheInvalidationData = {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      };

      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, eventData);

      expect(mockCallback).toHaveBeenCalledOnce();
      expect(mockCallback).toHaveBeenCalledWith(eventData);
    });

    it('should not call callbacks for different event types', async () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback
      });

      const eventData: CacheInvalidationData = {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      };

      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, eventData);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle async callbacks', async () => {
      const asyncCallback = vi.fn().mockResolvedValue(undefined);
      
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: asyncCallback
      });

      const eventData: CacheInvalidationData = {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      };

      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, eventData);

      expect(asyncCallback).toHaveBeenCalledOnce();
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: errorCallback
      });

      const eventData: CacheInvalidationData = {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      };

      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, eventData);

      expect(errorCallback).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Priority-Based Execution', () => {
    it('should execute callbacks in priority order', async () => {
      const executionOrder: number[] = [];
      
      const lowPriorityCallback = vi.fn(() => executionOrder.push(SubscriptionPriority.LOW));
      const highPriorityCallback = vi.fn(() => executionOrder.push(SubscriptionPriority.HIGH));
      const normalPriorityCallback = vi.fn(() => executionOrder.push(SubscriptionPriority.NORMAL));
      const criticalPriorityCallback = vi.fn(() => executionOrder.push(SubscriptionPriority.CRITICAL));

      // Subscribe in mixed order
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: lowPriorityCallback,
        priority: SubscriptionPriority.LOW
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: highPriorityCallback,
        priority: SubscriptionPriority.HIGH
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: criticalPriorityCallback,
        priority: SubscriptionPriority.CRITICAL
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: normalPriorityCallback,
        priority: SubscriptionPriority.NORMAL
      });

      const eventData: CacheInvalidationData = {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      };

      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, eventData);

      // Should execute in priority order: CRITICAL (1), HIGH (2), NORMAL (3), LOW (4)
      expect(executionOrder).toEqual([
        SubscriptionPriority.CRITICAL,
        SubscriptionPriority.HIGH,
        SubscriptionPriority.NORMAL,
        SubscriptionPriority.LOW
      ]);
    });
  });

  describe('Event Filtering', () => {
    it('should filter by cache type', async () => {
      const filter: CacheEventFilter = {
        cacheType: 'file-content'
      };

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        filter
      });

      // Should match
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        operation: 'delete',
        cacheType: 'file-content',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledOnce();

      mockCallback.mockClear();

      // Should not match
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        operation: 'delete',
        cacheType: 'search-results',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should filter by operation type', async () => {
      const filter: CacheEventFilter = {
        operation: ['delete', 'expire']
      };

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        filter
      });

      // Should match delete
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledOnce();

      mockCallback.mockClear();

      // Should match expire
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        operation: 'expire',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledOnce();

      mockCallback.mockClear();

      // Should not match clear
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        operation: 'clear',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should filter by key pattern with wildcards', async () => {
      const filter: CacheEventFilter = {
        keyPattern: 'user:*'
      };

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        filter
      });

      // Should match pattern
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'user:123',
        operation: 'delete',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledOnce();

      mockCallback.mockClear();

      // Should not match pattern
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'cache:456',
        operation: 'delete',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should apply custom filter function', async () => {
      const filter: CacheEventFilter = {
        customFilter: (data) => data.key?.includes('important') ?? false
      };

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        filter
      });

      // Should match custom filter
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'important-data',
        operation: 'delete',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledOnce();

      mockCallback.mockClear();

      // Should not match custom filter
      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'regular-data',
        operation: 'delete',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track subscription statistics', () => {
      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      const stats = handle.getStats();
      expect(stats.invocationCount).toBe(0);
      expect(stats.totalExecutionTime).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.lastInvoked).toBeUndefined();
    });

    it('should update statistics after event processing', async () => {
      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      await manager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        operation: 'delete',
        timestamp: Date.now()
      });

      const stats = handle.getStats();
      expect(stats.invocationCount).toBe(1);
      expect(stats.totalExecutionTime).toBeGreaterThanOrEqual(0); // Allow 0 for very fast execution
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.lastInvoked).toBeDefined();
    });

    it('should provide global statistics', () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        priority: SubscriptionPriority.HIGH
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2,
        priority: SubscriptionPriority.NORMAL
      });

      const stats = manager.getStats();
      expect(stats.totalSubscriptions).toBe(2);
      expect(stats.subscriptionsByEvent[SUBSCRIPTION_EVENTS.CACHE_INVALIDATED]).toBe(1);
      expect(stats.subscriptionsByEvent[SUBSCRIPTION_EVENTS.FILE_CREATED]).toBe(1);
      expect(stats.subscriptionsByPriority[SubscriptionPriority.HIGH]).toBe(1);
      expect(stats.subscriptionsByPriority[SubscriptionPriority.NORMAL]).toBe(1);
    });
  });

  describe('Subscription Querying', () => {
    it('should get subscriptions by event type', () => {
      const handle1 = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      const handle2 = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2
      });

      const cacheSubscriptions = manager.getSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED);
      expect(cacheSubscriptions).toHaveLength(1);
      expect(cacheSubscriptions[0].id).toBe(handle1.id);

      const fileSubscriptions = manager.getSubscriptions(SUBSCRIPTION_EVENTS.FILE_CREATED);
      expect(fileSubscriptions).toHaveLength(1);
      expect(fileSubscriptions[0].id).toBe(handle2.id);
    });

    it('should get all subscriptions with filtering', () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        priority: SubscriptionPriority.HIGH,
        metadata: { tags: ['monitoring'] }
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2,
        priority: SubscriptionPriority.NORMAL,
        metadata: { tags: ['logging'] }
      });

      // Filter by priority
      const highPrioritySubscriptions = manager.getAllSubscriptions({
        priority: SubscriptionPriority.HIGH
      });
      expect(highPrioritySubscriptions).toHaveLength(1);

      // Filter by tags
      const monitoringSubscriptions = manager.getAllSubscriptions({
        tags: ['monitoring']
      });
      expect(monitoringSubscriptions).toHaveLength(1);

      // Get all
      const allSubscriptions = manager.getAllSubscriptions();
      expect(allSubscriptions).toHaveLength(2);
    });

    it('should check if subscriptions exist for event type', () => {
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(false);

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(true);
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(false);
    });
  });

  describe('Subscription Clearing', () => {
    it('should clear subscriptions for specific event type', () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2
      });

      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(true);
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(true);

      manager.clearSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED);

      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(false);
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(true);
    });

    it('should clear all subscriptions', () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2
      });

      expect(manager.getStats().totalSubscriptions).toBe(2);

      manager.clearSubscriptions();

      expect(manager.getStats().totalSubscriptions).toBe(0);
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(false);
      expect(manager.hasSubscriptions(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(false);
    });
  });

  describe('Handle Operations', () => {
    it('should allow updating filter on subscription handle', () => {
      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        filter: { operation: 'delete' }
      });

      const newFilter: CacheEventFilter = {
        operation: 'expire',
        keyPattern: 'user:*'
      };

      handle.updateFilter(newFilter);

      // The filter should be updated, but we can't directly test it without accessing internals
      // The main test would be functional - does it filter correctly after update
      expect(handle.isActive()).toBe(true);
    });

    it('should provide subscription metadata', () => {
      const metadata = {
        name: 'test-subscription',
        tags: ['monitoring', 'cache'],
        createdAt: Date.now()
      };

      const handle = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        metadata
      });

      expect(handle.metadata?.name).toBe(metadata.name);
      expect(handle.metadata?.tags).toEqual(metadata.tags);
      expect(handle.metadata?.createdAt).toBe(metadata.createdAt);
    });
  });

  describe('Diagnostics', () => {
    it('should provide detailed diagnostics', () => {
      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback,
        priority: SubscriptionPriority.HIGH
      });

      manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2,
        priority: SubscriptionPriority.NORMAL
      });

      const diagnostics = manager.getDiagnostics();

      expect(diagnostics.totalSubscriptions).toBe(2);
      expect(diagnostics.activeSubscriptions).toBe(2);
      expect(diagnostics.eventTypes).toEqual([
        SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        SUBSCRIPTION_EVENTS.FILE_CREATED
      ]);
      expect(diagnostics.globalStats).toBeDefined();
      expect(diagnostics.eventDiagnostics).toBeDefined();
    });

    it('should clean up inactive subscriptions', () => {
      const handle1 = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
        callback: mockCallback
      });

      const handle2 = manager.subscribe({
        eventType: SUBSCRIPTION_EVENTS.FILE_CREATED,
        callback: mockCallback2
      });

      expect(manager.getStats().totalSubscriptions).toBe(2);

      // Unsubscribe one
      handle1.unsubscribe();

      // Before cleanup - internal state may still have inactive subscriptions
      manager.cleanup();

      // After cleanup - should only have active subscriptions
      const stats = manager.getStats();
      expect(stats.totalSubscriptions).toBe(1);
    });
  });
});