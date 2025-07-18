/**
 * Request deduplicator to prevent multiple identical requests
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