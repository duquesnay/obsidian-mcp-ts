import { REQUEST_DEDUPLICATOR } from '../constants.js';

/**
 * Request deduplicator to prevent multiple identical requests
 * 
 * Ensures that multiple concurrent calls for the same resource result in a single
 * actual request, with all callers receiving the same response. Ideal for preventing
 * redundant API calls and reducing server load.
 * 
 * @example
 * // Basic usage - prevent duplicate API calls
 * const deduplicator = new RequestDeduplicator();
 * 
 * // Multiple components request the same user data
 * const user1 = deduplicator.dedupe('user:123', () => 
 *   fetch('/api/users/123').then(r => r.json())
 * );
 * 
 * const user2 = deduplicator.dedupe('user:123', () => 
 *   fetch('/api/users/123').then(r => r.json())
 * );
 * 
 * // Both promises resolve with the same data, but only one API call is made
 * const [data1, data2] = await Promise.all([user1, user2]);
 * console.log(data1 === data2); // true - same object reference
 * 
 * @example
 * // Cache service with deduplication
 * class CachedAPIService {
 *   private cache = new LRUCache<string, any>({ maxSize: 100, ttl: 60000 });
 *   private deduplicator = new RequestDeduplicator(5000);
 * 
 *   async getData(id: string): Promise<any> {
 *     // Check cache first
 *     const cached = this.cache.get(id);
 *     if (cached) return cached;
 * 
 *     // Deduplicate concurrent requests for uncached data
 *     const data = await this.deduplicator.dedupe(
 *       `getData:${id}`,
 *       async () => {
 *         const response = await fetch(`/api/data/${id}`);
 *         const data = await response.json();
 *         this.cache.set(id, data);
 *         return data;
 *       }
 *     );
 * 
 *     return data;
 *   }
 * }
 * 
 * @example
 * // File reading with deduplication
 * const fileDeduplicator = new RequestDeduplicator(10000); // 10 second TTL
 * 
 * async function getFileContent(path: string): Promise<string> {
 *   return fileDeduplicator.dedupe(
 *     `file:${path}`,
 *     async () => {
 *       console.log(`Reading file: ${path}`);
 *       const content = await fs.readFile(path, 'utf-8');
 *       return processContent(content);
 *     }
 *   );
 * }
 * 
 * // Concurrent requests for the same file
 * await Promise.all([
 *   getFileContent('/path/to/large/file.txt'),
 *   getFileContent('/path/to/large/file.txt'),
 *   getFileContent('/path/to/large/file.txt')
 * ]);
 * // Output: "Reading file: /path/to/large/file.txt" (only once)
 * 
 * @example
 * // Complex key generation for deduplication
 * const apiDeduplicator = new RequestDeduplicator();
 * 
 * async function searchAPI(params: SearchParams): Promise<SearchResults> {
 *   // Create a stable key from search parameters
 *   const key = JSON.stringify({
 *     query: params.query,
 *     filters: params.filters?.sort(),
 *     page: params.page,
 *     limit: params.limit
 *   });
 * 
 *   return apiDeduplicator.dedupe(key, async () => {
 *     const queryString = new URLSearchParams(params).toString();
 *     const response = await fetch(`/api/search?${queryString}`);
 *     return response.json();
 *   });
 * }
 * 
 * @example
 * // Monitoring deduplication effectiveness with built-in metrics
 * const deduplicator = new RequestDeduplicator(5000, { enableMetricsLogging: true });
 * 
 * async function monitoredFetch(url: string): Promise<any> {
 *   return deduplicator.dedupe(url, async () => {
 *     const response = await fetch(url);
 *     return response.json();
 *   });
 * }
 * 
 * // After some usage...
 * const stats = deduplicator.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
 * console.log(`Average response time: ${stats.averageResponseTime.toFixed(2)}ms`);
 * console.log(`Active requests: ${stats.activeRequests}`);
 * 
 * // Or use built-in logging
 * deduplicator.logMetrics();
 * 
 * @performance
 * - O(1) lookup for pending requests
 * - Automatic cleanup of expired requests
 * - Memory usage proportional to concurrent unique requests
 * - No overhead for non-concurrent requests
 * - Metrics tracking adds minimal overhead (simple counters)
 * - Response time tracking only measures original requests, not hits
 * 
 * @bestPractices
 * - Use descriptive, stable keys for deduplication
 * - Set TTL based on request volatility
 * - Clear deduplicator on error conditions if needed
 * - Monitor size() in production for memory leaks
 * - Consider combining with caching for maximum efficiency
 * - Enable metrics logging in development to optimize hit rates
 * - Regularly check metrics to identify inefficient request patterns
 * - Reset metrics periodically for accurate measurement windows
 * 
 * @commonPitfalls
 * - Keys must be consistent - same request should generate same key
 * - TTL too short: requests might not be deduplicated
 * - TTL too long: memory usage and stale request issues
 * - Don't deduplicate requests with side effects (POST, PUT, DELETE)
 * - Be careful with error handling - errors are also deduplicated
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export interface DeduplicatorStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  activeRequests: number;
}

export interface DeduplicatorOptions {
  enableMetricsLogging?: boolean;
  logLevel?: typeof REQUEST_DEDUPLICATOR.LOG_LEVEL[keyof typeof REQUEST_DEDUPLICATOR.LOG_LEVEL];
}

export class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private ttl: number;
  private options: DeduplicatorOptions;
  
  // Metrics tracking
  private hits = 0;
  private misses = 0;
  private totalResponseTime = 0;
  private completedRequests = 0;

  constructor(ttl: number = REQUEST_DEDUPLICATOR.DEFAULT_TTL_MS, options: DeduplicatorOptions = {}) {
    this.ttl = ttl;
    this.options = {
      enableMetricsLogging: REQUEST_DEDUPLICATOR.DEFAULT_METRICS_LOGGING,
      logLevel: REQUEST_DEDUPLICATOR.LOG_LEVEL.INFO,
      ...options
    };
  }

  /**
   * Execute a request with deduplication
   * If an identical request is already pending, return the same promise
   * 
   * @example
   * const data = await deduplicator.dedupe('unique-key', async () => {
   *   return await expensiveOperation();
   * });
   * 
   * @param key Unique identifier for this request
   * @param requestFn Function that returns a promise for the actual request
   * @returns Promise that resolves to the request result
   */
  dedupe<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Clean up old pending requests
    this.cleanupExpired();

    const startTime = Date.now();

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // This is a hit - same request already in progress
      this.hits++;
      return pending.promise as Promise<T>;
    }

    // This is a miss - new request
    this.misses++;

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Track response time only for the original request
        const responseTime = Date.now() - startTime;
        this.totalResponseTime += responseTime;
        this.completedRequests++;
        return result;
      })
      .finally(() => {
        // Remove from pending when complete
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   */
  size(): number {
    this.cleanupExpired();
    return this.pendingRequests.size;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, request] of this.pendingRequests) {
      if (now - request.timestamp > this.ttl) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Get deduplication metrics
   */
  getStats(): DeduplicatorStats {
    const totalRequests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      totalRequests,
      averageResponseTime: this.completedRequests > 0 ? this.totalResponseTime / this.completedRequests : 0,
      activeRequests: this.pendingRequests.size
    };
  }

  /**
   * Reset metrics counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.totalResponseTime = 0;
    this.completedRequests = 0;
  }

  /**
   * Log metrics to console if logging is enabled
   */
  logMetrics(): void {
    if (!this.options.enableMetricsLogging || this.options.logLevel === REQUEST_DEDUPLICATOR.LOG_LEVEL.SILENT) {
      return;
    }

    const stats = this.getStats();
    const hitRatePercent = (stats.hitRate * 100).toFixed(2);

    console.log('RequestDeduplicator Metrics:');
    console.log(`  Hit Rate: ${hitRatePercent}% (${stats.hits} hits, ${stats.misses} misses)`);
    console.log(`  Total Requests: ${stats.totalRequests}`);
    console.log(`  Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Active Requests: ${stats.activeRequests}`);

    if (this.options.logLevel === REQUEST_DEDUPLICATOR.LOG_LEVEL.DEBUG) {
      console.log(`  Completed Requests: ${this.completedRequests}`);
      console.log(`  Total Response Time: ${this.totalResponseTime}ms`);
    }
  }
}