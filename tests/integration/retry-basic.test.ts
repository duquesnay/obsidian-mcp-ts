import { describe, it, expect } from 'vitest';
import { withRetry, createRetryConfig } from '../../src/utils/retryLogic.js';

/**
 * Basic integration test to validate retry logic works end-to-end
 */
describe('Retry Logic Basic Integration', () => {
  it('should work with real async operations', async () => {
    let attempts = 0;
    
    const unstableOperation = async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('ECONNREFUSED');
        (error as any).code = 'ECONNREFUSED';
        throw error;
      }
      return 'success';
    };
    
    const result = await withRetry(unstableOperation, { maxRetries: 3, baseDelay: 10 });
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should work with different operation types', async () => {
    const readConfig = createRetryConfig('read');
    const writeConfig = createRetryConfig('write');
    const heavyConfig = createRetryConfig('heavy');
    const searchConfig = createRetryConfig('search');
    
    expect(readConfig.maxRetries).toBe(4);
    expect(writeConfig.maxRetries).toBe(2);
    expect(heavyConfig.maxRetries).toBe(5);
    expect(searchConfig.maxRetries).toBe(3);
    
    expect(readConfig.baseDelay).toBe(500);
    expect(writeConfig.baseDelay).toBe(1500);
    expect(heavyConfig.baseDelay).toBe(2000);
    expect(searchConfig.baseDelay).toBe(1000);
  });

  it('should handle real network errors correctly', async () => {
    const networkErrors = [
      Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
      Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }),
      Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }),
      new Error('Request timeout occurred'),
      new Error('self-signed certificate in certificate chain')
    ];
    
    for (const error of networkErrors) {
      let attempts = 0;
      
      const flakyOperation = async () => {
        attempts++;
        if (attempts === 1) {
          throw error;
        }
        return `recovered from ${error.message}`;
      };
      
      const result = await withRetry(flakyOperation, { maxRetries: 1, baseDelay: 1 });
      expect(result).toContain('recovered from');
      expect(attempts).toBe(2);
    }
  });

  it('should not retry client errors', async () => {
    const clientErrors = [
      Object.assign(new Error('Bad Request'), { response: { status: 400 } }),
      Object.assign(new Error('Unauthorized'), { response: { status: 401 } }),
      Object.assign(new Error('Forbidden'), { response: { status: 403 } }),
      Object.assign(new Error('Not Found'), { response: { status: 404 } })
    ];
    
    // First test the retry condition directly
    const { retryCondition } = createRetryConfig('read');
    for (const error of clientErrors) {
      expect(retryCondition!(error), `Should not retry ${error.message}`).toBe(false);
    }
    
    // Now test with actual retry
    for (const error of clientErrors) {
      let attempts = 0;
      
      const failingOperation = async () => {
        attempts++;
        throw error;
      };
      
      try {
        await withRetry(failingOperation, createRetryConfig('read'));
        expect.fail(`Should have thrown an error for ${error.message}`);
      } catch (caught: any) {
        expect(attempts, `Attempts for ${error.message}`).toBe(1); // Should not retry
        expect(caught.message).toContain('Operation failed after 1 attempts');
      }
    }
  });

  it('should retry server errors', async () => {
    const serverErrors = [
      Object.assign(new Error('Internal Server Error'), { response: { status: 500 } }),
      Object.assign(new Error('Bad Gateway'), { response: { status: 502 } }),
      Object.assign(new Error('Service Unavailable'), { response: { status: 503 } }),
      Object.assign(new Error('Too Many Requests'), { response: { status: 429 } })
    ];
    
    for (const error of serverErrors) {
      let attempts = 0;
      
      const flakyOperation = async () => {
        attempts++;
        if (attempts === 1) {
          throw error;
        }
        return `recovered from ${error.response.status}`;
      };
      
      const result = await withRetry(flakyOperation, { maxRetries: 1, baseDelay: 1 });
      expect(result).toContain('recovered from');
      expect(attempts).toBe(2);
    }
  });

  it('should preserve error information when all retries fail', async () => {
    const originalError = Object.assign(new Error('Persistent failure'), {
      code: 'ECONNREFUSED',
      response: { status: 500, data: { message: 'Server error' } }
    });
    
    const alwaysFailingOperation = async () => {
      throw originalError;
    };
    
    try {
      await withRetry(alwaysFailingOperation, { maxRetries: 2, baseDelay: 1 });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Operation failed after 3 attempts');
      expect(error.message).toContain('Persistent failure');
      expect(error.code).toBe('ECONNREFUSED');
      expect(error.response.status).toBe(500);
    }
  });
});