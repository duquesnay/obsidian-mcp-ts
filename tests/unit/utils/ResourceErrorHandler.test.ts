import { describe, it, expect } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ResourceErrorHandler } from '../../../src/utils/ResourceErrorHandler.js';

describe('ResourceErrorHandler', () => {
  describe('handleNotFound', () => {
    it('should throw McpError with MethodNotFound code', () => {
      try {
        ResourceErrorHandler.handleNotFound('Note', 'test.md');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
        expect((error as McpError).message).toContain('Note not found: test.md');
      }
    });

    it('should handle empty path with McpError', () => {
      try {
        ResourceErrorHandler.handleNotFound('Folder', '');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
        expect((error as McpError).message).toContain('Folder not found');
      }
    });
  });

  describe('handleValidationError', () => {
    it('should throw McpError with InvalidParams code', () => {
      try {
        ResourceErrorHandler.handleValidationError('date', 'Invalid format');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Invalid date: Invalid format');
      }
    });

    it('should handle missing parameter with McpError', () => {
      try {
        ResourceErrorHandler.handleValidationError('query', 'Required parameter missing');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Invalid query: Required parameter missing');
      }
    });
  });

  describe('handleApiError', () => {
    it('should handle 404 errors with MethodNotFound code', () => {
      const error = {
        response: { status: 404 },
        message: 'Not found'
      };

      try {
        ResourceErrorHandler.handleApiError(error, 'Note', 'test.md');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.MethodNotFound);
        expect((err as McpError).message).toContain('Note not found: test.md');
      }
    });

    it('should handle 403 errors with InvalidParams code', () => {
      const error = {
        response: { status: 403 },
        message: 'Forbidden'
      };

      try {
        ResourceErrorHandler.handleApiError(error, 'Vault', 'restricted');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((err as McpError).message).toContain('Access denied to Vault: restricted');
      }
    });

    it('should handle 401 errors with InvalidParams code', () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized'
      };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((err as McpError).message).toContain('Authentication failed. Please check your API key.');
      }
    });

    it('should handle 500 errors with InternalError code', () => {
      const error = {
        response: { status: 500 },
        message: 'Internal server error'
      };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
        expect((err as McpError).message).toContain('Server error: Internal server error');
      }
    });

    it('should wrap regular errors with InternalError code', () => {
      const error = new Error('Unknown error');

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
        expect((err as McpError).message).toContain('Unknown error');
      }
    });

    it('should handle errors without response property as InternalError', () => {
      const error = new Error('Network error');

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
        expect((err as McpError).message).toContain('Network error');
      }
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

  describe('MCP error code mapping', () => {
    it('should map 400 to InvalidParams', () => {
      const error = {
        response: { status: 400 },
        message: 'Bad request'
      };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InvalidParams);
      }
    });

    it('should map 502 to InternalError', () => {
      const error = {
        response: { status: 502 },
        message: 'Bad gateway'
      };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
      }
    });

    it('should map 503 to InternalError', () => {
      const error = {
        response: { status: 503 },
        message: 'Service unavailable'
      };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
      }
    });

    it('should map unknown HTTP status to InternalError', () => {
      const error = {
        response: { status: 418 },
        message: "I'm a teapot"
      };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
      }
    });

    it('should handle unknown errors as InternalError', () => {
      const error = { unexpected: 'structure' };

      try {
        ResourceErrorHandler.handleApiError(error);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.InternalError);
        expect((err as McpError).message).toContain('An unknown error occurred');
      }
    });
  });

  describe('handle method', () => {
    it('should use MethodNotFound for 404 in handle method', () => {
      const error = {
        response: { status: 404 },
        message: 'Not found'
      };

      try {
        ResourceErrorHandler.handle(error, 'Resource', 'test-path');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(ErrorCode.MethodNotFound);
        expect((err as McpError).message).toContain('Resource not found: test-path');
      }
    });
  });
});