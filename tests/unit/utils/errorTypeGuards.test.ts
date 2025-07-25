import { describe, it, expect } from 'vitest';
import {
  hasHttpResponse,
  hasMessage,
  getHttpStatus,
  getErrorMessage,
  isToolResponse
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
});