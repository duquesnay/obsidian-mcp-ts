import { AxiosError } from 'axios';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Default retry configuration optimized for Obsidian REST API
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds max
  backoffFactor: 2, // Exponential backoff: 1s, 2s, 4s
  retryCondition: (error: unknown): boolean => {
    // Only retry on network-related errors, not client errors (4xx)
    if (error instanceof Error) {
      const axiosError = error as AxiosError;
      
      // Network connectivity issues
      if (axiosError.code === 'ECONNREFUSED' || 
          axiosError.code === 'ENOTFOUND' || 
          axiosError.code === 'ECONNRESET' ||
          axiosError.code === 'ETIMEDOUT') {
        return true;
      }
      
      // HTTP 5xx server errors (Obsidian plugin might be restarting)
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return true;
      }
      
      // HTTP 429 rate limiting
      if (axiosError.response?.status === 429) {
        return true;
      }
      
      // Timeout errors
      if (axiosError.message?.includes('timeout')) {
        return true;
      }
      
      // SSL/TLS handshake errors (temporary connectivity)
      if (axiosError.message?.includes('certificate') || 
          axiosError.message?.includes('handshake')) {
        return true;
      }
    }
    
    return false;
  }
};

/**
 * Enhanced retry configuration for heavy operations (directory moves, etc.)
 */
export const HEAVY_OPERATION_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 5,
  baseDelay: 2000, // 2 seconds
  maxDelay: 10000, // 10 seconds max
  backoffFactor: 1.5 // More conservative backoff for heavy ops
};

/**
 * Executes a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      // Check if we should retry this error
      if (!finalConfig.retryCondition!(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt),
        finalConfig.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay; // ±10% jitter
      const finalDelay = delay + jitter;
      
      // Log retry attempt for debugging
      console.debug(`Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${finalDelay.toFixed(0)}ms for error: ${lastError.message}`);
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Enhance the error with retry information
  const enhancedError = new Error(
    `Operation failed after ${finalConfig.maxRetries + 1} attempts over ${totalTime}ms. Last error: ${lastError?.message}`
  );
  
  // Preserve original error properties
  if (lastError) {
    enhancedError.stack = lastError.stack;
    enhancedError.cause = lastError;
    
    // Preserve Axios error properties
    const axiosError = lastError as AxiosError;
    if (axiosError.response) {
      (enhancedError as any).response = axiosError.response;
      (enhancedError as any).status = axiosError.response.status;
    }
    if (axiosError.code) {
      (enhancedError as any).code = axiosError.code;
    }
  }
  
  throw enhancedError;
}

/**
 * Determines if an error is retryable based on common network failure patterns
 */
export function isRetryableError(error: unknown): boolean {
  return DEFAULT_RETRY_CONFIG.retryCondition!(error);
}

/**
 * Creates a retry configuration for specific operation types
 */
export function createRetryConfig(operationType: 'read' | 'write' | 'heavy' | 'search'): RetryConfig {
  switch (operationType) {
    case 'read':
      return {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 4, // More aggressive retries for read operations
        baseDelay: 500 // Faster initial retry
      };
    
    case 'write':
      return {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2, // Conservative for write operations to avoid duplicates
        baseDelay: 1500
      };
    
    case 'heavy':
      return HEAVY_OPERATION_RETRY_CONFIG;
    
    case 'search':
      return {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000, // Longer max delay for search operations
        retryCondition: (error: unknown): boolean => {
          // Search operations can be more tolerant of retries
          const defaultCondition = DEFAULT_RETRY_CONFIG.retryCondition!(error);
          
          // Also retry on search timeout errors
          if (error instanceof Error && error.message?.includes('search')) {
            return true;
          }
          
          return defaultCondition;
        }
      };
    
    default:
      return DEFAULT_RETRY_CONFIG;
  }
}