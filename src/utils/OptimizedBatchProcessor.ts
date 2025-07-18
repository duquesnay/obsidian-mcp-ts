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