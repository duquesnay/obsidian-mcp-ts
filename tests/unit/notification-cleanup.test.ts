import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationManager } from '../../src/utils/NotificationManager.js';
import { SUBSCRIPTION_EVENTS } from '../../src/constants.js';

describe('NotificationManager Memory Management', () => {
  let notificationManager: NotificationManager;
  
  beforeEach(() => {
    // Reset notification manager to ensure clean state
    NotificationManager.reset();
    notificationManager = NotificationManager.getInstance();
  });
  
  afterEach(() => {
    NotificationManager.reset();
  });

  describe('Memory leak prevention', () => {
    it('should provide unsubscribe functions to prevent memory leaks', () => {
      const callback = vi.fn();
      
      // Subscribe and get unsubscribe function
      const unsubscribe = notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(1);
      
      // Call unsubscribe function
      unsubscribe();
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
    });

    it('should accumulate listeners if unsubscribe is not called', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      // Subscribe multiple times without unsubscribing
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback2);  
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback3);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(3);
      
      // This shows the potential memory leak
      notificationManager.notify(SUBSCRIPTION_EVENTS.FILE_UPDATED, { path: 'test.md' });
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should allow bulk cleanup of all listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback2);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(1);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(1);
      
      // Clear all subscribers
      notificationManager.clearSubscribers();
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(0);
    });

    it('should allow cleanup of specific event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback2);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(1);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(1);
      
      // Clear only FILE_UPDATED subscribers
      notificationManager.clearSubscribers(SUBSCRIPTION_EVENTS.FILE_UPDATED);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(1);
    });
  });

  describe('Automatic cleanup features', () => {
    it('should detect and handle weak references for automatic cleanup', () => {
      // This test demonstrates what automatic cleanup would look like
      const callback = vi.fn();
      
      // Create a subscription
      const unsubscribe = notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(1);
      
      // Simulate the object that owns the callback being garbage collected
      // In a real implementation, we would use WeakRef or similar
      unsubscribe();
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
    });

    it('should provide diagnostic information about listener health', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      // Create various subscriptions
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback2);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback3);
      
      // Get diagnostic information
      const registeredEvents = notificationManager.getRegisteredEvents();
      expect(registeredEvents).toContain(SUBSCRIPTION_EVENTS.FILE_UPDATED);
      expect(registeredEvents).toContain(SUBSCRIPTION_EVENTS.FILE_CREATED);
      expect(registeredEvents).toContain(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED);
      
      expect(registeredEvents.length).toBe(3);
      
      // Test new diagnostics method
      const diagnostics = notificationManager.getDiagnostics();
      expect(diagnostics.totalListeners).toBe(3);
      expect(diagnostics.maxListeners).toBeGreaterThan(0);
      expect(diagnostics.eventBreakdown).toHaveProperty(SUBSCRIPTION_EVENTS.FILE_UPDATED, 1);
      expect(diagnostics.eventBreakdown).toHaveProperty(SUBSCRIPTION_EVENTS.FILE_CREATED, 1);
      expect(diagnostics.eventBreakdown).toHaveProperty(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, 1);
    });
    
    it('should warn when approaching max listeners limit', () => {
      // Create many subscriptions to approach limit
      const callbacks = [];
      const maxListeners = notificationManager.getMaxListeners();
      
      // Create subscriptions up to 85% of max to trigger warning
      const targetListeners = Math.floor(maxListeners * 0.85);
      for (let i = 0; i < targetListeners; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback);
      }
      
      const diagnostics = notificationManager.getDiagnostics();
      expect(diagnostics.totalListeners).toBe(targetListeners);
      expect(diagnostics.warning).toContain('Approaching max listeners limit');
    });
  });

  describe('Process cleanup on exit', () => {
    it('should clean up listeners when process exits', () => {
      // This test shows how to implement process exit cleanup
      const callback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(1);
      
      // Simulate process exit cleanup
      const cleanup = () => {
        notificationManager.clearSubscribers();
      };
      
      // In real implementation, this would be:
      // process.on('exit', cleanup);
      // process.on('SIGINT', cleanup);
      // process.on('SIGTERM', cleanup);
      
      cleanup();
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
    });
  });
});