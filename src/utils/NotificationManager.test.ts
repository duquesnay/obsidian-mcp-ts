/**
 * Test suite for NotificationManager
 * Tests event-driven notification system for cache invalidation and file operations
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationManager, NotificationData } from './NotificationManager.js';
import { SUBSCRIPTION_EVENTS } from '../constants.js';

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;

  beforeEach(() => {
    // Reset singleton before each test
    NotificationManager.reset();
    notificationManager = NotificationManager.getInstance();
  });

  afterEach(() => {
    // Clean up after tests
    NotificationManager.reset();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = NotificationManager.getInstance();
      const instance2 = NotificationManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(notificationManager);
    });

    test('should create new instance after reset', () => {
      const instance1 = NotificationManager.getInstance();
      NotificationManager.reset();
      const instance2 = NotificationManager.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Event Subscription and Notification', () => {
    test('should subscribe and receive notifications', () => {
      const callback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback);
      notificationManager.notify(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, { key: 'test-key' });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        key: 'test-key',
        timestamp: expect.any(Number)
      });
    });

    test('should support multiple subscribers for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback2);
      
      notificationManager.notify(SUBSCRIPTION_EVENTS.FILE_UPDATED, { path: 'test.md' });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    test('should return unsubscribe function', () => {
      const callback = vi.fn();
      
      const unsubscribe = notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback);
      notificationManager.notify(SUBSCRIPTION_EVENTS.FILE_CREATED, { path: 'new.md' });
      
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Unsubscribe and verify no more notifications
      unsubscribe();
      notificationManager.notify(SUBSCRIPTION_EVENTS.FILE_CREATED, { path: 'another.md' });
      
      expect(callback).toHaveBeenCalledTimes(1); // Still just once
    });

    test('should handle async callbacks', async () => {
      const asyncCallback = vi.fn().mockResolvedValue(undefined);
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_DELETED, asyncCallback);
      notificationManager.notify(SUBSCRIPTION_EVENTS.FILE_DELETED, { path: 'deleted.md' });
      
      // Give async callback time to execute
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(asyncCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Subscriber Management', () => {
    test('should track subscriber count', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(0);
      
      const unsub1 = notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback1);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(1);
      
      const unsub2 = notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback2);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(2);
      
      unsub1();
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(1);
      
      unsub2();
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED)).toBe(0);
    });

    test('should clear all subscribers for specific event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback2);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback1);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(2);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(1);
      
      notificationManager.clearSubscribers(SUBSCRIPTION_EVENTS.FILE_UPDATED);
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(1);
    });

    test('should clear all subscribers when no event specified', () => {
      const callback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, callback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback);
      
      expect(notificationManager.getRegisteredEvents()).toContain(SUBSCRIPTION_EVENTS.FILE_UPDATED);
      expect(notificationManager.getRegisteredEvents()).toContain(SUBSCRIPTION_EVENTS.FILE_CREATED);
      
      notificationManager.clearSubscribers();
      
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_UPDATED)).toBe(0);
      expect(notificationManager.getSubscriberCount(SUBSCRIPTION_EVENTS.FILE_CREATED)).toBe(0);
    });
  });

  describe('Convenience Methods', () => {
    test('should notify cache invalidation', () => {
      const callback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback);
      notificationManager.notifyCacheInvalidation('cache-key', { reason: 'file-updated' });
      
      expect(callback).toHaveBeenCalledWith({
        key: 'cache-key',
        timestamp: expect.any(Number),
        metadata: { reason: 'file-updated' }
      });
    });

    test('should notify file operations', () => {
      const createdCallback = vi.fn();
      const updatedCallback = vi.fn();
      const deletedCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, createdCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, updatedCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_DELETED, deletedCallback);
      
      notificationManager.notifyFileCreated('new.md', { size: 1234 });
      notificationManager.notifyFileUpdated('existing.md', { previousSize: 1000, newSize: 1234 });
      notificationManager.notifyFileDeleted('old.md');
      
      expect(createdCallback).toHaveBeenCalledWith({
        path: 'new.md',
        key: 'new.md',
        timestamp: expect.any(Number),
        metadata: { size: 1234 }
      });
      
      expect(updatedCallback).toHaveBeenCalledWith({
        path: 'existing.md',
        key: 'existing.md',
        timestamp: expect.any(Number),
        metadata: { previousSize: 1000, newSize: 1234 }
      });
      
      expect(deletedCallback).toHaveBeenCalledWith({
        path: 'old.md',
        key: 'old.md',
        timestamp: expect.any(Number)
      });
    });

    test('should notify directory operations', () => {
      const createdCallback = vi.fn();
      const deletedCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_CREATED, createdCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_DELETED, deletedCallback);
      
      notificationManager.notifyDirectoryCreated('new-folder');
      notificationManager.notifyDirectoryDeleted('old-folder');
      
      expect(createdCallback).toHaveBeenCalledWith({
        path: 'new-folder',
        key: 'new-folder',
        timestamp: expect.any(Number)
      });
      
      expect(deletedCallback).toHaveBeenCalledWith({
        path: 'old-folder',
        key: 'old-folder',
        timestamp: expect.any(Number)
      });
    });

    test('should notify tag operations', () => {
      const addedCallback = vi.fn();
      const removedCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.TAG_ADDED, addedCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.TAG_REMOVED, removedCallback);
      
      notificationManager.notifyTagAdded('note.md', 'project');
      notificationManager.notifyTagRemoved('note.md', 'old-tag');
      
      expect(addedCallback).toHaveBeenCalledWith({
        path: 'note.md',
        key: 'note.md',
        timestamp: expect.any(Number),
        metadata: { tagName: 'project' }
      });
      
      expect(removedCallback).toHaveBeenCalledWith({
        path: 'note.md',
        key: 'note.md',
        timestamp: expect.any(Number),
        metadata: { tagName: 'old-tag' }
      });
    });
  });

  describe('Event Registration Tracking', () => {
    test('should track registered events', () => {
      const callback = vi.fn();
      
      expect(notificationManager.getRegisteredEvents()).toEqual([]);
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback);
      
      const events = notificationManager.getRegisteredEvents();
      expect(events).toContain(SUBSCRIPTION_EVENTS.FILE_CREATED);
      expect(events).toContain(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED);
      expect(events).toHaveLength(2);
    });
  });

  describe('Data Structure', () => {
    test('should include timestamp in all notifications', () => {
      const callback = vi.fn();
      const beforeTime = Date.now();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback);
      notificationManager.notify(SUBSCRIPTION_EVENTS.FILE_CREATED, { path: 'test.md' });
      
      const afterTime = Date.now();
      const callData = callback.mock.calls[0][0] as NotificationData;
      
      expect(callData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(callData.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should merge provided data with defaults', () => {
      const callback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, callback);
      notificationManager.notify(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
        key: 'test-key',
        metadata: { reason: 'test' }
      });
      
      const callData = callback.mock.calls[0][0] as NotificationData;
      expect(callData).toEqual({
        key: 'test-key',
        timestamp: expect.any(Number),
        metadata: { reason: 'test' }
      });
    });
  });
});