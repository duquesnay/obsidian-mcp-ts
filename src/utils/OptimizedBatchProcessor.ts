import { OBSIDIAN_DEFAULTS } from '../constants.js';

export interface BatchProcessorOptions {
  batchSize?: number;
  maxConcurrency?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchResult<T, R> {
  item: T;
  result?: R;
  error?: Error;
  attempts: number;
}

/**
 * Optimized batch processor with advanced concurrency control and retry logic
 * 
 * Provides sophisticated batch processing with dynamic concurrency, automatic retries,
 * progress tracking, and streaming results. Ideal for complex workflows requiring
 * resilience and fine-grained control.
 * 
 * @example
 * // Basic usage with retry logic
 * const processor = new OptimizedBatchProcessor({
 *   maxConcurrency: 5,
 *   retryAttempts: 3,
 *   retryDelay: 1000,
 *   onProgress: (completed, total) => {
 *     console.log(`Progress: ${completed}/${total} (${(completed/total*100).toFixed(1)}%)`);
 *   }
 * });
 * 
 * const urls = ['http://api1.com', 'http://api2.com', ...];
 * const results = await processor.process(urls, async (url) => {
 *   const response = await fetch(url);
 *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *   return response.json();
 * });
 * 
 * // Analyze results
 * const successful = results.filter(r => r.result);
 * const failed = results.filter(r => r.error);
 * console.log(`Success: ${successful.length}, Failed: ${failed.length}`);
 * 
 * @example
 * // Stream processing for large datasets
 * const processor = new OptimizedBatchProcessor({
 *   maxConcurrency: 10,
 *   retryAttempts: 2
 * });
 * 
 * const files = getLargeFileList(); // Thousands of files
 * 
 * // Process files as they complete, not waiting for all
 * for await (const result of processor.processStream(files, processFile)) {
 *   if (result.error) {
 *     console.error(`Failed after ${result.attempts} attempts:`, result.error);
 *     await logError(result.item, result.error);
 *   } else {
 *     console.log(`Processed ${result.item} successfully`);
 *     await saveResult(result.result);
 *   }
 * }
 * 
 * @example
 * // Traditional batch processing with controlled chunks
 * const processor = new OptimizedBatchProcessor({
 *   batchSize: 20,      // Process in chunks of 20
 *   retryAttempts: 1,   // No retries for speed
 *   onProgress: (c, t) => updateProgressBar(c / t)
 * });
 * 
 * const items = getItems();
 * const results = await processor.processBatches(items, async (item) => {
 *   // Each batch of 20 completes before next batch starts
 *   return await processItem(item);
 * });
 * 
 * @example
 * // Complex workflow with mixed operations
 * const processor = new OptimizedBatchProcessor({
 *   maxConcurrency: 3,
 *   retryAttempts: 3,
 *   retryDelay: 2000, // Exponential backoff: 2s, 4s, 6s
 * });
 * 
 * const tasks = [
 *   { type: 'fetch', url: 'http://api.com/data' },
 *   { type: 'compute', data: complexData },
 *   { type: 'upload', file: largeFile }
 * ];
 * 
 * const results = await processor.process(tasks, async (task) => {
 *   switch (task.type) {
 *     case 'fetch':
 *       return await fetchWithTimeout(task.url, 5000);
 *     case 'compute':
 *       return await computeIntensive(task.data);
 *     case 'upload':
 *       return await uploadWithProgress(task.file);
 *   }
 * });
 * 
 * // Group results by attempt count
 * const byAttempts = results.reduce((acc, r) => {
 *   acc[r.attempts] = (acc[r.attempts] || 0) + 1;
 *   return acc;
 * }, {});
 * console.log('Attempts distribution:', byAttempts);
 * 
 * @example
 * // Using static helper for simple cases
 * const results = await OptimizedBatchProcessor.processSimple(
 *   items,
 *   async (item) => processItem(item),
 *   { maxConcurrency: 5, retryAttempts: 2 }
 * );
 * 
 * @performance
 * - Dynamic concurrency with semaphore pattern
 * - Memory-efficient streaming for large datasets
 * - Exponential backoff for retries
 * - Maintains order in results array
 * 
 * @bestPractices
 * - Use process() for moderate datasets where you need all results
 * - Use processStream() for large datasets or real-time processing
 * - Use processBatches() when you need strict batch boundaries
 * - Set retryAttempts based on operation reliability
 * - Configure retryDelay based on rate limits
 * - Always provide onProgress for long-running operations
 * 
 * @commonPitfalls
 * - Don't set maxConcurrency too high - can overwhelm resources
 * - Remember that streaming doesn't preserve order
 * - Retry delays are multiplied by attempt number (exponential backoff)
 * - Results array maintains input order, not completion order
 */
export class OptimizedBatchProcessor {
  private readonly options: Required<BatchProcessorOptions>;
  
