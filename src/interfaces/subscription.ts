/**
 * Subscription interfaces for cache change events
 * 
 * Provides type-safe event subscription system for cache invalidation and other events.
 * Extends the existing NotificationManager infrastructure with cache-specific features.
 * 
 * @example
 * ```typescript
 * // Subscribe to all cache invalidations
 * const handle = subscriptionManager.subscribe({
 *   eventType: 'cache:invalidated',
 *   callback: (data) => console.log('Cache invalidated:', data.key),
 *   priority: SubscriptionPriority.HIGH
 * });
 * 
 * // Subscribe with filtering
 * const handle2 = subscriptionManager.subscribe({
 *   eventType: 'cache:invalidated',
 *   callback: (data) => console.log('File cache cleared:', data.key),
 *   filter: {
 *     cacheType: 'file-content',
 *     operation: ['delete', 'clear']
 *   }
 * });
 * 
 * // Unsubscribe when done
 * handle.unsubscribe();
 * ```
 */

import type { NotificationData } from '../utils/NotificationManager.js';

/**
 * Cache-specific invalidation data extending base notification data
 */
export interface CacheInvalidationData extends NotificationData {
  /** Type of cache operation that triggered the invalidation */
  operation: CacheOperation;
  
  /** Type of cache (e.g., 'file-content', 'search-results', 'metadata') */
  cacheType?: string;
  
  /** Unique identifier for the cache instance */
  instanceId?: string;
  
  /** Size of the cache after the operation */
  cacheSize?: number;
  
  /** Whether this was an automatic cleanup operation */
  isAutomatic?: boolean;
}

/**
 * Cache operation types that trigger invalidation events
 */
export type CacheOperation = 'delete' | 'clear' | 'expire' | 'evict' | 'set' | 'get';

/**
 * Subscription priority levels for event processing order
 */
export enum SubscriptionPriority {
  /** Critical system operations that must execute first */
  CRITICAL = 1,
  
  /** High priority operations like cache maintenance */
  HIGH = 2,
  
  /** Normal priority for most application logic */
  NORMAL = 3,
  
  /** Low priority for non-essential operations like logging */
  LOW = 4
}

/**
 * Filter configuration for subscription events
 */
export interface CacheEventFilter {
  /** Filter by cache type (supports wildcards with *) */
  cacheType?: string | string[];
  
  /** Filter by cache instance ID */
  instanceId?: string | string[];
  
  /** Filter by specific operations */
  operation?: CacheOperation | CacheOperation[];
  
  /** Filter by key patterns (supports wildcards with * and ?) */
  keyPattern?: string | string[];
  
  /** Custom filter function for complex logic */
  customFilter?: (data: CacheInvalidationData) => boolean;
}

/**
 * Subscription configuration
 */
export interface CacheSubscriptionConfig {
  /** Event type to subscribe to */
  eventType: string;
  
  /** Callback function to execute when event occurs */
  callback: CacheSubscriptionCallback;
  
  /** Optional filter to limit which events trigger the callback */
  filter?: CacheEventFilter;
  
  /** Subscription priority for execution order */
  priority?: SubscriptionPriority;
  
  /** Optional metadata for debugging and management */
  metadata?: {
    /** Human-readable description of the subscription */
    name?: string;
    
    /** Tags for grouping and management */
    tags?: string[];
    
    /** When the subscription was created */
    createdAt?: number;
  };
}

/**
 * Callback function type for cache subscriptions
 */
export type CacheSubscriptionCallback = (data: CacheInvalidationData) => void | Promise<void>;

/**
 * Handle for managing a subscription
 */
export interface CacheSubscriptionHandle {
  /** Unique identifier for the subscription */
  readonly id: string;
  
  /** Event type being subscribed to */
  readonly eventType: string;
  
  /** Subscription priority */
  readonly priority: SubscriptionPriority;
  
  /** Subscription metadata */
  readonly metadata?: CacheSubscriptionConfig['metadata'];
  
  /** Remove this subscription */
  unsubscribe(): void;
  
  /** Check if subscription is still active */
  isActive(): boolean;
  
  /** Update subscription filter without recreating */
  updateFilter(filter: CacheEventFilter): void;
  
  /** Get subscription statistics */
  getStats(): {
    /** Number of times callback was invoked */
    invocationCount: number;
    
    /** Last time callback was invoked */
    lastInvoked?: number;
    
    /** Total time spent in callback execution (ms) */
    totalExecutionTime: number;
    
    /** Average execution time per invocation (ms) */
    averageExecutionTime: number;
  };
}

/**
 * Core interface for cache subscription management
 */
export interface ICacheSubscriptionManager {
  /**
   * Subscribe to cache events
   * 
   * @param config - Subscription configuration
   * @returns Handle for managing the subscription
   */
  subscribe(config: CacheSubscriptionConfig): CacheSubscriptionHandle;
  
  /**
   * Unsubscribe from a specific event
   * 
   * @param handle - Subscription handle to remove
   * @returns True if subscription was removed, false if not found
   */
  unsubscribe(handle: CacheSubscriptionHandle): boolean;
  
