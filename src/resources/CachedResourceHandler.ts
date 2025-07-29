import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseResourceHandler } from './BaseResourceHandler.js';
import { LRUCache } from '../utils/Cache.js';
import { CACHE_DEFAULTS } from '../constants.js';
import { PaginationSystem, PaginationParams } from '../utils/PaginationSystem.js';
import { CacheNotificationHooks } from './cacheNotifications.js';
import { CacheRegistry } from '../utils/CacheRegistry.js';

/**
 * Configuration for resource caching
 */
export interface ResourceCacheConfig {
  /** Maximum number of entries in cache */
  maxSize: number;
  
  /** Default TTL in milliseconds */
  defaultTtl: number;
  
  /** Resource-specific TTL overrides */
  resourceTtls: Record<string, number>;
  
  /** Enable pagination-aware caching optimization */
  paginationOptimization?: boolean;
}

/**
 * Enhanced cache statistics with pagination metrics
 */
export interface PaginatedCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  paginatedEntries: number;
  nonPaginatedEntries: number;
}

/**
 * Default cache configuration based on resource types
 */
const DEFAULT_CACHE_CONFIG: ResourceCacheConfig = {
  maxSize: CACHE_DEFAULTS.MAX_SIZE,
  defaultTtl: CACHE_DEFAULTS.STABLE_TTL,
  paginationOptimization: true,
  resourceTtls: {
    // Static resources - longer TTL
    'vault://tags': CACHE_DEFAULTS.STABLE_TTL,
    'vault://stats': CACHE_DEFAULTS.STABLE_TTL,
    'vault://structure': CACHE_DEFAULTS.STABLE_TTL,
    
    // Dynamic resources - shorter TTL
    'vault://recent': CACHE_DEFAULTS.FAST_TTL,
    
    // Parameterized resources get default TTL per instance
    // Individual notes and folders will use NOTE_TTL via pattern matching
  }
};

/**
 * Cached wrapper for resource handlers to improve performance
 * 
 * Provides intelligent caching based on resource types:
 * - Static resources (tags, stats, structure): 5 minutes
 * - Dynamic resources (recent): 30 seconds
 * - Parameterized resources (note/{path}, folder/{path}): 2 minutes per instance
 * - Paginated resources: Smart caching by page parameters with invalidation support
 *
 * Paginated Caching Features:
 * - Each page is cached separately by pagination parameters
 * - Cache keys include normalized pagination parameters for consistency
 * - Supports partial cache invalidation by base resource
 * - Memory-efficient storage for large paginated datasets
 * - Cache hit/miss metrics for paginated resources
 */
export class CachedResourceHandler extends BaseResourceHandler {
  private cache: LRUCache<string, ReadResourceResult>;
  private config: ResourceCacheConfig;
  private wrappedHandler: BaseResourceHandler;
  private paginatedCacheStats: { paginatedEntries: number; nonPaginatedEntries: number };
  private notificationHooks?: CacheNotificationHooks;

  constructor(handler: BaseResourceHandler, config?: ResourceCacheConfig) {
    super();
    this.wrappedHandler = handler;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    
    this.cache = new LRUCache({
      maxSize: this.config.maxSize,
      ttl: this.config.defaultTtl
    });
    
    this.paginatedCacheStats = {
      paginatedEntries: 0,
      nonPaginatedEntries: 0
    };

    // Register cache with central registry
    const registry = CacheRegistry.getInstance();
    const handlerName = handler.constructor.name;
    registry.register(`resource-${handlerName}`, this.cache);
  }

  /**
   * Set notification hooks for cache invalidation
   */
  setNotificationHooks(hooks: CacheNotificationHooks): void {
    this.notificationHooks = hooks;
  }

  /**
   * Handle request with caching layer
   */
  async handleRequest(uri: string, server?: any): Promise<any> {
    const cacheKey = this.generateCacheKey(uri);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return this.extractDataFromResult(cachedResult);
    }

    // Cache miss - call underlying handler
    const data = await this.wrappedHandler.handleRequest(uri, server);
    
    // Create result and cache it
    const result = this.createResultFromData(uri, data);
    const ttl = this.getTtlForResource(uri);
    this.cache.set(cacheKey, result, ttl);
    
    // Update pagination stats
    this.updatePaginationStats(uri);
    
