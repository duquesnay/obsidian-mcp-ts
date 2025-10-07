import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceMetadataUtil } from './ResourceMetadataUtil.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';

describe('ResourceMetadataUtil', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    ResourceMetadataUtil.clearCache();
  });

  describe('formatSize', () => {
    it('should format zero bytes', () => {
      expect(ResourceMetadataUtil.formatSize(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(ResourceMetadataUtil.formatSize(512)).toBe('512 B');
      expect(ResourceMetadataUtil.formatSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(ResourceMetadataUtil.formatSize(1024)).toBe('1.00 KB');
      expect(ResourceMetadataUtil.formatSize(1536)).toBe('1.50 KB');
      expect(ResourceMetadataUtil.formatSize(2048)).toBe('2.00 KB');
    });

    it('should format megabytes', () => {
      expect(ResourceMetadataUtil.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(ResourceMetadataUtil.formatSize(1024 * 1024 * 1.5)).toBe('1.50 MB');
      expect(ResourceMetadataUtil.formatSize(1024 * 1024 * 10)).toBe('10.00 MB');
    });

    it('should format gigabytes', () => {
      expect(ResourceMetadataUtil.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(ResourceMetadataUtil.formatSize(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
    });

    it('should format terabytes', () => {
      expect(ResourceMetadataUtil.formatSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
      expect(ResourceMetadataUtil.formatSize(1024 * 1024 * 1024 * 1024 * 3.14159)).toBe('3.14 TB');
    });

    it('should round to 2 decimal places', () => {
      expect(ResourceMetadataUtil.formatSize(1536)).toBe('1.50 KB');
      expect(ResourceMetadataUtil.formatSize(1234567)).toBe('1.18 MB');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp as ISO 8601', () => {
      const timestamp = new Date('2025-10-07T14:30:00Z').getTime();
      expect(ResourceMetadataUtil.formatTimestamp(timestamp)).toBe('2025-10-07T14:30:00.000Z');
    });

    it('should handle different timestamps', () => {
      const timestamp = new Date('2024-01-01T00:00:00Z').getTime();
      expect(ResourceMetadataUtil.formatTimestamp(timestamp)).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should always return UTC time', () => {
      const timestamp = Date.now();
      const result = ResourceMetadataUtil.formatTimestamp(timestamp);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('fetchMetadata', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        getFileContents: vi.fn()
      };
    });

    it('should fetch and format metadata from ObsidianClient', async () => {
      const testTimestamp = 1728310200000; // 2024-10-07T14:10:00Z
      const mockResponse = {
        path: 'test/note.md',
        stat: {
          ctime: 1704067200000, // 2024-01-01T00:00:00Z
          mtime: testTimestamp,
          size: 2048
        }
      };

      mockClient.getFileContents.mockResolvedValue(mockResponse);

      const result = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test/note.md');

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test/note.md', 'metadata');
      expect(result).toEqual({
        size: 2048,
        sizeFormatted: '2.00 KB',
        lastModified: new Date(testTimestamp).toISOString()
      });
    });

    it('should return null on error', async () => {
      mockClient.getFileContents.mockRejectedValue(new Error('Network error'));

      const result = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test/note.md');

      expect(result).toBeNull();
    });

    it('should return null for invalid metadata format', async () => {
      mockClient.getFileContents.mockResolvedValue({ invalid: 'data' });

      const result = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test/note.md');

      expect(result).toBeNull();
    });

    it('should handle different file sizes', async () => {
      const testCases = [
        { size: 0, expected: '0 B' },
        { size: 512, expected: '512 B' },
        { size: 1024, expected: '1.00 KB' },
        { size: 1048576, expected: '1.00 MB' }
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        // Use unique filepath for each test case to avoid cache collisions
        const filepath = `test-${i}.md`;

        mockClient.getFileContents.mockResolvedValue({
          stat: { ctime: 0, mtime: 0, size: testCase.size }
        });

        const result = await ResourceMetadataUtil.fetchMetadata(mockClient, filepath);
        expect(result?.sizeFormatted).toBe(testCase.expected);
      }
    });
  });

  describe('batchFetchMetadata', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        getFileContents: vi.fn()
      };
    });

    it('should fetch metadata for multiple files', async () => {
      const mockResponses = [
        { stat: { ctime: 0, mtime: 1728310200000, size: 1024 } },
        { stat: { ctime: 0, mtime: 1728310200000, size: 2048 } },
        { stat: { ctime: 0, mtime: 1728310200000, size: 4096 } }
      ];

      mockClient.getFileContents.mockImplementation((filepath: string) => {
        const index = ['file1.md', 'file2.md', 'file3.md'].indexOf(filepath);
        return Promise.resolve(mockResponses[index]);
      });

      const result = await ResourceMetadataUtil.batchFetchMetadata(
        mockClient,
        ['file1.md', 'file2.md', 'file3.md']
      );

      expect(result.size).toBe(3);
      expect(result.get('file1.md')?.sizeFormatted).toBe('1.00 KB');
      expect(result.get('file2.md')?.sizeFormatted).toBe('2.00 KB');
      expect(result.get('file3.md')?.sizeFormatted).toBe('4.00 KB');
    });

    it('should handle empty file list', async () => {
      const result = await ResourceMetadataUtil.batchFetchMetadata(mockClient, []);
      expect(result.size).toBe(0);
    });

    it('should handle errors for individual files gracefully', async () => {
      mockClient.getFileContents.mockImplementation((filepath: string) => {
        if (filepath === 'error.md') {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve({ stat: { ctime: 0, mtime: 0, size: 1024 } });
      });

      const result = await ResourceMetadataUtil.batchFetchMetadata(
        mockClient,
        ['success.md', 'error.md']
      );

      expect(result.size).toBe(2);
      expect(result.get('success.md')?.size).toBe(1024);
      expect(result.get('error.md')).toBeNull(); // null on error
    });

    it('should process files in batches', async () => {
      const files = Array.from({ length: 12 }, (_, i) => `file${i}.md`);
      mockClient.getFileContents.mockResolvedValue({
        stat: { ctime: 0, mtime: 0, size: 1024 }
      });

      const result = await ResourceMetadataUtil.batchFetchMetadata(mockClient, files);

      expect(result.size).toBe(12);
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(12);
    });
  });

  describe('caching', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        getFileContents: vi.fn()
      };
    });

    it('should cache metadata on first fetch', async () => {
      const mockResponse = {
        stat: { ctime: 0, mtime: 1728310200000, size: 2048 }
      };
      mockClient.getFileContents.mockResolvedValue(mockResponse);

      // First fetch - should hit API
      const result1 = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test.md');
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(1);
      expect(result1?.size).toBe(2048);

      // Second fetch - should use cache
      const result2 = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test.md');
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(1); // No additional calls
      expect(result2?.size).toBe(2048);
      expect(result2).toEqual(result1);
    });

    it('should cache different files separately', async () => {
      mockClient.getFileContents.mockImplementation((filepath: string) => {
        if (filepath === 'file1.md') {
          return Promise.resolve({ stat: { ctime: 0, mtime: 0, size: 1024 } });
        }
        return Promise.resolve({ stat: { ctime: 0, mtime: 0, size: 2048 } });
      });

      // Fetch both files
      const result1 = await ResourceMetadataUtil.fetchMetadata(mockClient, 'file1.md');
      const result2 = await ResourceMetadataUtil.fetchMetadata(mockClient, 'file2.md');

      expect(mockClient.getFileContents).toHaveBeenCalledTimes(2);
      expect(result1?.size).toBe(1024);
      expect(result2?.size).toBe(2048);

      // Fetch again - should use cache
      const result1Cached = await ResourceMetadataUtil.fetchMetadata(mockClient, 'file1.md');
      const result2Cached = await ResourceMetadataUtil.fetchMetadata(mockClient, 'file2.md');

      expect(mockClient.getFileContents).toHaveBeenCalledTimes(2); // No additional calls
      expect(result1Cached).toEqual(result1);
      expect(result2Cached).toEqual(result2);
    });

    it('should invalidate specific cache entry', async () => {
      const mockResponse = {
        stat: { ctime: 0, mtime: 1728310200000, size: 2048 }
      };
      mockClient.getFileContents.mockResolvedValue(mockResponse);

      // First fetch - should hit API
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'test.md');
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(1);

      // Invalidate cache
      ResourceMetadataUtil.invalidateCache('test.md');

      // Next fetch - should hit API again
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'test.md');
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(2);
    });

    it('should clear entire cache', async () => {
      mockClient.getFileContents.mockResolvedValue({
        stat: { ctime: 0, mtime: 0, size: 1024 }
      });

      // Cache multiple files
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'file1.md');
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'file2.md');
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'file3.md');
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(3);

      // Clear cache
      ResourceMetadataUtil.clearCache();

      // All fetches should hit API again
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'file1.md');
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'file2.md');
      await ResourceMetadataUtil.fetchMetadata(mockClient, 'file3.md');
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(6);
    });

    it('should not cache null results on error', async () => {
      mockClient.getFileContents
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ stat: { ctime: 0, mtime: 0, size: 1024 } });

      // First fetch - error, should not cache
      const result1 = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test.md');
      expect(result1).toBeNull();
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(1);

      // Second fetch - should retry API (not cached)
      const result2 = await ResourceMetadataUtil.fetchMetadata(mockClient, 'test.md');
      expect(result2?.size).toBe(1024);
      expect(mockClient.getFileContents).toHaveBeenCalledTimes(2);
    });
  });
});
