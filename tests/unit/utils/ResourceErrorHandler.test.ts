import { describe, it, expect } from 'vitest';
import { ResourceErrorHandler } from '../../../src/utils/ResourceErrorHandler.js';

describe('ResourceErrorHandler', () => {
  describe('handleNotFound', () => {
    it('should throw error with standard not found message', () => {
      expect(() => ResourceErrorHandler.handleNotFound('Note', 'test.md'))
        .toThrow('Note not found: test.md');
    });

    it('should handle empty path', () => {
      expect(() => ResourceErrorHandler.handleNotFound('Folder', ''))
        .toThrow('Folder not found');
    });
  });

  describe('handleValidationError', () => {
    it('should throw error with validation message', () => {
      expect(() => ResourceErrorHandler.handleValidationError('date', 'Invalid format'))
        .toThrow('Invalid date: Invalid format');
    });

    it('should handle missing parameter', () => {
      expect(() => ResourceErrorHandler.handleValidationError('query', 'Required parameter missing'))
        .toThrow('Invalid query: Required parameter missing');
    });
  });

  describe('handleApiError', () => {
    it('should handle 404 errors', () => {
      const error = {
        response: { status: 404 },
        message: 'Not found'
      };
      
      expect(() => ResourceErrorHandler.handleApiError(error, 'Note', 'test.md'))
        .toThrow('Note not found: test.md');
    });

    it('should handle 403 errors', () => {
      const error = {
        response: { status: 403 },
        message: 'Forbidden'
      };
      
      expect(() => ResourceErrorHandler.handleApiError(error, 'Vault', 'restricted'))
        .toThrow('Access denied to Vault: restricted');
    });

    it('should handle 401 errors', () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized'
      };
      
      expect(() => ResourceErrorHandler.handleApiError(error))
        .toThrow('Authentication failed. Please check your API key.');
    });

    it('should handle 500 errors', () => {
      const error = {
        response: { status: 500 },
        message: 'Internal server error'
      };
      
      expect(() => ResourceErrorHandler.handleApiError(error))
        .toThrow('Server error: Internal server error');
    });

    it('should preserve original error for unknown status codes', () => {
      const error = new Error('Unknown error');
      
      expect(() => ResourceErrorHandler.handleApiError(error))
        .toThrow('Unknown error');
    });

    it('should handle errors without response property', () => {
      const error = new Error('Network error');
      
      expect(() => ResourceErrorHandler.handleApiError(error))
        .toThrow('Network error');
    });
  });

  describe('formatResourceError', () => {
    it('should format error response for resource handlers', () => {
      const result = ResourceErrorHandler.formatResourceError('Test error message', 'vault://test');
      
      expect(result).toEqual({
        error: 'Test error message',
        uri: 'vault://test'
      });
    });

    it('should include additional context if provided', () => {
      const result = ResourceErrorHandler.formatResourceError(
        'Validation failed', 
        'vault://note/test.md',
        { reason: 'Invalid characters in path' }
      );
      
      expect(result).toEqual({
        error: 'Validation failed',
        uri: 'vault://note/test.md',
        details: { reason: 'Invalid characters in path' }
      });
    });
  });

  describe('isHttpError', () => {
    it('should identify HTTP errors', () => {
      const httpError = { response: { status: 404 } };
      expect(ResourceErrorHandler.isHttpError(httpError)).toBe(true);
    });

    it('should return false for non-HTTP errors', () => {
      const regularError = new Error('Test');
      expect(ResourceErrorHandler.isHttpError(regularError)).toBe(false);
    });

    it('should return false for objects without response', () => {
      const obj = { message: 'Test' };
      expect(ResourceErrorHandler.isHttpError(obj)).toBe(false);
    });
  });
});