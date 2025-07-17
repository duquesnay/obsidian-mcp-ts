import { OBSIDIAN_DEFAULTS } from '../constants.js';

/**
 * Utility class for processing items in batches with concurrency control
 */
export class BatchProcessor {
  /**
   * Process items in batches with a specified batch size
   * @param items Array of items to process
   * @param processor Async function to process each item
   * @param batchSize Maximum number of concurrent operations (default: 5)
   * @returns Array of results (including errors)
   */
  static async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = OBSIDIAN_DEFAULTS.BATCH_SIZE
  ): Promise<(R | Error)[]> {
    const results: (R | Error)[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (item) => {
        try {
          return await processor(item);
        } catch (error) {
          return error instanceof Error ? error : new Error(String(error));
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Process items in batches and format the results
   * @param items Array of items to process
   * @param processor Async function to process each item
   * @param formatter Function to format each result
   * @param batchSize Maximum number of concurrent operations
   * @returns Formatted string of all results
   */
  static async processBatchWithFormat<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    formatter: (item: T, result: R | Error) => string,
    batchSize: number = OBSIDIAN_DEFAULTS.BATCH_SIZE
  ): Promise<string> {
    const results = await this.processBatch(items, processor, batchSize);
    
    return items
      .map((item, index) => formatter(item, results[index]))
      .join('');
  }
}