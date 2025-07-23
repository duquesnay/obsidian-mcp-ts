import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseResourceHandler } from './BaseResourceHandler.js';
import { LRUCache } from '../utils/Cache.js';
import { CACHE_DEFAULTS } from '../constants.js';

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
}

/**
 * Default cache configuration based on resource types
 */
const DEFAULT_CACHE_CONFIG: ResourceCacheConfig = {
  maxSize: CACHE_DEFAULTS.MAX_SIZE,
  defaultTtl: CACHE_DEFAULTS.STABLE_TTL,
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
 */
export class CachedResourceHandler extends BaseResourceHandler {
  private cache: LRUCache<string, ReadResourceResult>;
  private config: ResourceCacheConfig;
  private wrappedHandler: BaseResourceHandler;

  constructor(handler: BaseResourceHandler, config?: ResourceCacheConfig) {
    super();
    this.wrappedHandler = handler;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    
    this.cache = new LRUCache({
      maxSize: this.config.maxSize,
      ttl: this.config.defaultTtl
    });
  }

  /**
   * Handle request with caching layer
   */
  async handleRequest(uri: string, server?: any): Promise<any> {
    // Check cache first
    const cachedResult = this.cache.get(uri);
    if (cachedResult) {
      return this.extractDataFromResult(cachedResult);
    }

    // Cache miss - call underlying handler
    const data = await this.wrappedHandler.handleRequest(uri, server);
    
    // Create result and cache it
    const result = this.createResultFromData(uri, data);
    const ttl = this.getTtlForResource(uri);
    this.cache.set(uri, result, ttl);
    
    return data;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
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
    
    if (content.mimeType === 'application/json') {
      return JSON.parse(content.text);
    } else {
      return content.text;
    }
  }
}