  /**
   * Unsubscribe by subscription ID
   * 
   * @param subscriptionId - ID of subscription to remove
   * @returns True if subscription was removed, false if not found
   */
  unsubscribeById(subscriptionId: string): boolean;
  
  /**
   * Get all active subscriptions for an event type
   * 
   * @param eventType - Event type to query
   * @returns Array of subscription handles
   */
  getSubscriptions(eventType: string): CacheSubscriptionHandle[];
  
  /**
   * Get all active subscriptions with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @returns Array of subscription handles
   */
  getAllSubscriptions(filter?: {
    eventType?: string;
    priority?: SubscriptionPriority;
    tags?: string[];
  }): CacheSubscriptionHandle[];
  
  /**
   * Clear all subscriptions for a specific event type
   * 
   * @param eventType - Event type to clear (optional, clears all if not provided)
   */
  clearSubscriptions(eventType?: string): void;
  
  /**
   * Check if there are any active subscriptions for an event type
   * 
   * @param eventType - Event type to check
   * @returns True if there are active subscriptions
   */
  hasSubscriptions(eventType: string): boolean;
  
  /**
   * Get subscription manager statistics
   */
  getStats(): {
    /** Total number of active subscriptions */
    totalSubscriptions: number;
    
    /** Subscriptions grouped by event type */
    subscriptionsByEvent: Record<string, number>;
    
    /** Subscriptions grouped by priority */
    subscriptionsByPriority: Record<SubscriptionPriority, number>;
    
    /** Total number of events processed */
    totalEventsProcessed: number;
    
    /** Average event processing time (ms) */
    averageProcessingTime: number;
  };
}

/**
 * Interface for cache implementations that support subscriptions
 */
export interface ICacheWithSubscriptions<K, V> {
  /**
   * Set the subscription manager for this cache instance
   * 
   * @param manager - Subscription manager to use
   * @param instanceId - Unique identifier for this cache instance
   */
  setSubscriptionManager(manager: ICacheSubscriptionManager, instanceId: string): void;
  
  /**
   * Get the current subscription manager
   */
  getSubscriptionManager(): ICacheSubscriptionManager | null;
  
  /**
   * Get the cache instance ID
   */
  getInstanceId(): string | null;
  
  /**
   * Enable or disable subscription notifications
   * 
   * @param enabled - Whether to send notifications
   */
  setSubscriptionEnabled(enabled: boolean): void;
  
  /**
   * Check if subscription notifications are enabled
   */
  isSubscriptionEnabled(): boolean;
}

/**
 * Type guard to check if data is cache invalidation data
 */
export function isCacheInvalidationData(data: NotificationData): data is CacheInvalidationData {
  return 'operation' in data && typeof data.operation === 'string';
}

/**
 * Type guard to check if an object is a valid cache operation
 */
export function isCacheOperation(value: unknown): value is CacheOperation {
  const validOperations: CacheOperation[] = ['delete', 'clear', 'expire', 'evict', 'set', 'get'];
  return typeof value === 'string' && validOperations.includes(value as CacheOperation);
}

/**
 * Utility for pattern matching cache keys and types
 */
export class CachePatternMatcher {
  /**
   * Check if a string matches a pattern (supports * and ? wildcards)
   * 
   * @param pattern - Pattern to match against (supports * for any chars, ? for single char)
   * @param value - Value to test
   * @returns True if value matches pattern
   */
  static matches(pattern: string, value: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // * becomes .*
      .replace(/\?/g, '.'); // ? becomes .
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }
  
  /**
   * Check if a value matches any pattern in an array
   * 
   * @param patterns - Array of patterns to test
   * @param value - Value to test
   * @returns True if value matches any pattern
   */
  static matchesAny(patterns: string[], value: string): boolean {
    return patterns.some(pattern => this.matches(pattern, value));
  }
  
  /**
   * Check if filter criteria match cache invalidation data
   * 
   * @param filter - Filter criteria
   * @param data - Cache invalidation data
   * @returns True if data matches filter
   */
  static matchesFilter(filter: CacheEventFilter, data: CacheInvalidationData): boolean {
    // Check cache type filter
    if (filter.cacheType && data.cacheType) {
      const cacheTypes = Array.isArray(filter.cacheType) ? filter.cacheType : [filter.cacheType];
      if (!this.matchesAny(cacheTypes, data.cacheType)) {
        return false;
      }
    }
    
    // Check instance ID filter
    if (filter.instanceId && data.instanceId) {
      const instanceIds = Array.isArray(filter.instanceId) ? filter.instanceId : [filter.instanceId];
      if (!instanceIds.includes(data.instanceId)) {
        return false;
      }
    }
    
    // Check operation filter
    if (filter.operation) {
      const operations = Array.isArray(filter.operation) ? filter.operation : [filter.operation];
      if (!operations.includes(data.operation)) {
        return false;
      }
    }
    
    // Check key pattern filter
    if (filter.keyPattern && data.key) {
      const keyPatterns = Array.isArray(filter.keyPattern) ? filter.keyPattern : [filter.keyPattern];
      if (!this.matchesAny(keyPatterns, data.key)) {
        return false;
      }
    }
    
    // Check custom filter
    if (filter.customFilter && !filter.customFilter(data)) {
      return false;
    }
    
    return true;
  }
}