/**
 * Implementation of the cache subscription management system
 * 
 * Provides a robust, high-performance subscription system for cache events with:
 * - Priority-based execution order
 * - Advanced filtering capabilities  
 * - Performance monitoring and statistics
 * - Type-safe event handling
 * 
 * @example
 * ```typescript
 * // Initialize subscription manager
 * const subscriptionManager = new CacheSubscriptionManager();
 * 
 * // Subscribe to cache invalidations with filtering
 * const handle = subscriptionManager.subscribe({
 *   eventType: SUBSCRIPTION_EVENTS.CACHE_INVALIDATED,
 *   callback: (data) => {
 *     console.log(`Cache ${data.instanceId} invalidated key: ${data.key}`);
 *   },
 *   filter: {
 *     operation: ['delete', 'expire'],
 *     keyPattern: 'user:*'
 *   },
 *   priority: SubscriptionPriority.HIGH,
 *   metadata: {
 *     name: 'user-cache-cleanup',
 *     tags: ['monitoring', 'cache']
 *   }
 * });
 * 
 * // Process event (typically called by NotificationManager)
 * subscriptionManager.processEvent(SUBSCRIPTION_EVENTS.CACHE_INVALIDATED, {
 *   key: 'user:123',
 *   operation: 'delete',
 *   instanceId: 'main-cache',
 *   timestamp: Date.now()
 * });
 * ```
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ICacheSubscriptionManager,
  CacheSubscriptionConfig,
  CacheSubscriptionHandle,
  CacheInvalidationData,
  CacheEventFilter
} from '../interfaces/subscription.js';
import { SubscriptionPriority } from '../interfaces/subscription.js';
import { CachePatternMatcher, isCacheInvalidationData } from '../interfaces/subscription.js';
import type { NotificationData } from './NotificationManager.js';

/**
 * Internal subscription data structure
 */
interface InternalSubscription {
  /** Unique subscription ID */
  readonly id: string;
  
  /** Event type */
  readonly eventType: string;
  
  /** Callback function */
  readonly callback: (data: CacheInvalidationData) => void | Promise<void>;
  
  /** Optional filter */
  readonly filter?: CacheEventFilter;
  
  /** Subscription priority */
  readonly priority: SubscriptionPriority;
  
  /** Subscription metadata */
  readonly metadata?: CacheSubscriptionConfig['metadata'];
  
  /** When subscription was created */
  readonly createdAt: number;
  
  /** Statistics tracking */
  stats: {
    invocationCount: number;
    lastInvoked?: number;
    totalExecutionTime: number;
  };
  
  /** Whether subscription is active */
  active: boolean;
}

/**
 * Implementation of subscription handle for managing individual subscriptions
 */
class CacheSubscriptionHandleImpl implements CacheSubscriptionHandle {
  constructor(
    private subscription: InternalSubscription,
    private manager: CacheSubscriptionManager
  ) {}
  
  get id(): string {
    return this.subscription.id;
  }
  
  get eventType(): string {
    return this.subscription.eventType;
  }
  
  get priority(): SubscriptionPriority {
    return this.subscription.priority;
  }
  
  get metadata(): CacheSubscriptionConfig['metadata'] {
    return this.subscription.metadata;
  }
  
  unsubscribe(): void {
    this.manager.unsubscribe(this);
  }
  
  isActive(): boolean {
    return this.subscription.active;
  }
  
  updateFilter(filter: CacheEventFilter): void {
    // Note: This creates a new filter object to maintain immutability
    (this.subscription as any).filter = { ...filter };
  }
  
  getStats() {
    const { invocationCount, lastInvoked, totalExecutionTime } = this.subscription.stats;
    return {
      invocationCount,
      lastInvoked,
      totalExecutionTime,
      averageExecutionTime: invocationCount > 0 ? totalExecutionTime / invocationCount : 0
    };
  }
}

/**
 * Cache subscription manager implementation
 */
export class CacheSubscriptionManager implements ICacheSubscriptionManager {
  /** Map of event type to subscriptions */
  private subscriptions: Map<string, InternalSubscription[]> = new Map();
  
  /** Map of subscription ID to subscription for fast lookup */
  private subscriptionById: Map<string, InternalSubscription> = new Map();
  
  /** Global statistics */
  private stats = {
    totalEventsProcessed: 0,
    totalProcessingTime: 0
  };
  
