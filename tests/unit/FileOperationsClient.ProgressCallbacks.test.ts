import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileOperationsClient } from '../../src/obsidian/services/FileOperationsClient.js';

describe('FileOperationsClient - Progress Callback Support', () => {
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

  describe('batchCreateFiles with progress callback', () => {
    it('should report progress during batch creation', async () => {
      // Mock the individual createFile method
      vi.spyOn(client, 'createFile').mockImplementation(async (filepath: string) => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const fileOperations = [
        { filepath: 'test1.md', content: 'Content 1' },
        { filepath: 'test2.md', content: 'Content 2' },
        { filepath: 'test3.md', content: 'Content 3' },
        { filepath: 'test4.md', content: 'Content 4' },
        { filepath: 'test5.md', content: 'Content 5' }
      ];

      const progressUpdates: Array<{ completed: number; total: number }> = [];
      const onProgress = (completed: number, total: number) => {
        progressUpdates.push({ completed, total });
      };

      const results = await client.batchCreateFiles(fileOperations, { onProgress });

      // Verify progress was reported
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(5);
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(5);

      // Verify results
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should work without progress callback', async () => {
      vi.spyOn(client, 'createFile').mockResolvedValue();

      const fileOperations = [
        { filepath: 'test1.md', content: 'Content 1' },
        { filepath: 'test2.md', content: 'Content 2' }
      ];

      // Should work without progress callback (backward compatibility)
      const results = await client.batchCreateFiles(fileOperations);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('batchUpdateFiles with progress callback', () => {
    it('should report progress during batch update', async () => {
      vi.spyOn(client, 'updateFile').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const fileOperations = [
        { filepath: 'existing1.md', content: 'Updated Content 1' },
        { filepath: 'existing2.md', content: 'Updated Content 2' },
        { filepath: 'existing3.md', content: 'Updated Content 3' }
      ];

      const progressUpdates: Array<{ completed: number; total: number }> = [];
      const onProgress = (completed: number, total: number) => {
        progressUpdates.push({ completed, total });
      };

      const results = await client.batchUpdateFiles(fileOperations, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(3);
      expect(results).toHaveLength(3);
    });
  });

  describe('batchDeleteFiles with progress callback', () => {
    it('should report progress during batch deletion', async () => {
      vi.spyOn(client, 'deleteFile').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const filepaths = ['delete1.md', 'delete2.md', 'delete3.md', 'delete4.md'];

      const progressUpdates: Array<{ completed: number; total: number }> = [];
      const onProgress = (completed: number, total: number) => {
        progressUpdates.push({ completed, total });
      };

      const results = await client.batchDeleteFiles(filepaths, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(4);
      expect(results).toHaveLength(4);
    });
  });

  describe('batchCopyFiles with progress callback', () => {
    it('should report progress during batch copy', async () => {
      vi.spyOn(client, 'copyFile').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const copyOperations = [
        { sourcePath: 'source1.md', destinationPath: 'dest1.md' },
        { sourcePath: 'source2.md', destinationPath: 'dest2.md' },
        { sourcePath: 'source3.md', destinationPath: 'dest3.md' }
      ];

      const progressUpdates: Array<{ completed: number; total: number }> = [];
      const onProgress = (completed: number, total: number) => {
        progressUpdates.push({ completed, total });
      };

      const results = await client.batchCopyFiles(copyOperations, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(3);
      expect(results).toHaveLength(3);
    });
  });

  describe('getBatchFileContents with progress callback', () => {
    it('should report progress during batch read', async () => {
      vi.spyOn(client, 'getFileContents').mockImplementation(async (filepath: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `Content of ${filepath}`;
      });

      const filepaths = ['read1.md', 'read2.md', 'read3.md'];

      const progressUpdates: Array<{ completed: number; total: number }> = [];
      const onProgress = (completed: number, total: number) => {
        progressUpdates.push({ completed, total });
      };

      const result = await client.getBatchFileContents(filepaths, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(3);
      expect(result).toContain('read1.md');
      expect(result).toContain('read2.md');
      expect(result).toContain('read3.md');
    });
  });
});