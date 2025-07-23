import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptimizedBatchProcessor } from './OptimizedBatchProcessor.js';

// @TODO test in the source base?

describe('OptimizedBatchProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('process method', () => {
    it('should process all items with concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const processor = vi.fn(async (num: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return num * 2;
      });

      const batchProcessor = new OptimizedBatchProcessor({ maxConcurrency: 2 });
      const results = await batchProcessor.process(items, processor);

      expect(results).toHaveLength(6);
      expect(results.map(r => r.result)).toEqual([2, 4, 6, 8, 10, 12]);
      expect(processor).toHaveBeenCalledTimes(6);
    });

    it('should handle errors gracefully', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn(async (num: number) => {
        if (num === 2) throw new Error('Test error');
        return num * 2;
      });

      const batchProcessor = new OptimizedBatchProcessor({ retryAttempts: 1 });
      const results = await batchProcessor.process(items, processor);

      expect(results[0].result).toBe(2);
      expect(results[1].error?.message).toBe('Test error');
      expect(results[2].result).toBe(6);
    });

    it('should retry failed operations', async () => {
      let callCount = 0;
      const processor = vi.fn(async () => {
        callCount++;
        if (callCount < 3) throw new Error('Retry test');
        return 'success';
      });

      const batchProcessor = new OptimizedBatchProcessor({
        retryAttempts: 3,
        retryDelay: 1
      });
      const results = await batchProcessor.process(['item'], processor);

      expect(results[0].result).toBe('success');
      expect(results[0].attempts).toBe(3);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should call progress callback', async () => {
      const items = [1, 2, 3, 4];
      const onProgress = vi.fn();
      const processor = vi.fn(async (num: number) => num * 2);

      const batchProcessor = new OptimizedBatchProcessor({
        maxConcurrency: 2,
        onProgress
      });
      await batchProcessor.process(items, processor);

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenLastCalledWith(4, 4);
    });

    it('should maintain order of results', async () => {
      const items = [1, 2, 3, 4, 5];
      const delays = [50, 10, 30, 5, 20];

      const processor = vi.fn(async (num: number) => {
        await new Promise(resolve => setTimeout(resolve, delays[num - 1]));
        return num * 10;
      });

      const batchProcessor = new OptimizedBatchProcessor({ maxConcurrency: 3 });
      const results = await batchProcessor.process(items, processor);

      // Results should be in original order despite different completion times
      expect(results.map(r => r.result)).toEqual([10, 20, 30, 40, 50]);
    });
  });

  describe('processBatches method', () => {
    it('should process items in sequential batches', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const processor = vi.fn(async (num: number) => num * 2);

      const batchProcessor = new OptimizedBatchProcessor({ batchSize: 2 });
      const results = await batchProcessor.processBatches(items, processor);

      expect(results).toHaveLength(6);
      expect(results.map(r => r.result)).toEqual([2, 4, 6, 8, 10, 12]);
    });

    it('should wait for entire batch before processing next', async () => {
      const items = [1, 2, 3, 4];
      const completionOrder: number[] = [];

      const processor = vi.fn(async (num: number) => {
        const delay = num % 2 === 0 ? 10 : 50; // Even numbers are fast
        await new Promise(resolve => setTimeout(resolve, delay));
        completionOrder.push(num);
        return num;
      });

      const batchProcessor = new OptimizedBatchProcessor({ batchSize: 2 });
      await batchProcessor.processBatches(items, processor);

      // Batch 1 (1,2) should complete before batch 2 (3,4) starts
      // So we should see [2,1] or [1,2], then [4,3] or [3,4]
      const firstBatch = completionOrder.slice(0, 2).sort();
      const secondBatch = completionOrder.slice(2, 4).sort();

      expect(firstBatch).toEqual([1, 2]);
      expect(secondBatch).toEqual([3, 4]);
    });
  });

  describe('processStream method', () => {
    it('should yield results as they complete', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn(async (num: number) => {
        await new Promise(resolve => setTimeout(resolve, num * 10));
        return num * 2;
      });

      const batchProcessor = new OptimizedBatchProcessor({ maxConcurrency: 2 });
      const results: number[] = [];

      for await (const result of batchProcessor.processStream(items, processor)) {
        if (result.result) {
          results.push(result.result);
        }
      }

      expect(results).toHaveLength(3);
      expect(results.sort()).toEqual([2, 4, 6]);
    });

    it('should handle errors in stream', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn(async (num: number) => {
        if (num === 2) throw new Error('Stream error');
        return num * 2;
      });

      const batchProcessor = new OptimizedBatchProcessor({ retryAttempts: 1 });
      const results = [];
      const errors = [];

      for await (const result of batchProcessor.processStream(items, processor)) {
        if (result.error) {
          errors.push(result.error.message);
        } else {
          results.push(result.result);
        }
      }

      expect(results).toEqual([2, 6]);
      expect(errors).toEqual(['Stream error']);
    });
  });

  describe('static processSimple method', () => {
    it('should provide simple interface for batch processing', async () => {
      const items = [1, 2, 3, 4];
      const processor = vi.fn(async (num: number) => num * 3);

      const results = await OptimizedBatchProcessor.processSimple(
        items,
        processor,
        { maxConcurrency: 2 }
      );

      expect(results).toEqual([3, 6, 9, 12]);
    });

    it('should return errors for failed items', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn(async (num: number) => {
        if (num === 2) throw new Error('Simple error');
        return num;
      });

      const results = await OptimizedBatchProcessor.processSimple(items, processor);

      expect(results[0]).toBe(1);
      expect(results[1]).toBeInstanceOf(Error);
      expect((results[1] as Error).message).toBe('Simple error');
      expect(results[2]).toBe(3);
    });
  });
});
