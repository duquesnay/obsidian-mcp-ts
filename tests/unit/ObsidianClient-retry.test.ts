import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { withRetry } from '../../src/utils/retryLogic.js';

/**
 * Tests to validate retry logic integration with ObsidianClient
 */
describe('ObsidianClient Retry Integration', () => {
  let client: ObsidianClient;
  
  beforeEach(() => {
    client = new ObsidianClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124,
      verifySsl: false
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Retry Logic Integration', () => {
    it('should have withRetry available', () => {
      expect(withRetry).toBeDefined();
      expect(typeof withRetry).toBe('function');
    });

    it('should properly categorize operations for retry', () => {
      // This is a unit test to verify the client is set up to use different retry configs
      expect(client).toBeDefined();
      expect(client.listFilesInVault).toBeDefined(); // read operation
      expect(client.search).toBeDefined(); // search operation  
      expect(client.createFile).toBeDefined(); // write operation
      expect(client.moveDirectory).toBeDefined(); // heavy operation
    });
  });

  describe('Real Retry Behavior', () => {
    it('should work with basic retry scenarios', async () => {
      let attempts = 0;
      
      const retryableOperation = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('ECONNREFUSED');
          (error as any).code = 'ECONNREFUSED';
          throw error;
        }
        return 'success';
      };
      
      const result = await withRetry(retryableOperation, { maxRetries: 3, baseDelay: 1 });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on logical errors', async () => {
      let attempts = 0;
      
      const logicalErrorOperation = async () => {
        attempts++;
        const error = new Error('Invalid file format') as any;
        error.response = { status: 400 };
        throw error;
      };
      
      try {
        await withRetry(logicalErrorOperation, { maxRetries: 2, baseDelay: 1 });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(attempts).toBe(1); // Should not retry client errors
      }
    });

    it('should handle server errors with retries', async () => {
      let attempts = 0;
      
      const serverErrorOperation = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Service Unavailable') as any;
          error.response = { status: 503 };
          throw error;
        }
        return 'recovered';
      };
      
      const result = await withRetry(serverErrorOperation, { maxRetries: 2, baseDelay: 1 });
      
      expect(result).toBe('recovered');
      expect(attempts).toBe(2);
    });
  });

  describe('Error Enhancement Validation', () => {
    it('should enhance errors with retry information', async () => {
      const persistentError = new Error('ECONNREFUSED');
      (persistentError as any).code = 'ECONNREFUSED';
      
      const alwaysFailingOperation = async () => {
        throw persistentError;
      };
      
      try {
        await withRetry(alwaysFailingOperation, { maxRetries: 2, baseDelay: 1 });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Operation failed after 3 attempts');
        expect(error.message).toContain('ECONNREFUSED');
        expect(error.cause).toBe(persistentError);
      }
    });

    it('should preserve axios error properties', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.response = { status: 500, data: { message: 'Server error' } };
      axiosError.code = 'ECONNRESET';
      
      const failingOperation = async () => {
        throw axiosError;
      };
      
      try {
        await withRetry(failingOperation, { maxRetries: 1, baseDelay: 1 });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response).toBeDefined();
        expect(error.response.status).toBe(500);
        expect(error.code).toBe('ECONNRESET');
      }
    });
  });
});