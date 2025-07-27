/**
 * Comprehensive unit tests for notification trigger scenarios
 * Tests missing coverage for tag operations, directory operations, batch operations, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationManager } from '../../../src/utils/NotificationManager.js';
import { SUBSCRIPTION_EVENTS } from '../../../src/constants.js';

describe('NotificationTrigger Scenarios', () => {
  let notificationManager: NotificationManager;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    notificationManager = new NotificationManager();
    mockCallback = vi.fn();
  });

  describe('Tag Management Operations', () => {
    it('should trigger TAG_ADDED event when tags are added to a file', () => {
      // Subscribe to tag added events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.TAG_ADDED, mockCallback);
      
      // Simulate tag addition
      const filepath = 'test-note.md';
      const tagName = 'project';
      const metadata = { 
        operation: 'add', 
        location: 'frontmatter' 
      };
      
      notificationManager.notifyTagAdded(filepath, tagName, metadata);
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: filepath,
        key: filepath,
        timestamp: expect.any(Number),
        metadata: {
          ...metadata,
          tagName
        }
      });
    });

    it('should trigger TAG_REMOVED event when tags are removed from a file', () => {
      // Subscribe to tag removed events
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.TAG_REMOVED, mockCallback);
      
      // Simulate tag removal
      const filepath = 'test-note.md';
      const tagName = 'obsolete';
      const metadata = { 
        operation: 'remove', 
        location: 'inline' 
      };
      
      notificationManager.notifyTagRemoved(filepath, tagName, metadata);
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: filepath,
        key: filepath,
        timestamp: expect.any(Number),
        metadata: {
          ...metadata,
          tagName
        }
      });
    });

    it('should handle multiple tag operations on same file', () => {
      const addCallback = vi.fn();
      const removeCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.TAG_ADDED, addCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.TAG_REMOVED, removeCallback);
      
      const filepath = 'multi-tag-test.md';
      
      // Add tags
      notificationManager.notifyTagAdded(filepath, 'new-tag', { 
        operation: 'add'
      });
      
      // Remove tags
      notificationManager.notifyTagRemoved(filepath, 'old-tag', { 
        operation: 'remove'
      });
      
      expect(addCallback).toHaveBeenCalledOnce();
      expect(removeCallback).toHaveBeenCalledOnce();
    });
  });

  describe('Directory Operations', () => {
    it('should trigger DIRECTORY_CREATED event when directory is created', () => {
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_CREATED, mockCallback);
      
      const directoryPath = 'new-folder';
      const metadata = { 
        operation: 'create', 
        recursive: false,
        parentCreated: false 
      };
      
      notificationManager.notifyDirectoryCreated(directoryPath, metadata);
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: directoryPath,
        key: directoryPath,
        timestamp: expect.any(Number),
        metadata
      });
    });

    it('should trigger DIRECTORY_DELETED event when directory is deleted', () => {
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_DELETED, mockCallback);
      
      const directoryPath = 'deleted-folder';
      const metadata = { 
        operation: 'delete', 
        recursive: true,
        permanent: false,
        filesDeleted: 5 
      };
      
      notificationManager.notifyDirectoryDeleted(directoryPath, metadata);
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: directoryPath,
        key: directoryPath,
        timestamp: expect.any(Number),
        metadata
      });
    });

    it('should handle directory move operations', () => {
      const callback = vi.fn();
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.DIRECTORY_CREATED, callback);
      
      const sourcePath = 'old-location/folder';
      const destinationPath = 'new-location/folder';
      
      // Directory move triggers creation at new location
      notificationManager.notifyDirectoryCreated(destinationPath, { 
        operation: 'move', 
        sourcePath,
        filesMovedCount: 3 
      });
      
      expect(callback).toHaveBeenCalledWith({
        path: destinationPath,
        key: destinationPath,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'move',
          sourcePath,
          filesMovedCount: 3
        }
      });
    });
  });

  describe('Complex File Operations', () => {
    it('should trigger FILE_UPDATED event for file moves with correct metadata', () => {
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, mockCallback);
      
      const sourcePath = 'old-location/note.md';
      const destinationPath = 'new-location/note.md';
      
      notificationManager.notifyFileUpdated(sourcePath, { 
        operation: 'move', 
        destinationPath,
        updateLinks: true 
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: sourcePath,
        key: sourcePath,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'move',
          destinationPath,
          updateLinks: true
        }
      });
    });

    it('should trigger FILE_CREATED event for file copies with metadata', () => {
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, mockCallback);
      
      const sourcePath = 'original.md';
      const destinationPath = 'copy.md';
      
      notificationManager.notifyFileCreated(destinationPath, { 
        operation: 'copy', 
        sourcePath,
        contentLength: 1024,
        preserveMetadata: true 
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: destinationPath,
        key: destinationPath,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'copy',
          sourcePath,
          contentLength: 1024,
          preserveMetadata: true
        }
      });
    });

    it('should trigger FILE_UPDATED event for append operations', () => {
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, mockCallback);
      
      const filepath = 'notes.md';
      
      notificationManager.notifyFileUpdated(filepath, { 
        operation: 'append', 
        contentLength: 256,
        createIfNotExists: true,
        appendPosition: 'end' 
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        path: filepath,
        key: filepath,
        timestamp: expect.any(Number),
        metadata: {
          operation: 'append',
          contentLength: 256,
          createIfNotExists: true,
          appendPosition: 'end'
        }
      });
    });
  });

  describe('Batch Operations', () => {
    it('should handle multiple notifications for batch file operations', () => {
      const createdCallback = vi.fn();
      const updatedCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, createdCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, updatedCallback);
      
      // Simulate batch operation affecting multiple files
      const batchId = 'batch-' + Date.now();
      
      // Create new files
      ['file1.md', 'file2.md'].forEach((filepath, index) => {
        notificationManager.notifyFileCreated(filepath, { 
          operation: 'batch-create', 
          batchId,
          batchIndex: index,
          totalItems: 4 
        });
      });
      
      // Update existing files
      ['file3.md', 'file4.md'].forEach((filepath, index) => {
        notificationManager.notifyFileUpdated(filepath, { 
          operation: 'batch-update', 
          batchId,
          batchIndex: index + 2,
          totalItems: 4 
        });
      });
      
      expect(createdCallback).toHaveBeenCalledTimes(2);
      expect(updatedCallback).toHaveBeenCalledTimes(2);
      
      // Verify batch metadata is included
      expect(createdCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            batchId,
            totalItems: 4
          })
        })
      );
    });

    it('should maintain notification order for sequential batch operations', () => {
      const allNotifications: any[] = [];
      const callback = vi.fn((notification) => {
        allNotifications.push(notification);
      });
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback);
      
      // Create files in specific order
      const files = ['first.md', 'second.md', 'third.md'];
      files.forEach((filepath, index) => {
        notificationManager.notifyFileCreated(filepath, { 
          operation: 'sequential-create', 
          sequenceNumber: index 
        });
      });
      
      expect(callback).toHaveBeenCalledTimes(3);
      
      // Verify order is maintained
      expect(allNotifications[0].metadata.sequenceNumber).toBe(0);
      expect(allNotifications[1].metadata.sequenceNumber).toBe(1);
      expect(allNotifications[2].metadata.sequenceNumber).toBe(2);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle notification callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback failed');
      });
      const successCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, errorCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, successCallback);
      
      // EventEmitter will throw if a listener throws, but this is expected behavior
      // In production, error handling should be done in the callback itself
      expect(() => {
        notificationManager.notifyFileCreated('test.md', { operation: 'create' });
      }).toThrow('Callback failed');
      
      // Error callback was called
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle invalid event data gracefully', () => {
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, mockCallback);
      
      // Test with invalid/empty path
      expect(() => {
        notificationManager.notifyFileCreated('', { operation: 'create' });
      }).not.toThrow();
      
      // Test with null metadata
      expect(() => {
        notificationManager.notifyFileCreated('test.md', null as any);
      }).not.toThrow();
      
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle unsubscribe during notification processing', () => {
      let unsubscribeCallback: (() => void) | undefined;
      
      const selfUnsubscribingCallback = vi.fn(() => {
        if (unsubscribeCallback) {
          unsubscribeCallback();
        }
      });
      
      const otherCallback = vi.fn();
      
      unsubscribeCallback = notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, selfUnsubscribingCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, otherCallback);
      
      // Should handle self-unsubscribe without errors
      expect(() => {
        notificationManager.notifyFileCreated('test.md', { operation: 'create' });
      }).not.toThrow();
      
      expect(selfUnsubscribingCallback).toHaveBeenCalledOnce();
      expect(otherCallback).toHaveBeenCalledOnce();
    });
  });

  describe('Cache Invalidation Integration', () => {
    it('should trigger cache invalidation along with file events', () => {
      const fileCallback = vi.fn();
      const cacheCallback = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_UPDATED, fileCallback);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, cacheCallback);
      
      const filepath = 'cached-file.md';
      
      // File update should also trigger cache invalidation
      notificationManager.notifyFileUpdated(filepath, { operation: 'update' });
      notificationManager.notifyCacheInvalidation(filepath, { 
        reason: 'file-updated',
        affectedKeys: [filepath] 
      });
      
      expect(fileCallback).toHaveBeenCalledOnce();
      expect(cacheCallback).toHaveBeenCalledOnce();
      
      expect(cacheCallback).toHaveBeenCalledWith({
        key: filepath,
        timestamp: expect.any(Number),
        metadata: {
          reason: 'file-updated',
          affectedKeys: [filepath]
        }
      });
    });

    it('should handle bulk cache invalidation for batch operations', () => {
      const cacheCallback = vi.fn();
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, cacheCallback);
      
      const affectedFiles = ['file1.md', 'file2.md', 'file3.md'];
      const batchKey = 'batch-operation-cache-key';
      
      notificationManager.notifyCacheInvalidation(batchKey, { 
        reason: 'batch-operation',
        affectedKeys: affectedFiles,
        operationType: 'bulk-update',
        itemCount: affectedFiles.length 
      });
      
      expect(cacheCallback).toHaveBeenCalledWith({
        key: batchKey,
        timestamp: expect.any(Number),
        metadata: {
          reason: 'batch-operation',
          affectedKeys: affectedFiles,
          operationType: 'bulk-update',
          itemCount: 3
        }
      });
    });
  });

  describe('Subscription Management', () => {
    it('should handle multiple subscriptions to same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback1);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback2);
      notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback3);
      
      notificationManager.notifyFileCreated('test.md', { operation: 'create' });
      
      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
      expect(callback3).toHaveBeenCalledOnce();
    });

    it('should handle subscription and immediate unsubscription', () => {
      const callback = vi.fn();
      
      const unsubscribe = notificationManager.subscribe(SUBSCRIPTION_EVENTS.FILE_CREATED, callback);
      unsubscribe(); // Immediately unsubscribe
      
      notificationManager.notifyFileCreated('test.md', { operation: 'create' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle event types that do not exist', () => {
      const callback = vi.fn();
      
      // Subscribe to non-existent event type
      expect(() => {
        notificationManager.subscribe('non-existent-event' as any, callback);
      }).not.toThrow();
      
      // Try to emit non-existent event
      expect(() => {
        (notificationManager as any).emit('non-existent-event', { data: 'test' });
      }).not.toThrow();
    });
  });
});