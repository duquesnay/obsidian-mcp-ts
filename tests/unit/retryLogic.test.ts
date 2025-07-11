import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import { 
  withRetry, 
  createRetryConfig, 
  isRetryableError, 
  DEFAULT_RETRY_CONFIG,
  HEAVY_OPERATION_RETRY_CONFIG 
} from '../../src/utils/retryLogic.js';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt when function works', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');
      
      // Start the retry operation
      const retryPromise = withRetry(mockFn, { maxRetries: 2 });
      
      // Fast forward through delays
      await vi.runAllTimersAsync();
      
      const result = await retryPromise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors (4xx)', async () => {
      const clientError = new Error('Bad Request') as AxiosError;
      clientError.response = { status: 400 } as any;
      
      const mockFn = vi.fn().mockRejectedValue(clientError);
      
      await expect(withRetry(mockFn, { maxRetries: 2 })).rejects.toThrow('Bad Request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on server errors (5xx)', async () => {
      const serverError = new Error('Internal Server Error') as AxiosError;
      serverError.response = { status: 500 } as any;
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('success');
      
      const retryPromise = withRetry(mockFn, { maxRetries: 2 });
      await vi.runAllTimersAsync();
      
      const result = await retryPromise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limiting (429)', async () => {
      const rateLimitError = new Error('Too Many Requests') as AxiosError;
      rateLimitError.response = { status: 429 } as any;
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');
      
      const retryPromise = withRetry(mockFn, { maxRetries: 2 });
      await vi.runAllTimersAsync();
      
      const result = await retryPromise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const timeoutError = new Error('Request timeout occurred');
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue('success');
      
      const retryPromise = withRetry(mockFn, { maxRetries: 2 });
      await vi.runAllTimersAsync();
      
      const result = await retryPromise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on SSL/TLS errors', async () => {
      const sslError = new Error('self-signed certificate in certificate chain');
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(sslError)
        .mockResolvedValue('success');
      
      const retryPromise = withRetry(mockFn, { maxRetries: 2 });
      await vi.runAllTimersAsync();
      
      const result = await retryPromise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      
      const mockFn = vi.fn().mockRejectedValue(networkError);
      
      const retryPromise = withRetry(mockFn, { maxRetries: 2 });
      await vi.runAllTimersAsync();
      
      await expect(retryPromise).rejects.toThrow(/Operation failed after 3 attempts/);
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      
      const mockFn = vi.fn().mockRejectedValue(networkError);
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const retryPromise = withRetry(mockFn, { 
        maxRetries: 2,
        baseDelay: 1000,
        backoffFactor: 2
      });
      
      // Fast forward through all timers
      await vi.runAllTimersAsync();
      
      await expect(retryPromise).rejects.toThrow();
      
      // Check that debug logs show increasing delays
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Retry attempt 1\/2 after \d+ms/)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Retry attempt 2\/2 after \d+ms/)
      );
      
      consoleSpy.mockRestore();
    });

    it('should preserve original error properties', async () => {
      const axiosError = new Error('Request failed') as AxiosError;
      axiosError.response = { status: 500, data: { message: 'Server error' } } as any;
      axiosError.code = 'INTERNAL_ERROR';
      
      const mockFn = vi.fn().mockRejectedValue(axiosError);
      
      const retryPromise = withRetry(mockFn, { maxRetries: 1 });
      await vi.runAllTimersAsync();
      
      try {
        await retryPromise;
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response).toBeDefined();
        expect(error.response.status).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.message).toContain('Operation failed after 2 attempts');
        expect(error.message).toContain('Request failed');
      }
    });
  });

  describe('createRetryConfig', () => {
    it('should create read-optimized config', () => {
      const config = createRetryConfig('read');
      
      expect(config.maxRetries).toBe(4);
      expect(config.baseDelay).toBe(500);
    });

    it('should create write-conservative config', () => {
      const config = createRetryConfig('write');
      
      expect(config.maxRetries).toBe(2);
      expect(config.baseDelay).toBe(1500);
    });

    it('should create heavy-operation config', () => {
      const config = createRetryConfig('heavy');
      
      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(config.maxDelay).toBe(10000);
      expect(config.backoffFactor).toBe(1.5);
    });

    it('should create search-tolerant config', () => {
      const config = createRetryConfig('search');
      
      expect(config.maxRetries).toBe(3);
      expect(config.maxDelay).toBe(8000);
      
      // Test custom retry condition for search
      const searchError = new Error('search timeout');
      expect(config.retryCondition!(searchError)).toBe(true);
    });

    it('should fall back to default config', () => {
      const config = createRetryConfig('unknown' as any);
      
      expect(config).toEqual(DEFAULT_RETRY_CONFIG);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const econnrefused = new Error('Connection refused');
      (econnrefused as any).code = 'ECONNREFUSED';
      
      expect(isRetryableError(econnrefused)).toBe(true);
      
      const enotfound = new Error('Host not found');
      (enotfound as any).code = 'ENOTFOUND';
      
      expect(isRetryableError(enotfound)).toBe(true);
    });

    it('should identify server errors as retryable', () => {
      const serverError = new Error('Internal Server Error') as AxiosError;
      serverError.response = { status: 500 } as any;
      
      expect(isRetryableError(serverError)).toBe(true);
      
      const serviceUnavailable = new Error('Service Unavailable') as AxiosError;
      serviceUnavailable.response = { status: 503 } as any;
      
      expect(isRetryableError(serviceUnavailable)).toBe(true);
    });

    it('should identify rate limiting as retryable', () => {
      const rateLimitError = new Error('Too Many Requests') as AxiosError;
      rateLimitError.response = { status: 429 } as any;
      
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should not retry client errors', () => {
      const badRequest = new Error('Bad Request') as AxiosError;
      badRequest.response = { status: 400 } as any;
      
      expect(isRetryableError(badRequest)).toBe(false);
      
      const unauthorized = new Error('Unauthorized') as AxiosError;
      unauthorized.response = { status: 401 } as any;
      
      expect(isRetryableError(unauthorized)).toBe(false);
      
      const notFound = new Error('Not Found') as AxiosError;
      notFound.response = { status: 404 } as any;
      
      expect(isRetryableError(notFound)).toBe(false);
    });

    it('should identify timeout errors as retryable', () => {
      const timeoutError = new Error('Request timeout occurred');
      
      expect(isRetryableError(timeoutError)).toBe(true);
    });

    it('should identify SSL errors as retryable', () => {
      const sslError = new Error('self-signed certificate in certificate chain');
      
      expect(isRetryableError(sslError)).toBe(true);
      
      const handshakeError = new Error('SSL handshake failed');
      
      expect(isRetryableError(handshakeError)).toBe(true);
    });

    it('should not retry non-network errors', () => {
      const logicError = new Error('Invalid input provided');
      
      expect(isRetryableError(logicError)).toBe(false);
      
      const parseError = new Error('JSON parse error');
      
      expect(isRetryableError(parseError)).toBe(false);
    });
  });

  describe('Default retry configurations', () => {
    it('should have sensible default retry config', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(5000);
      expect(DEFAULT_RETRY_CONFIG.backoffFactor).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.retryCondition).toBeDefined();
    });

    it('should have appropriate heavy operation config', () => {
      expect(HEAVY_OPERATION_RETRY_CONFIG.maxRetries).toBe(5);
      expect(HEAVY_OPERATION_RETRY_CONFIG.baseDelay).toBe(2000);
      expect(HEAVY_OPERATION_RETRY_CONFIG.maxDelay).toBe(10000);
      expect(HEAVY_OPERATION_RETRY_CONFIG.backoffFactor).toBe(1.5);
    });
  });

  describe('Edge cases', () => {
    it('should handle non-Error objects', async () => {
      const mockFn = vi.fn().mockRejectedValue('string error');
      
      const retryPromise = withRetry(mockFn, { maxRetries: 1 });
      await vi.runAllTimersAsync();
      
      await expect(retryPromise).rejects.toThrow(/Operation failed after 2 attempts/);
    });

    it('should handle undefined errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(undefined);
      
      const retryPromise = withRetry(mockFn, { maxRetries: 1 });
      await vi.runAllTimersAsync();
      
      await expect(retryPromise).rejects.toThrow(/Operation failed after 2 attempts/);
    });

    it('should apply jitter to prevent thundering herd', async () => {
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';
      
      const mockFn = vi.fn().mockRejectedValue(networkError);
      
      const retryPromise = withRetry(mockFn, { 
        maxRetries: 1,
        baseDelay: 1000 
      });
      
      await vi.runAllTimersAsync();
      
      await expect(retryPromise).rejects.toThrow();
      
      // Check that jitter was applied (should be base delay + 10% jitter)
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.numberBetween(1040, 1060) // 1000 + (0.1 * 1000 * 0.5) = 1050 ± small variance
      );
      
      mathRandomSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });
});

// Custom matcher for number ranges
expect.extend({
  numberBetween(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () => `expected ${received} to be between ${min} and ${max}`,
      pass,
    };
  },
});

declare module 'vitest' {
  interface Assertion<T = any> {
    numberBetween(min: number, max: number): T
  }
}