  subscribe(config: CacheSubscriptionConfig): CacheSubscriptionHandle {
    const subscription: InternalSubscription = {
      id: uuidv4(),
      eventType: config.eventType,
      callback: config.callback,
      filter: config.filter,
      priority: config.priority ?? SubscriptionPriority.NORMAL,
      metadata: {
        ...config.metadata,
        createdAt: config.metadata?.createdAt ?? Date.now()
      },
      createdAt: Date.now(),
      stats: {
        invocationCount: 0,
        totalExecutionTime: 0
      },
      active: true
    };
    
    // Add to event type map
    if (!this.subscriptions.has(config.eventType)) {
      this.subscriptions.set(config.eventType, []);
    }
    
    const eventSubscriptions = this.subscriptions.get(config.eventType)!;
    eventSubscriptions.push(subscription);
    
    // Sort by priority (lower number = higher priority)
    eventSubscriptions.sort((a, b) => a.priority - b.priority);
    
    // Add to ID map for fast lookup
    this.subscriptionById.set(subscription.id, subscription);
    
    return new CacheSubscriptionHandleImpl(subscription, this);
  }
  
  unsubscribe(handle: CacheSubscriptionHandle): boolean {
    const subscription = this.subscriptionById.get(handle.id);
    if (!subscription) {
      return false;
    }
    
    // Mark as inactive
    subscription.active = false;
    
    // Remove from ID map
    this.subscriptionById.delete(handle.id);
    
    // Remove from event type map
    const eventSubscriptions = this.subscriptions.get(subscription.eventType);
    if (eventSubscriptions) {
      const index = eventSubscriptions.findIndex(s => s.id === handle.id);
      if (index >= 0) {
        eventSubscriptions.splice(index, 1);
        
        // Clean up empty event type arrays
        if (eventSubscriptions.length === 0) {
          this.subscriptions.delete(subscription.eventType);
        }
      }
    }
    
    return true;
  }
  
  unsubscribeById(subscriptionId: string): boolean {
    const subscription = this.subscriptionById.get(subscriptionId);
    if (!subscription) {
      return false;
    }
    
    const handle = new CacheSubscriptionHandleImpl(subscription, this);
    return this.unsubscribe(handle);
  }
  
  getSubscriptions(eventType: string): CacheSubscriptionHandle[] {
    const subscriptions = this.subscriptions.get(eventType) || [];
    return subscriptions
      .filter(s => s.active)
      .map(s => new CacheSubscriptionHandleImpl(s, this));
  }
  
  getAllSubscriptions(filter?: {
    eventType?: string;
    priority?: SubscriptionPriority;
    tags?: string[];
  }): CacheSubscriptionHandle[] {
    const allSubscriptions: InternalSubscription[] = [];
    
    // Collect all subscriptions
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      if (!filter?.eventType || eventType === filter.eventType) {
        allSubscriptions.push(...subscriptions.filter(s => s.active));
      }
    }
    
    // Apply filters
    let filteredSubscriptions = allSubscriptions;
    
    if (filter?.priority !== undefined) {
      filteredSubscriptions = filteredSubscriptions.filter(s => s.priority === filter.priority);
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      filteredSubscriptions = filteredSubscriptions.filter(s => {
        const subTags = s.metadata?.tags || [];
        return filter.tags!.some(tag => subTags.includes(tag));
      });
    }
    
