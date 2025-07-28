import { describe, it, expect, beforeEach } from 'vitest';
import { BatchProcessor } from '../../src/utils/BatchProcessor.js';
import { OptimizedBatchProcessor } from '../../src/utils/OptimizedBatchProcessor.js';

describe('BatchProcessor Performance Comparison', () => {
  // Test data generators
  const generateItems = (count: number): number[] => {
    return Array.from({ length: count }, (_, i) => i);
  };

  const createSimpleProcessor = (delay: number = 10) => {
    return async (item: number): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return item * 2;
    };
  };

  const createFlakyProcessor = (failureRate: number = 0.2, delay: number = 10) => {
    return async (item: number): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      if (Math.random() < failureRate) {
        throw new Error(`Processing failed for item ${item}`);
      }
      return item * 2;
    };
  };

  const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  };

  describe('Small Dataset Performance (50 items)', () => {
    const itemCount = 50;
    const processingDelay = 5; // ms
    let items: number[];

    beforeEach(() => {
      items = generateItems(itemCount);
    });

    it('should compare basic batch processing performance', async () => {
      const processor = createSimpleProcessor(processingDelay);
      const batchSize = 5;

      // Test BatchProcessor (old)
      const oldResult = await measureTime(async () => {
        return await BatchProcessor.processBatch(items, processor, batchSize);
      });

      // Test OptimizedBatchProcessor (new)
      const newResult = await measureTime(async () => {
        const optimizedProcessor = new OptimizedBatchProcessor({
          maxConcurrency: batchSize,
          retryAttempts: 1
        });
        return await optimizedProcessor.process(items, processor);
      });

      // Verify results
      expect(oldResult.result).toHaveLength(itemCount);
      expect(newResult.result).toHaveLength(itemCount);

      // Performance analysis
      console.log(`\nSmall Dataset Performance (${itemCount} items):`);
      console.log(`BatchProcessor:         ${oldResult.duration.toFixed(2)}ms`);
      console.log(`OptimizedBatchProcessor: ${newResult.duration.toFixed(2)}ms`);
      console.log(`Performance ratio:      ${(newResult.duration / oldResult.duration).toFixed(2)}x`);

      // Both should complete successfully
      const oldSuccesses = oldResult.result.filter(r => !(r instanceof Error)).length;
      const newSuccesses = newResult.result.filter(r => !r.error).length;
      
      expect(oldSuccesses).toBe(itemCount);
      expect(newSuccesses).toBe(itemCount);
    }, 15000);

    it('should compare error handling performance', async () => {
      const flakyProcessor = createFlakyProcessor(0.3, processingDelay);
      const batchSize = 5;

      // Test BatchProcessor with errors
      const oldResult = await measureTime(async () => {
        return await BatchProcessor.processBatch(items, flakyProcessor, batchSize);
      });

      // Test OptimizedBatchProcessor with errors (no retries)
      const newResult = await measureTime(async () => {
        const optimizedProcessor = new OptimizedBatchProcessor({
          maxConcurrency: batchSize,
          retryAttempts: 1 // No retries for fair comparison
        });
        return await optimizedProcessor.process(items, flakyProcessor);
      });

      console.log(`\nError Handling Performance (${itemCount} items, 30% failure rate):`);
      console.log(`BatchProcessor:         ${oldResult.duration.toFixed(2)}ms`);
      console.log(`OptimizedBatchProcessor: ${newResult.duration.toFixed(2)}ms`);

      const oldErrors = oldResult.result.filter(r => r instanceof Error).length;
      const newErrors = newResult.result.filter(r => r.error).length;

      console.log(`BatchProcessor errors:   ${oldErrors}`);
      console.log(`OptimizedBatchProcessor errors: ${newErrors}`);

      // Both should handle errors gracefully
      expect(oldResult.result).toHaveLength(itemCount);
      expect(newResult.result).toHaveLength(itemCount);
    }, 15000);
  });

  describe('Medium Dataset Performance (200 items)', () => {
    const itemCount = 200;
    const processingDelay = 2; // ms
    let items: number[];

    beforeEach(() => {
      items = generateItems(itemCount);
    });

    it('should compare throughput with different concurrency levels', async () => {
      const processor = createSimpleProcessor(processingDelay);
      
      const concurrencyLevels = [5, 10, 20];
      const results: Array<{
        concurrency: number;
        old: { duration: number; throughput: number };
        new: { duration: number; throughput: number };
      }> = [];

      for (const concurrency of concurrencyLevels) {
        // Test BatchProcessor
        const oldResult = await measureTime(async () => {
          return await BatchProcessor.processBatch(items, processor, concurrency);
        });

        // Test OptimizedBatchProcessor
        const newResult = await measureTime(async () => {
          const optimizedProcessor = new OptimizedBatchProcessor({
            maxConcurrency: concurrency,
            retryAttempts: 1
          });
          return await optimizedProcessor.process(items, processor);
        });

        const oldThroughput = itemCount / (oldResult.duration / 1000); // items per second
        const newThroughput = itemCount / (newResult.duration / 1000); // items per second

        results.push({
          concurrency,
          old: { duration: oldResult.duration, throughput: oldThroughput },
          new: { duration: newResult.duration, throughput: newThroughput }
        });

        // Verify correctness
        expect(oldResult.result.filter(r => !(r instanceof Error))).toHaveLength(itemCount);
        expect(newResult.result.filter(r => !r.error)).toHaveLength(itemCount);
      }

      console.log(`\nThroughput Comparison (${itemCount} items):`);
      console.log('Concurrency | BatchProcessor      | OptimizedBatchProcessor | Improvement');
      console.log('------------|--------------------|-----------------------|------------');
      
      for (const result of results) {
        const improvement = ((result.new.throughput - result.old.throughput) / result.old.throughput * 100).toFixed(1);
        console.log(
          `${result.concurrency.toString().padStart(11)} | ` +
          `${result.old.throughput.toFixed(1).padStart(8)} items/s | ` +
          `${result.new.throughput.toFixed(1).padStart(11)} items/s | ` +
          `${improvement.padStart(9)}%`
        );
      }

      // At least one concurrency level should show improvement or comparable performance
      const hasImprovement = results.some(r => r.new.throughput >= r.old.throughput * 0.9);
      expect(hasImprovement).toBe(true);
    }, 30000);
  });

  describe('Retry Logic Performance Comparison', () => {
    const itemCount = 50;
    const processingDelay = 5;
    let items: number[];

    beforeEach(() => {
      items = generateItems(itemCount);
    });

    it('should compare performance with retry scenarios', async () => {
      const flakyProcessor = createFlakyProcessor(0.4, processingDelay); // 40% failure rate
      const batchSize = 5;

      // Test BatchProcessor (no retries)
      const oldResult = await measureTime(async () => {
        return await BatchProcessor.processBatch(items, flakyProcessor, batchSize);
      });

      // Test OptimizedBatchProcessor with retries
      const newResultWithRetries = await measureTime(async () => {
        const optimizedProcessor = new OptimizedBatchProcessor({
          maxConcurrency: batchSize,
          retryAttempts: 3,
          retryDelay: 10
        });
        return await optimizedProcessor.process(items, flakyProcessor);
      });

      // Test OptimizedBatchProcessor without retries for fair comparison
      const newResultNoRetries = await measureTime(async () => {
        const optimizedProcessor = new OptimizedBatchProcessor({
          maxConcurrency: batchSize,
          retryAttempts: 1
        });
        return await optimizedProcessor.process(items, flakyProcessor);
      });

      const oldErrors = oldResult.result.filter(r => r instanceof Error).length;
      const newErrorsWithRetries = newResultWithRetries.result.filter(r => r.error).length;
      const newErrorsNoRetries = newResultNoRetries.result.filter(r => r.error).length;

      console.log(`\nRetry Logic Performance (${itemCount} items, 40% failure rate):`);
      console.log(`BatchProcessor (no retries):         ${oldResult.duration.toFixed(2)}ms, ${oldErrors} errors`);
      console.log(`OptimizedBatchProcessor (no retries): ${newResultNoRetries.duration.toFixed(2)}ms, ${newErrorsNoRetries} errors`);
      console.log(`OptimizedBatchProcessor (3 retries):  ${newResultWithRetries.duration.toFixed(2)}ms, ${newErrorsWithRetries} errors`);

      // Verify that retries reduce error count
      expect(newErrorsWithRetries).toBeLessThan(newErrorsNoRetries);
      
      // Verify retry attempts are tracked
      const retriedItems = newResultWithRetries.result.filter(r => r.attempts && r.attempts > 1);
      expect(retriedItems.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Memory Usage Patterns', () => {
    it('should demonstrate memory efficiency with large batches', async () => {
      const itemCount = 1000;
      const items = generateItems(itemCount);
      const processor = createSimpleProcessor(1); // Very fast processing

      // Measure memory before
      const memBefore = process.memoryUsage();

      // Test both processors
      const oldResult = await BatchProcessor.processBatch(items, processor, 50);
      const memAfterOld = process.memoryUsage();

      const optimizedProcessor = new OptimizedBatchProcessor({
        maxConcurrency: 50,
        retryAttempts: 1
      });
      const newResult = await optimizedProcessor.process(items, processor);
      const memAfterNew = process.memoryUsage();

      console.log('\nMemory Usage Patterns (1000 items):');
      console.log(`Before:                    ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`After BatchProcessor:      ${(memAfterOld.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`After OptimizedBatchProcessor: ${(memAfterNew.heapUsed / 1024 / 1024).toFixed(2)} MB`);

      // Verify results are correct
      expect(oldResult.filter(r => !(r instanceof Error))).toHaveLength(itemCount);
      expect(newResult.filter(r => !r.error)).toHaveLength(itemCount);
    }, 15000);
  });

  describe('Progress Tracking Overhead', () => {
    it('should measure overhead of progress tracking', async () => {
      const itemCount = 100;
      const items = generateItems(itemCount);
      const processor = createSimpleProcessor(2);

      let progressCallbacks = 0;
      const onProgress = () => {
        progressCallbacks++;
      };

      // Test OptimizedBatchProcessor without progress tracking
      const withoutProgressResult = await measureTime(async () => {
        const optimizedProcessor = new OptimizedBatchProcessor({
          maxConcurrency: 10,
          retryAttempts: 1
        });
        return await optimizedProcessor.process(items, processor);
      });

      // Test OptimizedBatchProcessor with progress tracking
      progressCallbacks = 0;
      const withProgressResult = await measureTime(async () => {
        const optimizedProcessor = new OptimizedBatchProcessor({
          maxConcurrency: 10,
          retryAttempts: 1,
          onProgress
        });
        return await optimizedProcessor.process(items, processor);
      });

      console.log(`\nProgress Tracking Overhead (${itemCount} items):`);
      console.log(`Without progress: ${withoutProgressResult.duration.toFixed(2)}ms`);
      console.log(`With progress:    ${withProgressResult.duration.toFixed(2)}ms`);
      console.log(`Progress callbacks: ${progressCallbacks}`);
      console.log(`Overhead: ${(withProgressResult.duration - withoutProgressResult.duration).toFixed(2)}ms`);

      // Progress should be called for each completed item
      expect(progressCallbacks).toBe(itemCount);
      
      // Overhead should be minimal (less than 50% increase)
      const overhead = (withProgressResult.duration / withoutProgressResult.duration);
      expect(overhead).toBeLessThan(1.5);
    }, 15000);
  });
});