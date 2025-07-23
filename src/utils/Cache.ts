/**
 * LRU (Least Recently Used) Cache with TTL support
 * 
 * A high-performance cache implementation that automatically evicts least recently used items
 * when the cache reaches its maximum size. Supports time-to-live (TTL) for automatic expiration.
 * 
 * @example
 * // Basic usage with file metadata caching
 * const metadataCache = new LRUCache<string, FileMetadata>({
 *   maxSize: 100,  // Keep up to 100 files in cache
 *   ttl: 60000     // Expire after 1 minute
 * });
 * 
 * // Cache file metadata
 * const metadata = await fetchFileMetadata(filePath);
 * metadataCache.set(filePath, metadata);
 * 
 * // Retrieve with automatic cache hit tracking
 * const cached = metadataCache.get(filePath);
 * if (cached) {
 *   console.log('Cache hit!', cached);
 * } else {
 *   console.log('Cache miss, fetching from API...');
 * }
 * 
 * @example
 * // Search results caching with custom TTL
 * const searchCache = new LRUCache<string, SearchResult[]>({
 *   maxSize: 50,   // Keep 50 most recent searches
 *   ttl: 300000    // 5 minutes default TTL
 * });
 * 
 * // Cache search results with shorter TTL for volatile queries
 * const results = await performSearch(query);
 * const ttl = query.includes('recent') ? 30000 : undefined; // 30s for "recent" queries
 * searchCache.set(query, results, ttl);
 * 
 * @example
 * // Performance monitoring
 * const cache = new LRUCache<string, any>({ maxSize: 1000, ttl: 0 }); // No expiration
 * 
 * // Use cache with monitoring
 * for (const key of keys) {
 *   cache.get(key) || cache.set(key, await fetchData(key));
 * }
 * 
 * // Check cache performance
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 * console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
 * 
 * // Reset stats for next measurement period
 * cache.resetStats();
 * 
 * @example
 * // Preemptive cache cleanup for memory management
 * const cache = new LRUCache<string, LargeObject>({
 *   maxSize: 20,
 *   ttl: 3600000  // 1 hour
 * });
 * 
 * // Periodic cleanup of expired entries
 * setInterval(() => {
 *   const sizeBefore = cache.size();
 *   cache.size(); // Triggers internal cleanup
 *   const sizeAfter = cache.size();
 *   console.log(`Cleaned up ${sizeBefore - sizeAfter} expired entries`);
 * }, 300000); // Every 5 minutes
 * 
 * @performance
 * - O(1) get/set operations with hash map lookup
 * - O(1) LRU eviction with doubly linked list
 * - Automatic cleanup on size() calls
 * - Memory overhead: ~200 bytes per entry
 * 
 * @bestPractices
 * - Set appropriate maxSize based on memory constraints
 * - Use TTL for data that changes frequently
 * - Monitor hit rate to tune cache size
 * - Call size() periodically to trigger cleanup
 * - Consider cache warming for predictable access patterns
 */

interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  expires: number;
}

interface CacheOptions {
  maxSize: number;
  ttl: number; // Time to live in milliseconds, 0 = no expiration
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export class LRUCache<K, V> {
  private maxSize: number;
  private ttl: number;
  private cache: Map<K, CacheNode<K, V>>;
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions) {
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
    this.cache = new Map();
  }

  /**
   * Get value from cache
   * 
   * @example
   * const value = cache.get('my-key');
   * if (value === undefined) {
   *   // Handle cache miss
   *   const freshData = await fetchData();
   *   cache.set('my-key', freshData);
   * }
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    
    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(node)) {
      this.remove(node);
      this.misses++;
      return undefined;
    }

    this.hits++;
    // Move to front (most recently used)
    this.moveToFront(node);
    return node.value;
  }

  /**
   * Set value in cache
   * 
   * @example
   * // Basic caching
   * cache.set('user:123', userData);
   * 
   * // With custom TTL for specific entries
   * cache.set('volatile-data', data, 10000); // 10 second TTL
   * cache.set('stable-data', data); // Uses default TTL
   */
  set(key: K, value: V, customTtl?: number): void {
    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      existingNode.expires = this.calculateExpiry(customTtl);
      this.moveToFront(existingNode);
      return;
    }

    // Create new node
    const node: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: null,
      expires: this.calculateExpiry(customTtl)
    };

    this.cache.set(key, node);
    this.addToFront(node);

    // Evict if necessary
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    
    if (this.isExpired(node)) {
      this.remove(node);
      return false;
    }
    
    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    
    this.remove(node);
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get cache size
   */
  size(): number {
    // Clean up expired entries first
    this.cleanupExpired();
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: K[] = [];
    
    for (const [key, node] of this.cache) {
      if (this.isExpired(node)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      const node = this.cache.get(key);
      if (node) this.remove(node);
    }
  }

  private isExpired(node: CacheNode<K, V>): boolean {
    return node.expires > 0 && Date.now() > node.expires;
  }

  private calculateExpiry(customTtl?: number): number {
    const ttl = customTtl !== undefined ? customTtl : this.ttl;
    return ttl > 0 ? Date.now() + ttl : 0;
  }

  private moveToFront(node: CacheNode<K, V>): void {
    if (node === this.head) return;
    
    // Remove from current position
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;
    
    // Add to front
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private addToFront(node: CacheNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    
    if (this.head) this.head.prev = node;
    this.head = node;
    
    if (!this.tail) this.tail = node;
  }

  private remove(node: CacheNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;
    
    this.cache.delete(node.key);
  }

  private evictLRU(): void {
    if (!this.tail) return;
    this.remove(this.tail);
  }
}