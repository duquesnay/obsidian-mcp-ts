import { describe, test, expect } from 'vitest';
import { AxiosError } from 'axios';
import {
  hasHttpResponse,
  hasMessage,
  getHttpStatus,
  getErrorMessage,
  isToolResponse,
  isObsidianError
} from './errorTypeGuards.js';

describe('errorTypeGuards', () => {
  describe('hasHttpResponse', () => {
    test('returns true for error with valid response and status', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        },
        message: 'Request failed'
      };
      
      expect(hasHttpResponse(error)).toBe(true);
    });

    test('returns false for error without response', () => {
      const error = {
        message: 'Network error'
      };
      
      expect(hasHttpResponse(error)).toBe(false);
    });

    test('returns false for error with response but no status', () => {
      const error = {
        response: {
          data: { message: 'Error' }
        }
      };
      
      expect(hasHttpResponse(error)).toBe(false);
    });

    test('returns false for null or undefined', () => {
      expect(hasHttpResponse(null)).toBe(false);
      expect(hasHttpResponse(undefined)).toBe(false);
    });

    test('returns false for non-object values', () => {
      expect(hasHttpResponse('error')).toBe(false);
      expect(hasHttpResponse(123)).toBe(false);
      expect(hasHttpResponse(true)).toBe(false);
    });
  });

  describe('hasMessage', () => {
    test('returns true for error with message property', () => {
      const error = { message: 'Error occurred' };
      expect(hasMessage(error)).toBe(true);
    });

    test('returns false for error without message', () => {
      const error = { code: 'ERROR_CODE' };
      expect(hasMessage(error)).toBe(false);
    });

    test('returns false for error with non-string message', () => {
      const error = { message: 123 };
      expect(hasMessage(error)).toBe(false);
    });

    test('returns false for null or undefined', () => {
      expect(hasMessage(null)).toBe(false);
      expect(hasMessage(undefined)).toBe(false);
    });

    test('returns false for non-object values', () => {
      expect(hasMessage('error')).toBe(false);
      expect(hasMessage(123)).toBe(false);
      expect(hasMessage(true)).toBe(false);
    });
  });

  describe('getHttpStatus', () => {
    test('returns status code for error with response', () => {
      const error = {
        response: {
          status: 404
        }
      };
      
      expect(getHttpStatus(error)).toBe(404);
    });

    test('returns undefined for error without response', () => {
      const error = { message: 'Error' };
      
      expect(getHttpStatus(error)).toBeUndefined();
    });

    test('returns undefined for non-error values', () => {
      expect(getHttpStatus(null)).toBeUndefined();
      expect(getHttpStatus('error')).toBeUndefined();
      expect(getHttpStatus(123)).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    test('returns message from error object', () => {
      const error = { message: 'Test error' };
      expect(getErrorMessage(error)).toBe('Test error');
    });

    test('returns string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    test('returns Unknown error for other types', () => {
      expect(getErrorMessage(null)).toBe('Unknown error');
      expect(getErrorMessage(undefined)).toBe('Unknown error');
      expect(getErrorMessage(123)).toBe('Unknown error');
      expect(getErrorMessage({ code: 'ERROR' })).toBe('Unknown error');
    });
  });

  describe('isToolResponse', () => {
    test('returns true for valid ToolResponse', () => {
      const response = {
        type: 'text',
        text: 'Response text'
      };
      
      expect(isToolResponse(response)).toBe(true);
    });

    test('returns false for response with wrong type', () => {
      const response = {
        type: 'error',
        text: 'Error message'
      };
      
      expect(isToolResponse(response)).toBe(false);
    });

    test('returns false for response with non-string text', () => {
      const response = {
        type: 'text',
        text: 123
      };
      
      expect(isToolResponse(response)).toBe(false);
    });

    test('returns false for response with extra properties', () => {
      const response = {
        type: 'text',
        text: 'Response',
        extra: 'property'
      };
      
      expect(isToolResponse(response)).toBe(false);
    });

    test('returns false for response with missing properties', () => {
      expect(isToolResponse({ type: 'text' })).toBe(false);
      expect(isToolResponse({ text: 'Response' })).toBe(false);
    });

    test('returns false for non-object values', () => {
      expect(isToolResponse(null)).toBe(false);
      expect(isToolResponse(undefined)).toBe(false);
      expect(isToolResponse('response')).toBe(false);
      expect(isToolResponse(123)).toBe(false);
    });
  });

  describe('isObsidianError', () => {
    test('returns true for valid Obsidian API error with errorCode and message', () => {
      const error = new AxiosError('Request failed');
      error.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
        data: {
          errorCode: 404,
          message: 'File not found'
        }
      };
      
      expect(isObsidianError(error)).toBe(true);
    });

    test('returns true for Obsidian error with only message in response data', () => {
      const error = new AxiosError('Request failed');
      error.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
        data: {
          message: 'Invalid request'
        }
      };
      
      expect(isObsidianError(error)).toBe(true);
    });

    test('returns true for AxiosError without Obsidian-specific fields', () => {
      const error = new AxiosError('Network error');
      error.response = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
        data: {}
      };
      
      expect(isObsidianError(error)).toBe(true);
    });

    test('returns true for AxiosError without response', () => {
      const error = new AxiosError('Network error');
      expect(isObsidianError(error)).toBe(true);
    });

    test('returns false for non-AxiosError', () => {
      const error = new Error('Regular error');
      expect(isObsidianError(error)).toBe(false);
    });

    test('returns false for objects that look like AxiosError but are not', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      
      expect(isObsidianError(error)).toBe(false);
    });

    test('returns false for null or undefined', () => {
      expect(isObsidianError(null)).toBe(false);
      expect(isObsidianError(undefined)).toBe(false);
    });

    test('returns false for non-object values', () => {
      expect(isObsidianError('error')).toBe(false);
      expect(isObsidianError(123)).toBe(false);
      expect(isObsidianError(true)).toBe(false);
    });

    test('validates Obsidian error data structure when present', () => {
      const error = new AxiosError('Request failed');
      error.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
        data: {
          errorCode: 404,
          message: 'File not found'
        }
      };
      
      expect(isObsidianError(error)).toBe(true);
      // Type assertion should allow access to Obsidian-specific fields
      if (isObsidianError(error) && error.response?.data) {
        expect(error.response.data.errorCode).toBe(404);
        expect(error.response.data.message).toBe('File not found');
      }
    });
  });
});