    return data;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get enhanced cache statistics with pagination metrics
   */
  getPaginatedCacheStats(): PaginatedCacheStats {
    const baseStats = this.cache.getStats();
    return {
      ...baseStats,
      ...this.paginatedCacheStats
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.cache.resetStats();
  }

  /**
   * Clear all cached entries
   */
  clearCache(): void {
    this.cache.clear();
    this.paginatedCacheStats.paginatedEntries = 0;
    this.paginatedCacheStats.nonPaginatedEntries = 0;
  }

  /**
   * Invalidate all cached pages for a specific resource
   * @param baseUri The base URI without pagination parameters
   */
  invalidateResourcePages(baseUri: string): void {
    if (!this.config.paginationOptimization) {
      return;
    }

    const keysToDelete: string[] = [];
    
    // Find all cache keys that match the base resource
    for (const [key] of (this.cache as any).cache) {
      if (this.isKeyForResource(key, baseUri)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete matching entries
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.paginatedCacheStats.paginatedEntries = Math.max(0, this.paginatedCacheStats.paginatedEntries - 1);
    }
  }

  /**
   * Get TTL for a specific resource URI
   */
  private getTtlForResource(uri: string): number | undefined {
    // Check for exact match first
    if (this.config.resourceTtls[uri]) {
      return this.config.resourceTtls[uri];
    }

    // Check for pattern matches
    if (uri.startsWith('vault://note/') || uri.startsWith('vault://folder/')) {
      return CACHE_DEFAULTS.NOTE_TTL;
    }

    if (uri.startsWith('vault://daily/') || uri.startsWith('vault://tag/')) {
      return CACHE_DEFAULTS.NOTE_TTL;
    }

    // Use default
    return undefined;
  }

  /**
   * Create a ReadResourceResult from data (mimics BaseResourceHandler.execute)
   */
  private createResultFromData(uri: string, data: any): ReadResourceResult {
    if (typeof data === 'string') {
      return this.formatTextResponse(uri, data);
    } else {
      return this.formatJsonResponse(uri, data);
    }
  }

  /**
   * Extract the original data from a cached ReadResourceResult
   */
  private extractDataFromResult(result: ReadResourceResult): any {
    const content = result.contents[0];
    
    if (content.mimeType === 'application/json' && typeof content.text === 'string') {
      return JSON.parse(content.text);
    } else {
      return content.text;
    }
  }

  /**
   * Generate cache key for a URI, normalizing pagination parameters if enabled
   */
  private generateCacheKey(uri: string): string {
    if (!this.config.paginationOptimization) {
      return uri;
    }

    try {
      // Parse pagination parameters
      const params = PaginationSystem.parseParameters(uri);
      
      if (params.style === 'none') {
        // No pagination, use original URI
        return uri;
      }

      // Extract base URI without query parameters
      const url = new URL(uri, 'vault://');
      const baseUri = `${url.protocol}//${url.host}${url.pathname}`;
      
      // Create normalized cache key with pagination info
      return `${baseUri}?limit=${params.limit}&offset=${params.offset}`;
    } catch (error) {
      // If parsing fails, fall back to original URI
      return uri;
    }
  }

  /**
   * Check if a cache key matches a base resource URI
   */
  private isKeyForResource(cacheKey: string, baseUri: string): boolean {
    try {
      const keyUrl = new URL(cacheKey, 'vault://');
      const baseUrl = new URL(baseUri, 'vault://');
      
      return keyUrl.protocol === baseUrl.protocol &&
             keyUrl.host === baseUrl.host &&
             keyUrl.pathname === baseUrl.pathname;
    } catch (error) {
      // If URL parsing fails, do simple string matching
      return cacheKey.startsWith(baseUri);
    }
  }

  /**
   * Update pagination statistics for cache entries
   */
  private updatePaginationStats(uri: string): void {
    if (!this.config.paginationOptimization) {
      this.paginatedCacheStats.nonPaginatedEntries++;
      return;
    }

    try {
      const params = PaginationSystem.parseParameters(uri);
      if (params.style === 'none') {
        this.paginatedCacheStats.nonPaginatedEntries++;
      } else {
        this.paginatedCacheStats.paginatedEntries++;
      }
    } catch (error) {
      this.paginatedCacheStats.nonPaginatedEntries++;
    }
  }
}