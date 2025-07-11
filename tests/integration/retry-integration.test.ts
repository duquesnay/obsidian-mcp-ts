import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import axios, { AxiosInstance } from 'axios';

/**
 * Integration tests for retry logic in ObsidianClient
 * 
 * These tests validate that the retry logic is properly integrated into
 * the ObsidianClient and handles network failures gracefully.
 */
describe('Retry Logic Integration with ObsidianClient', () => {
  let client: ObsidianClient;
  
  beforeEach(() => {
    // Create client with test configuration
    client = new ObsidianClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Network Failure Recovery', () => {
    it('should retry on connection refused errors', async () => {
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:27124');
      (connectionError as any).code = 'ECONNREFUSED';
      
      // Mock axios instance directly
      const mockAxiosCreate = vi.spyOn(axios, 'create').mockReturnValue({
        get: vi.fn()
          .mockRejectedValueOnce(connectionError)
          .mockRejectedValueOnce(connectionError)
          .mockResolvedValue({ data: { files: ['test.md'] } }),
        defaults: { timeout: 6000 }
      } as any);
      
      // Start the operation
      const listPromise = client.listFilesInVault();
      
      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      
      const result = await listPromise;
      
      expect(result).toEqual(['test.md']);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it('should not retry on authentication errors (401)', async () => {
      const authError = new Error('Unauthorized') as any;
      authError.response = { status: 401, data: { message: 'Invalid API key' } };
      
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(authError);
      
      await expect(client.listFilesInVault()).rejects.toThrow('Request failed: Unauthorized');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should retry search operations with appropriate config', async () => {
      const timeoutError = new Error('Request timeout occurred');
      
      const mockPost = vi.spyOn(axios.AxiosInstance.prototype, 'post')
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({ data: { results: [], totalResults: 0 } });
      
      const searchPromise = client.search('test query');
      await vi.runAllTimersAsync();
      
      const result = await searchPromise;
      
      expect(result.results).toEqual([]);
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should retry write operations conservatively', async () => {
      const serverError = new Error('Internal Server Error') as any;
      serverError.response = { status: 500 };
      
      const mockPut = vi.spyOn(axios.AxiosInstance.prototype, 'put')
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({ data: {} });
      
      const createPromise = client.createFile('test.md', 'content');
      await vi.runAllTimersAsync();
      
      await createPromise;
      
      // Write operations should have conservative retry (maxRetries: 2)
      expect(mockPut).toHaveBeenCalledTimes(3);
    });

    it('should use heavy operation retry config for directory operations', async () => {
      const networkError = new Error('ECONNRESET');
      (networkError as any).code = 'ECONNRESET';
      
      const mockPatch = vi.spyOn(axios.AxiosInstance.prototype, 'patch')
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ 
          data: { 
            message: 'Directory moved',
            filesMovedCount: 5
          } 
        });
      
      const movePromise = client.moveDirectory('old-dir', 'new-dir');
      await vi.runAllTimersAsync();
      
      const result = await movePromise;
      
      expect(result.success).toBe(true);
      expect(result.filesMovedCount).toBe(5);
      // Heavy operations should have more retries (maxRetries: 5)
      expect(mockPatch).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Enhancement', () => {
    it('should enhance errors with retry information', async () => {
      const networkError = new Error('ENOTFOUND');
      (networkError as any).code = 'ENOTFOUND';
      
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(networkError);
      
      const listPromise = client.listFilesInVault();
      await vi.runAllTimersAsync();
      
      try {
        await listPromise;
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Operation failed after');
        expect(error.message).toContain('attempts over');
        expect(error.message).toContain('ENOTFOUND');
      }
    });

    it('should preserve HTTP status codes in enhanced errors', async () => {
      const serverError = new Error('Service Unavailable') as any;
      serverError.response = { status: 503 };
      
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(serverError);
      
      const listPromise = client.listFilesInVault();
      await vi.runAllTimersAsync();
      
      try {
        await listPromise;
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(503);
        expect(error.response).toBeDefined();
        expect(error.response.status).toBe(503);
      }
    });
  });

  describe('Retry Configuration Validation', () => {
    it('should use read config for file operations', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const timeoutError = new Error('timeout');
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(timeoutError);
      
      const getPromise = client.getFileContents('test.md');
      await vi.runAllTimersAsync();
      
      try {
        await getPromise;
      } catch (error) {
        // Read operations should have 4 retries
        expect(mockGet).toHaveBeenCalledTimes(5); // initial + 4 retries
      }
      
      consoleSpy.mockRestore();
    });

    it('should use search config for search operations', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const searchError = new Error('search timeout');
      const mockPost = vi.spyOn(axios.AxiosInstance.prototype, 'post')
        .mockRejectedValue(searchError);
      
      const searchPromise = client.advancedSearch({}, {});
      await vi.runAllTimersAsync();
      
      try {
        await searchPromise;
      } catch (error) {
        // Search operations should have 3 retries
        expect(mockPost).toHaveBeenCalledTimes(4); // initial + 3 retries
      }
      
      consoleSpy.mockRestore();
    });

    it('should use write config for content modifications', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const networkError = new Error('ECONNRESET');
      (networkError as any).code = 'ECONNRESET';
      
      const mockPost = vi.spyOn(axios.AxiosInstance.prototype, 'post')
        .mockRejectedValue(networkError);
      
      const appendPromise = client.appendContent('test.md', 'content');
      await vi.runAllTimersAsync();
      
      try {
        await appendPromise;
      } catch (error) {
        // Write operations should have conservative 2 retries
        expect(mockPost).toHaveBeenCalledTimes(3); // initial + 2 retries
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Timing', () => {
    it('should respect exponential backoff timing', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(networkError);
      
      const listPromise = client.listFilesInVault();
      
      // Fast forward through all timers
      await vi.runAllTimersAsync();
      
      try {
        await listPromise;
      } catch (error) {
        // Should have called setTimeout for delays
        expect(setTimeoutSpy).toHaveBeenCalled();
        
        // Check that delays increase (exponential backoff)
        const delays = setTimeoutSpy.mock.calls.map(call => call[1] as number);
        expect(delays.length).toBeGreaterThan(0);
      }
      
      setTimeoutSpy.mockRestore();
    });

    it('should add jitter to prevent thundering herd', async () => {
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(networkError);
      
      const listPromise = client.listFilesInVault();
      await vi.runAllTimersAsync();
      
      try {
        await listPromise;
      } catch (error) {
        // Should have applied jitter (random factor) to delays
        expect(mathRandomSpy).toHaveBeenCalled();
      }
      
      mathRandomSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle Obsidian plugin restart gracefully', async () => {
      // Simulate Obsidian plugin being restarted (503 then success)
      const serviceUnavailable = new Error('Service Unavailable') as any;
      serviceUnavailable.response = { status: 503 };
      
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValueOnce(serviceUnavailable)
        .mockResolvedValue({ data: { files: ['recovered.md'] } });
      
      const listPromise = client.listFilesInVault();
      await vi.runAllTimersAsync();
      
      const result = await listPromise;
      
      expect(result).toEqual(['recovered.md']);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('should handle network blips during heavy operations', async () => {
      // Simulate multiple network issues during directory copy
      const errors = [
        Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' }),
        Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }),
        Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
      ];
      
      const mockPost = vi.spyOn(axios.AxiosInstance.prototype, 'post')
        .mockRejectedValueOnce(errors[0])
        .mockRejectedValueOnce(errors[1])
        .mockRejectedValueOnce(errors[2])
        .mockResolvedValue({ 
          data: { 
            filesCopied: 42, 
            failedFiles: [],
            message: 'Directory copied successfully after retry'
          } 
        });
      
      const copyPromise = client.copyDirectory('source', 'destination');
      await vi.runAllTimersAsync();
      
      const result = await copyPromise;
      
      expect(result.filesCopied).toBe(42);
      expect(result.failedFiles).toEqual([]);
      expect(mockPost).toHaveBeenCalledTimes(4);
    });

    it('should fail gracefully when retry limit exceeded', async () => {
      const persistentError = new Error('ECONNREFUSED');
      (persistentError as any).code = 'ECONNREFUSED';
      
      const mockGet = vi.spyOn(axios.AxiosInstance.prototype, 'get')
        .mockRejectedValue(persistentError);
      
      const listPromise = client.listFilesInVault();
      await vi.runAllTimersAsync();
      
      try {
        await listPromise;
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Operation failed after');
        expect(error.message).toContain('attempts over');
        expect(error.message).toContain('ECONNREFUSED');
        // Should have attempted: initial + 4 retries for read operations
        expect(mockGet).toHaveBeenCalledTimes(5);
      }
    });
  });
});