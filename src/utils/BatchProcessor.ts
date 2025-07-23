import { OBSIDIAN_DEFAULTS } from '../constants.js';

/**
 * Utility class for processing items in batches with concurrency control
 * 
 * Provides simple batch processing with concurrent execution within each batch.
 * Ideal for operations that benefit from parallelization but need rate limiting.
 * 
 * @example
 * // Process multiple files with controlled concurrency
 * const files = ['file1.md', 'file2.md', 'file3.md', ...];
 * 
 * const results = await BatchProcessor.processBatch(
 *   files,
 *   async (file) => {
 *     const content = await readFile(file);
 *     return processContent(content);
 *   },
 *   5 // Process 5 files concurrently
 * );
 * 
 * // Handle mixed results (successes and errors)
 * results.forEach((result, index) => {
 *   if (result instanceof Error) {
 *     console.error(`Failed to process ${files[index]}:`, result);
 *   } else {
 *     console.log(`Processed ${files[index]} successfully`);
 *   }
 * });
 * 
 * @example
 * // Batch API requests with rate limiting
 * const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * 
 * const users = await BatchProcessor.processBatch(
 *   userIds,
 *   async (id) => {
 *     const response = await fetch(`/api/users/${id}`);
 *     if (!response.ok) throw new Error(`Failed to fetch user ${id}`);
 *     return response.json();
 *   },
 *   3 // Only 3 concurrent API requests
 * );
 * 
 * @example
 * // Format results with custom formatter
 * const searchTerms = ['typescript', 'javascript', 'nodejs'];
 * 
 * const report = await BatchProcessor.processBatchWithFormat(
 *   searchTerms,
 *   async (term) => {
 *     const results = await searchAPI(term);
 *     return results.length;
 *   },
 *   (term, result) => {
 *     if (result instanceof Error) {
 *       return `❌ ${term}: Search failed - ${result.message}\n`;
 *     }
 *     return `✓ ${term}: Found ${result} results\n`;
 *   },
 *   2 // Process 2 searches concurrently
 * );
 * 
 * console.log('Search Report:\n' + report);
 * 
 * @example
 * // Process large dataset in chunks
 * const largeDataset = Array.from({ length: 1000 }, (_, i) => i);
 * const BATCH_SIZE = 10;
 * 
 * // Process with progress tracking
 * let processed = 0;
 * const results = await BatchProcessor.processBatch(
 *   largeDataset,
 *   async (item) => {
 *     const result = await expensiveOperation(item);
 *     processed++;
 *     if (processed % 100 === 0) {
 *       console.log(`Progress: ${processed}/${largeDataset.length}`);
 *     }
 *     return result;
 *   },
 *   BATCH_SIZE
 * );
 * 
 * @performance
 * - Processes items in fixed-size batches
 * - Each batch runs concurrently, but batches are sequential
 * - Memory usage grows with batch size
 * - Error isolation: one failure doesn't stop other items
 * 
 * @bestPractices
 * - Use smaller batch sizes for memory-intensive operations
 * - Larger batch sizes for I/O-bound operations
 * - Consider OptimizedBatchProcessor for more advanced scenarios
 * - Always handle both success and error cases in results
 * - Monitor memory usage with large datasets
 * 
 * @comparison
 * BatchProcessor vs OptimizedBatchProcessor:
 * - BatchProcessor: Simple, fixed batches, easier to reason about
 * - OptimizedBatchProcessor: Dynamic concurrency, retry logic, streaming
 * - Use BatchProcessor for simple parallel operations
 * - Use OptimizedBatchProcessor for complex workflows with retries
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