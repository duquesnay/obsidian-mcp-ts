/**
 * NotificationManager provides event-driven notifications for cache invalidation and file operations.
 * Implements the Observer pattern to decouple cache management from file operation triggers.
 * 
 * Usage:
 * - Cache implementations register for invalidation events
 * - File operations trigger notifications when content changes
 * - Enables real-time cache updates without tight coupling
 * 
 * Example:
 * ```typescript
 * const notificationManager = NotificationManager.getInstance();
 * 
 * // Register cache for invalidation
 * notificationManager.subscribe(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, (data) => {
 *   cache.invalidate(data.key);
 * });
 * 
 * // Trigger cache invalidation from file operation
 * notificationManager.emit(SUBSCRIPTION_EVENTS.FILE_UPDATED, { path: 'note.md' });
 * ```
 */

import { EventEmitter } from 'events';
import { SUBSCRIPTION_EVENTS, EVENT_EMITTER_DEFAULTS } from '../constants.js';

/**
 * Event data structure for notifications
 */
export interface NotificationData {
  /** The file path or cache key affected */
  key?: string;
  
  /** File path for file-related events */
  path?: string;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Additional event-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * Subscription callback function type
 */
export type NotificationCallback = (data: NotificationData) => void | Promise<void>;

/**
 * Singleton NotificationManager class for handling event-driven notifications
 * across the application.
 */
export class NotificationManager extends EventEmitter {
  private static instance: NotificationManager;
  
  private constructor() {
    super();
    // Set max listeners higher than default to support multiple cache instances
    this.setMaxListeners(EVENT_EMITTER_DEFAULTS.MAX_LISTENERS);
  }
  
  /**
   * Get the singleton instance of NotificationManager
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }
  
  /**
   * Subscribe to a specific event type
   * 
   * @param event - Event type from SUBSCRIPTION_EVENTS
   * @param callback - Function to call when event is emitted
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: NotificationCallback): () => void {
    this.on(event, callback);
    
    // Return unsubscribe function
    return () => {
      this.removeListener(event, callback);
    };
  }
  
  /**
   * Emit a notification event
   * 
   * @param event - Event type from SUBSCRIPTION_EVENTS
   * @param data - Event data
   */
  notify(event: string, data: Partial<NotificationData> = {}): void {
    const notificationData: NotificationData = {
      timestamp: Date.now(),
      ...data
    };
    
    this.emit(event, notificationData);
  }
  
  /**
   * Get current subscriber count for an event
   * 
   * @param event - Event type to check
   * @returns Number of subscribers
   */
  getSubscriberCount(event: string): number {
    return this.listenerCount(event);
  }
  
  /**
   * Remove all subscribers for a specific event
   * 
   * @param event - Event type to clear
   */
  clearSubscribers(event?: string): void {
    if (event) {
      this.removeAllListeners(event);
    } else {
      this.removeAllListeners();
    }
  }
  
  /**
   * Get list of all registered event types
   * 
   * @returns Array of event names
   */
  getRegisteredEvents(): string[] {
    return this.eventNames().map(name => String(name));
  }
  
  // Convenience methods for common events
  
  /**
   * Notify that cache should be invalidated for a specific key
   * 
   * @param key - Cache key to invalidate
   * @param metadata - Additional context
   */
  notifyCacheInvalidation(key: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
      key,
      metadata
    });
  }
  
  /**
   * Notify that a file was created
   * 
   * @param path - File path
   * @param metadata - Additional context
   */
  notifyFileCreated(path: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.FILE_CREATED, {
      path,
      key: path, // Use path as cache key
      metadata
    });
  }
  
  /**
   * Notify that a file was updated
   * 
   * @param path - File path
   * @param metadata - Additional context
   */
  notifyFileUpdated(path: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.FILE_UPDATED, {
      path,
      key: path, // Use path as cache key
      metadata
    });
  }
  
  /**
   * Notify that a file was deleted
   * 
   * @param path - File path
   * @param metadata - Additional context
   */
  notifyFileDeleted(path: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.FILE_DELETED, {
      path,
      key: path, // Use path as cache key
      metadata
    });
  }
  
  /**
   * Notify that a directory was created
   * 
   * @param path - Directory path
   * @param metadata - Additional context
   */
  notifyDirectoryCreated(path: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.DIRECTORY_CREATED, {
      path,
      key: path, // Use path as cache key
      metadata
    });
  }
  
  /**
   * Notify that a directory was deleted
   * 
   * @param path - Directory path
   * @param metadata - Additional context
   */
  notifyDirectoryDeleted(path: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.DIRECTORY_DELETED, {
      path,
      key: path, // Use path as cache key
      metadata
    });
  }
  
  /**
   * Notify that a tag was added to a file
   * 
   * @param filePath - File path where tag was added
   * @param tagName - Tag that was added
   * @param metadata - Additional context
   */
  notifyTagAdded(filePath: string, tagName: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.TAG_ADDED, {
      path: filePath,
      key: filePath,
      metadata: {
        ...metadata,
        tagName
      }
    });
  }
  
  /**
   * Notify that a tag was removed from a file
   * 
   * @param filePath - File path where tag was removed
   * @param tagName - Tag that was removed
   * @param metadata - Additional context
   */
  notifyTagRemoved(filePath: string, tagName: string, metadata?: Record<string, unknown>): void {
    this.notify(SUBSCRIPTION_EVENTS.TAG_REMOVED, {
      path: filePath,
      key: filePath,
      metadata: {
        ...metadata,
        tagName
      }
    });
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static reset(): void {
    if (NotificationManager.instance) {
      NotificationManager.instance.removeAllListeners();
      NotificationManager.instance = undefined as any;
    }
  }
}