    return filteredSubscriptions.map(s => new CacheSubscriptionHandleImpl(s, this));
  }
  
  clearSubscriptions(eventType?: string): void {
    if (eventType) {
      // Clear specific event type
      const subscriptions = this.subscriptions.get(eventType) || [];
      for (const subscription of subscriptions) {
        subscription.active = false;
        this.subscriptionById.delete(subscription.id);
      }
      this.subscriptions.delete(eventType);
    } else {
      // Clear all subscriptions
      for (const subscription of this.subscriptionById.values()) {
        subscription.active = false;
      }
      this.subscriptions.clear();
      this.subscriptionById.clear();
    }
  }
  
  hasSubscriptions(eventType: string): boolean {
    const subscriptions = this.subscriptions.get(eventType);
    return Boolean(subscriptions && subscriptions.length > 0);
  }
  
  getStats() {
    const totalSubscriptions = this.subscriptionById.size;
    const subscriptionsByEvent: Record<string, number> = {};
    const subscriptionsByPriority: Record<SubscriptionPriority, number> = {
      [SubscriptionPriority.CRITICAL]: 0,
      [SubscriptionPriority.HIGH]: 0,
      [SubscriptionPriority.NORMAL]: 0,
      [SubscriptionPriority.LOW]: 0
    };
    
    // Count subscriptions by event type and priority
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      subscriptionsByEvent[eventType] = subscriptions.filter(s => s.active).length;
      
      for (const subscription of subscriptions) {
        if (subscription.active) {
          subscriptionsByPriority[subscription.priority]++;
        }
      }
    }
    
    const averageProcessingTime = this.stats.totalEventsProcessed > 0 
      ? this.stats.totalProcessingTime / this.stats.totalEventsProcessed 
      : 0;
    
    return {
      totalSubscriptions,
      subscriptionsByEvent,
      subscriptionsByPriority,
      totalEventsProcessed: this.stats.totalEventsProcessed,
      averageProcessingTime
    };
  }
  
  /**
   * Process an event by notifying all matching subscriptions
   * This method is typically called by the NotificationManager
   * 
   * @param eventType - Type of event that occurred
   * @param data - Event data
   */
  async processEvent(eventType: string, data: NotificationData): Promise<void> {
    const startTime = Date.now();
    
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }
    
    // Convert to cache invalidation data if needed
    const cacheData: CacheInvalidationData = isCacheInvalidationData(data) ? data : {
      ...data,
      operation: 'set' // Default operation if not specified
    };
    
    // Process subscriptions in priority order
    const promises: Promise<void>[] = [];
    
    for (const subscription of subscriptions) {
      if (!subscription.active) {
        continue;
      }
      
      // Apply filter if present
      if (subscription.filter && !CachePatternMatcher.matchesFilter(subscription.filter, cacheData)) {
        continue;
      }
      
      // Track subscription stats
      const subStartTime = Date.now();
      subscription.stats.invocationCount++;
      subscription.stats.lastInvoked = subStartTime;
      
      try {
        // Execute callback
        const result = subscription.callback(cacheData);
        
        // Handle async callbacks
        const promise = Promise.resolve(result).then(() => {
          const subEndTime = Date.now();
          subscription.stats.totalExecutionTime += (subEndTime - subStartTime);
        }).catch(error => {
          const subEndTime = Date.now();
          subscription.stats.totalExecutionTime += (subEndTime - subStartTime);
          console.error(`Error in subscription callback ${subscription.id}:`, error);
        });
        
        promises.push(promise);
      } catch (error) {
        const subEndTime = Date.now();
        subscription.stats.totalExecutionTime += (subEndTime - subStartTime);
        console.error(`Synchronous error in subscription callback ${subscription.id}:`, error);
      }
    }
    
    // Wait for all callbacks to complete
    await Promise.all(promises);
    
    // Update global stats
    const endTime = Date.now();
    this.stats.totalEventsProcessed++;
    this.stats.totalProcessingTime += (endTime - startTime);
  }
  
  /**
   * Get detailed diagnostics for debugging
   */
  getDiagnostics(): Record<string, unknown> {
    const diagnostics: Record<string, unknown> = {
      totalSubscriptions: this.subscriptionById.size,
      activeSubscriptions: Array.from(this.subscriptionById.values()).filter(s => s.active).length,
      eventTypes: Array.from(this.subscriptions.keys()),
      globalStats: this.stats
    };
    
    // Add per-event diagnostics
    const eventDiagnostics: Record<string, unknown> = {};
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      eventDiagnostics[eventType] = {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter(s => s.active).length,
        priorityBreakdown: subscriptions.reduce((acc, s) => {
          if (s.active) {
            acc[s.priority] = (acc[s.priority] || 0) + 1;
          }
          return acc;
        }, {} as Record<SubscriptionPriority, number>)
      };
    }
    diagnostics.eventDiagnostics = eventDiagnostics;
    
    return diagnostics;
  }
  
  /**
   * Clean up inactive subscriptions (for memory management)
   */
  cleanup(): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const activeSubscriptions = subscriptions.filter(s => s.active);
      
      if (activeSubscriptions.length === 0) {
        this.subscriptions.delete(eventType);
      } else if (activeSubscriptions.length < subscriptions.length) {
        this.subscriptions.set(eventType, activeSubscriptions);
      }
    }
    
    // Clean up ID map
    for (const [id, subscription] of this.subscriptionById.entries()) {
      if (!subscription.active) {
        this.subscriptionById.delete(id);
      }
    }
  }
}