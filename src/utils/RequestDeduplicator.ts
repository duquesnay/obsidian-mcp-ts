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
 * // Monitoring deduplication effectiveness
 * const deduplicator = new RequestDeduplicator();
 * let totalRequests = 0;
 * let actualRequests = 0;
 * 
 * async function monitoredFetch(url: string): Promise<any> {
 *   totalRequests++;
 *   
 *   return deduplicator.dedupe(url, async () => {
 *     actualRequests++;
 *     const response = await fetch(url);
 *     return response.json();
 *   });
 * }
 * 
 * // After some usage...
 * console.log(`Deduplication ratio: ${((totalRequests - actualRequests) / totalRequests * 100).toFixed(1)}%`);
 * console.log(`Pending requests: ${deduplicator.size()}`);
 * 
 * @performance
 * - O(1) lookup for pending requests
 * - Automatic cleanup of expired requests
 * - Memory usage proportional to concurrent unique requests
 * - No overhead for non-concurrent requests
 * 
 * @bestPractices
 * - Use descriptive, stable keys for deduplication
 * - Set TTL based on request volatility
 * - Clear deduplicator on error conditions if needed
 * - Monitor size() in production for memory leaks
 * - Consider combining with caching for maximum efficiency
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

export class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private ttl: number;

  constructor(ttl = 5000) { // 5 seconds default
    this.ttl = ttl;
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

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn()
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
}