  constructor(options: BatchProcessorOptions = {}) {
    this.options = {
      batchSize: options.batchSize ?? OBSIDIAN_DEFAULTS.BATCH_SIZE,
      maxConcurrency: options.maxConcurrency ?? OBSIDIAN_DEFAULTS.BATCH_SIZE,
      retryAttempts: options.retryAttempts ?? 2,
      retryDelay: options.retryDelay ?? 1000,
      onProgress: options.onProgress ?? (() => {})
    };
  }

  /**
   * Process items with optimized concurrency control using a semaphore pattern
   * 
   * @example
   * const results = await processor.process(items, async (item) => {
   *   return await processItem(item);
   * });
   * 
   * @returns Array of results in the same order as input items
   */
  async process<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<BatchResult<T, R>[]> {
    const results: BatchResult<T, R>[] = [];
    const queue = [...items.map((item, index) => ({ item, index }))];
    const processing = new Map<number, Promise<void>>();
    let completed = 0;

    // Process items with concurrency limit
    while (queue.length > 0 || processing.size > 0) {
      // Start new tasks up to concurrency limit
      while (queue.length > 0 && processing.size < this.options.maxConcurrency) {
        const { item, index } = queue.shift()!;
        
        const task = this.processWithRetry(item, processor)
          .then(result => {
            results[index] = result;
            completed++;
            this.options.onProgress(completed, items.length);
          })
          .finally(() => {
            processing.delete(index);
          });
        
        processing.set(index, task);
      }

      // Wait for at least one task to complete
      if (processing.size > 0) {
        await Promise.race(processing.values());
      }
    }

    return results;
  }

  /**
   * Process items in traditional batches (all items in batch complete before next batch)
   */
  async processBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<BatchResult<T, R>[]> {
    const results: BatchResult<T, R>[] = [];
    let completed = 0;

    for (let i = 0; i < items.length; i += this.options.batchSize) {
      const batch = items.slice(i, i + this.options.batchSize);
      
      const batchResults = await Promise.all(
        batch.map(item => this.processWithRetry(item, processor))
      );
      
      results.push(...batchResults);
      completed += batchResults.length;
      this.options.onProgress(completed, items.length);
    }

    return results;
  }

  /**
   * Process items with streaming results (yields results as they complete)
   */
  async *processStream<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): AsyncGenerator<BatchResult<T, R>, void, unknown> {
    const queue = [...items];
    const processing = new Map<T, Promise<BatchResult<T, R>>>();

    while (queue.length > 0 || processing.size > 0) {
      // Start new tasks up to concurrency limit
      while (queue.length > 0 && processing.size < this.options.maxConcurrency) {
        const item = queue.shift()!;
        const promise = this.processWithRetry(item, processor);
        processing.set(item, promise);
      }

      // Wait for any task to complete
      if (processing.size > 0) {
        const completed = await Promise.race(processing.values());
        
        // Find and remove the completed item
        for (const [item, promise] of processing) {
          const result = await Promise.race([promise, Promise.resolve(null)]);
          if (result === completed) {
            processing.delete(item);
            yield completed;
            break;
          }
        }
      }
    }
  }

  /**
   * Process a single item with retry logic
   */
  private async processWithRetry<T, R>(
    item: T,
    processor: (item: T) => Promise<R>
  ): Promise<BatchResult<T, R>> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        const result = await processor(item);
        return { item, result, attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on last attempt
        if (attempt < this.options.retryAttempts) {
          await this.delay(this.options.retryDelay * attempt);
        }
      }
    }

    return { item, error: lastError, attempts: this.options.retryAttempts };
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Static helper for simple batch processing
   */
  static async processSimple<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: BatchProcessorOptions
  ): Promise<(R | Error)[]> {
    const batchProcessor = new OptimizedBatchProcessor(options);
    const results = await batchProcessor.process(items, processor);
    
    return results.map(r => r.error || r.result!);
  }
}