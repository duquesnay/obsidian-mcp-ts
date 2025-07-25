import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import {
  hasHttpResponse,
  hasMessage,
  getHttpStatus,
  getErrorMessage,
  isToolResponse,
  isObsidianError
} from '../../../src/utils/errorTypeGuards.js';

describe('errorTypeGuards', () => {
  describe('hasHttpResponse', () => {
    it('should return true for errors with response and status', () => {
      const error = {
        response: { status: 404, data: 'Not found' },
        message: 'Request failed'
      };
      expect(hasHttpResponse(error)).toBe(true);
    });

    it('should return false for errors without response', () => {
      const error = { message: 'Simple error' };
      expect(hasHttpResponse(error)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(hasHttpResponse(null)).toBe(false);
      expect(hasHttpResponse(undefined)).toBe(false);
    });

    it('should return false for non-object errors', () => {
      expect(hasHttpResponse('string error')).toBe(false);
      expect(hasHttpResponse(123)).toBe(false);
    });
  });

  describe('hasMessage', () => {
    it('should return true for errors with string message', () => {
      const error = { message: 'Error occurred' };
      expect(hasMessage(error)).toBe(true);
    });

    it('should return false for errors without message', () => {
      const error = { code: 'ERROR_CODE' };
      expect(hasMessage(error)).toBe(false);
    });

    it('should return false for non-string message', () => {
      const error = { message: 123 };
      expect(hasMessage(error)).toBe(false);
    });
  });

  describe('getHttpStatus', () => {
    it('should return status for HTTP errors', () => {
      const error = { response: { status: 500 } };
      expect(getHttpStatus(error)).toBe(500);
    });

    it('should return undefined for non-HTTP errors', () => {
      const error = { message: 'Not an HTTP error' };
      expect(getHttpStatus(error)).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('should return message from error object', () => {
      const error = { message: 'Test error' };
      expect(getErrorMessage(error)).toBe('Test error');
    });

    it('should return string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should return "Unknown error" for other types', () => {
      expect(getErrorMessage(null)).toBe('Unknown error');
      expect(getErrorMessage(undefined)).toBe('Unknown error');
      expect(getErrorMessage(123)).toBe('Unknown error');
    });
  });

  describe('isToolResponse', () => {
    it('should return true for valid ToolResponse', () => {
      const response = {
        type: 'text',
        text: 'Response content'
      };
      expect(isToolResponse(response)).toBe(true);
    });

    it('should return true for ToolResponse with empty text', () => {
      const response = {
        type: 'text',
        text: ''
      };
      expect(isToolResponse(response)).toBe(true);
    });

    it('should return false for response with wrong type', () => {
      const response = {
        type: 'json',
        text: 'Content'
      };
      expect(isToolResponse(response)).toBe(false);
    });

    it('should return false for response without type', () => {
      const response = {
        text: 'Content'
      };
      expect(isToolResponse(response)).toBe(false);
    });

    it('should return false for response without text', () => {
      const response = {
        type: 'text'
      };
      expect(isToolResponse(response)).toBe(false);
    });

    it('should return false for response with non-string text', () => {
      const response = {
        type: 'text',
        text: 123
      };
      expect(isToolResponse(response)).toBe(false);
    });

    it('should return false for response with extra properties', () => {
      const response = {
        type: 'text',
        text: 'Content',
        extra: 'property'
      };
      expect(isToolResponse(response)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isToolResponse(null)).toBe(false);
      expect(isToolResponse(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isToolResponse('string')).toBe(false);
      expect(isToolResponse(123)).toBe(false);
      expect(isToolResponse(true)).toBe(false);
      expect(isToolResponse([])).toBe(false);
    });

    it('should return false for response with additional type values', () => {
      const response = {
        type: 'text',
        text: 'Content',
        anotherType: 'json'
      };
      expect(isToolResponse(response)).toBe(false);
    });
  });

  describe('isObsidianError', () => {
    it('should return true for valid AxiosError instances', () => {
      // Create a proper AxiosError instance
      const axiosError = new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
          data: {
            errorCode: 404,
            message: 'File not found'
          }
        }
      );
      
      expect(isObsidianError(axiosError)).toBe(true);
    });

    it('should return true for AxiosError without Obsidian-specific data', () => {
      // AxiosError without the errorCode/message in data
      const axiosError = new AxiosError(
        'Network error',
        'ERR_NETWORK',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any,
          data: 'Generic error string'
        }
      );
      
      expect(isObsidianError(axiosError)).toBe(true);
    });

    it('should return true for AxiosError without response', () => {
      // Network errors might not have a response
      const axiosError = new AxiosError(
        'Network timeout',
        'ECONNABORTED',
        undefined,
        undefined,
        undefined
      );
      
      expect(isObsidianError(axiosError)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const regularError = new Error('Regular error');
      expect(isObsidianError(regularError)).toBe(false);
    });

    it('should return false for objects that look like AxiosError but are not', () => {
      // Mock object with AxiosError-like properties
      const mockError = {
        isAxiosError: true,
        message: 'Mock error',
        response: {
          status: 404,
          data: {
            errorCode: 404,
            message: 'Not found'
          }
        },
        toJSON: () => ({})
      };
      
      expect(isObsidianError(mockError)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isObsidianError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isObsidianError(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isObsidianError('string error')).toBe(false);
      expect(isObsidianError(123)).toBe(false);
      expect(isObsidianError(true)).toBe(false);
      expect(isObsidianError([])).toBe(false);
    });

    it('should return false for plain objects', () => {
      const plainObject = {
        message: 'Error message',
        status: 404
      };
      expect(isObsidianError(plainObject)).toBe(false);
    });

    it('should return false for Error with axios-like properties', () => {
      const error = new Error('Test error') as any;
      error.isAxiosError = true;
      error.response = {
        status: 404,
        data: { errorCode: 404 }
      };
      
      expect(isObsidianError(error)).toBe(false);
    });

    it('should handle errors from different realms gracefully', () => {
      // Simulate cross-realm object (e.g., from iframe)
      const crossRealmError = Object.create(null);
      Object.defineProperty(crossRealmError, 'isAxiosError', {
        value: true,
        enumerable: true
      });
      Object.defineProperty(crossRealmError, 'message', {
        value: 'Cross-realm error',
        enumerable: true
      });
      Object.defineProperty(crossRealmError, 'toJSON', {
        value: () => ({}),
        enumerable: true
      });
      
      // This should be handled gracefully without throwing
      expect(() => isObsidianError(crossRealmError)).not.toThrow();
    });

    it('should handle instanceof errors in catch block', () => {
      // Create an object that will cause instanceof to throw
      const problematicError = {
        isAxiosError: true,
        message: 'Test error',
        toJSON: () => ({})
      };
      
      // Override the Symbol.hasInstance to throw
      Object.defineProperty(Error, Symbol.hasInstance, {
        value: () => {
          throw new Error('Symbol.hasInstance error');
        },
        configurable: true
      });
      
      // The function should still return true because isAxiosError returned true
      expect(isObsidianError(problematicError)).toBe(true);
      
      // Restore the original Symbol.hasInstance
      delete (Error as any)[Symbol.hasInstance];
    });

    it('should validate Obsidian error data structure when present', () => {
      const axiosError = new AxiosError(
        'API Error',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
          data: {
            errorCode: 400,
            message: 'Invalid request parameters'
          }
        }
      );
      
      expect(isObsidianError(axiosError)).toBe(true);
      
      // TypeScript should allow accessing these properties
      if (isObsidianError(axiosError)) {
        // These properties should be accessible without TypeScript errors
        const errorCode = axiosError.response?.data?.errorCode;
        const message = axiosError.response?.data?.message;
        
        expect(errorCode).toBe(400);
        expect(message).toBe('Invalid request parameters');
      }
    });
  });
});