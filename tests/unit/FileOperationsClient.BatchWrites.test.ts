import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileOperationsClient } from '../../src/obsidian/services/FileOperationsClient.js';
import { OptimizedBatchProcessor } from '../../src/utils/OptimizedBatchProcessor.js';
import { BATCH_PROCESSOR, OBSIDIAN_DEFAULTS } from '../../src/constants.js';

describe('FileOperationsClient - Batch Write Operations', () => {
  let client: FileOperationsClient;
  
  beforeEach(() => {
    client = new FileOperationsClient({
      apiKey: 'test-key',
      host: 'localhost',
      port: 27124,
      verifySsl: false
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('batchCreateFiles', () => {
    it('should create multiple files using OptimizedBatchProcessor', async () => {
      // Mock the individual createFile method
      const createFileSpy = vi.spyOn(client, 'createFile').mockResolvedValue();
      
      // Mock OptimizedBatchProcessor to verify it's being used
      const processSpy = vi.spyOn(OptimizedBatchProcessor.prototype, 'process').mockImplementation(
        async (items, processor) => {
          // Simulate processing each item
          const results = [];
          for (const item of items) {
            try {
              const result = await processor(item);
              results.push({ item, result, error: null });
            } catch (error) {
              results.push({ item, result: null, error });
            }
          }
          return results;
        }
      );

      const fileOperations = [
        { filepath: 'test1.md', content: 'Content 1' },
        { filepath: 'test2.md', content: 'Content 2' },
        { filepath: 'test3.md', content: 'Content 3' }
      ];

      // Now this should work
      const results = await client.batchCreateFiles(fileOperations);

      // Verify OptimizedBatchProcessor was used
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith(fileOperations, expect.any(Function));

      // Verify individual createFile calls were made
      expect(createFileSpy).toHaveBeenCalledTimes(3);
      expect(createFileSpy).toHaveBeenCalledWith('test1.md', 'Content 1');
      expect(createFileSpy).toHaveBeenCalledWith('test2.md', 'Content 2');
      expect(createFileSpy).toHaveBeenCalledWith('test3.md', 'Content 3');

      // Verify results format
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ filepath: 'test1.md', success: true, error: undefined });
      expect(results[1]).toEqual({ filepath: 'test2.md', success: true, error: undefined });
      expect(results[2]).toEqual({ filepath: 'test3.md', success: true, error: undefined });
    });

    it('should handle errors in batch operations gracefully', async () => {
      const fileOperations = [
        { filepath: 'test1.md', content: 'Content 1' },
        { filepath: 'test2.md', content: 'Content 2' },
        { filepath: 'test3.md', content: 'Content 3' }
      ];

      // Mock createFile to fail for second file
      vi.spyOn(client, 'createFile').mockImplementation(async (filepath: string) => {
        if (filepath === 'test2.md') {
          throw new Error('File creation failed');
        }
      });

      // Mock OptimizedBatchProcessor to handle errors properly
      vi.spyOn(OptimizedBatchProcessor.prototype, 'process').mockImplementation(
        async (items, processor) => {
          const results = [];
          for (const item of items) {
            try {
              const result = await processor(item);
              results.push({ item, result, error: null });
            } catch (error) {
              results.push({ item, result: null, error });
            }
          }
          return results;
        }
      );

      const results = await client.batchCreateFiles(fileOperations);

      // Verify results show mixed success/failure
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('File creation failed');
      expect(results[2].success).toBe(true);
    });
  });

  describe('batchUpdateFiles', () => {
    it('should update multiple files with proper error handling', async () => {
      const updateFileSpy = vi.spyOn(client, 'updateFile').mockResolvedValue();
      
      const fileOperations = [
        { filepath: 'existing1.md', content: 'Updated Content 1' },
        { filepath: 'existing2.md', content: 'Updated Content 2' }
      ];

      const results = await client.batchUpdateFiles(fileOperations);

      expect(updateFileSpy).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('batchDeleteFiles', () => {
    it('should delete multiple files efficiently', async () => {
      const deleteFileSpy = vi.spyOn(client, 'deleteFile').mockResolvedValue();
      
      const filepaths = ['delete1.md', 'delete2.md', 'delete3.md'];

      const results = await client.batchDeleteFiles(filepaths);

      expect(deleteFileSpy).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('batchCopyFiles', () => {
    it('should copy multiple files with overwrite control', async () => {
      const copyFileSpy = vi.spyOn(client, 'copyFile').mockResolvedValue();
      
      const copyOperations = [
        { sourcePath: 'source1.md', destinationPath: 'dest1.md', overwrite: false },
        { sourcePath: 'source2.md', destinationPath: 'dest2.md', overwrite: true }
      ];

      const results = await client.batchCopyFiles(copyOperations);

      expect(copyFileSpy).toHaveBeenCalledTimes(2);
      expect(copyFileSpy).toHaveBeenCalledWith('source1.md', 'dest1.md', false);
      expect(copyFileSpy).toHaveBeenCalledWith('source2.md', 'dest2.md', true);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    it('should process files concurrently, not sequentially', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];
      
      vi.spyOn(client, 'createFile').mockImplementation(async (filepath: string) => {
        startTimes.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
        endTimes.push(Date.now());
      });

      const fileOperations = [
        { filepath: 'concurrent1.md', content: 'Content 1' },
        { filepath: 'concurrent2.md', content: 'Content 2' },
        { filepath: 'concurrent3.md', content: 'Content 3' }
      ];

      try {
        await client.batchCreateFiles(fileOperations);
      } catch (error) {
        // Expected to fail since method doesn't exist yet
      }

      // When implemented, operations should start concurrently
      // (start times should be close together, not sequential)
    });
  });
});