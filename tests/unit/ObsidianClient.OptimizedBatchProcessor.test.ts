import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn()
  }
}));

describe('ObsidianClient - OptimizedBatchProcessor integration', () => {
  let client: ObsidianClient;
  let mockAxiosInstance: Partial<AxiosInstance>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { timeout: 6000 } as any
    };
    
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as AxiosInstance);
    
    client = new ObsidianClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBatchFileContents with OptimizedBatchProcessor', () => {
    it('should process files successfully with retry capability', async () => {
      const files = ['file1.md', 'file2.md'];
      const contents = ['Content 1', 'Content 2'];
      
      // Mock axios responses
      (mockAxiosInstance.get as any)
        .mockResolvedValueOnce({ data: contents[0] })
        .mockResolvedValueOnce({ data: contents[1] });

      const result = await client.getBatchFileContents(files);

      // Verify axios was called for each file
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/file1.md');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/file2.md');

      // Verify result format is maintained
      expect(result).toContain('# file1.md');
      expect(result).toContain('Content 1');
      expect(result).toContain('# file2.md');
      expect(result).toContain('Content 2');
      expect(result).toContain('---');
    });

    it('should handle retries when file read fails temporarily', async () => {
      const files = ['flaky.md'];
      
      // Mock axios to fail once then succeed
      (mockAxiosInstance.get as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'Success after retries' });

      const result = await client.getBatchFileContents(files);

      // Verify axios was called 2 times (1 initial + 1 retry)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/flaky.md');
      
      expect(result).toContain('# flaky.md');
      expect(result).toContain('Success after retries');
    });

    it('should handle errors gracefully after retry exhaustion', async () => {
      const files = ['permanent-fail.md'];
      
      // Mock axios to always fail
      (mockAxiosInstance.get as any)
        .mockRejectedValue(new Error('Permanent failure'));

      const result = await client.getBatchFileContents(files);

      // Verify axios was called 2 times (retryAttempts=2 means 2 total attempts)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      
      expect(result).toContain('# permanent-fail.md');
      expect(result).toContain('Error reading file: Permanent failure');
    });

    it('should process mixed success and failure results', async () => {
      const files = ['success.md', 'error.md', 'another-success.md'];
      let callCount = 0;
      
      // Mock mixed responses - error.md will fail 2 times
      (mockAxiosInstance.get as any).mockImplementation((url: string) => {
        callCount++;
        
        if (url.includes('success.md') && !url.includes('another-success.md')) {
          return Promise.resolve({ data: 'Content 1' });
        } else if (url.includes('error.md')) {
          return Promise.reject(new Error('Not found'));
        } else if (url.includes('another-success.md')) {
          return Promise.resolve({ data: 'Content 3' });
        }
      });

      const result = await client.getBatchFileContents(files);

      // error.md should be called 2 times due to retries, others once each
      expect(callCount).toBe(4); // 1 + 2 + 1
      
      expect(result).toContain('# success.md');
      expect(result).toContain('Content 1');
      expect(result).toContain('# error.md');
      expect(result).toContain('Error reading file: Not found');
      expect(result).toContain('# another-success.md');
      expect(result).toContain('Content 3');
    });

    it('should process with appropriate concurrency', async () => {
      const files = Array.from({ length: 10 }, (_, i) => `file${i}.md`);
      
      // Mock all responses to succeed
      files.forEach((_, index) => {
        (mockAxiosInstance.get as any).mockResolvedValueOnce({ data: `Content ${index}` });
      });

      const result = await client.getBatchFileContents(files);

      // Verify all files were processed
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(10);
      
      // Verify results contain all files
      files.forEach((file, index) => {
        expect(result).toContain(`# ${file}`);
        expect(result).toContain(`Content ${index}`);
      });
    });
  });
});