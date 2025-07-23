import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BaseTool } from './base.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

//@Todo a test file should bot be in src/

// Mock ObsidianErrorHandler
vi.mock('../utils/ObsidianErrorHandler', () => ({
  ObsidianErrorHandler: {
    handleHttpError: vi.fn().mockReturnValue({
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: 'Default HTTP error',
        tool: 'test-tool'
      })
    }),
    handle: vi.fn().mockReturnValue({
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: 'Default error',
        tool: 'test-tool'
      })
    })
  }
}));

// Create a concrete test implementation of BaseTool
class TestTool extends BaseTool<{ testParam: string }> {
  name = 'test-tool';
  description = 'Test tool for unit tests';
  inputSchema = {
    type: 'object' as const,
    properties: {
      testParam: { type: 'string', description: 'Test parameter' }
    },
    required: ['testParam']
  };

  async executeTyped(args: { testParam: string }) {
    return this.formatResponse({ success: true, result: args.testParam });
  }

  // Expose protected method for testing
  public testHandleHttpError(
    error: any,
    statusHandlers?: Record<number, string | { message: string; suggestion?: string; example?: Record<string, unknown> }>
  ) {
    // This will fail until we implement the method
    return (this as any).handleHttpError(error, statusHandlers);
  }
}

describe('BaseTool', () => {
  let tool: TestTool;

  beforeEach(() => {
    tool = new TestTool();
    vi.clearAllMocks();
  });

  describe('handleHttpError', () => {
    it('should handle 404 errors with custom message', () => {
      const error = {
        response: { status: 404 },
        message: 'Not found'
      };

      const result = tool.testHandleHttpError(error, {
        404: 'Custom file not found message'
      });

      const response = JSON.parse(result.text);
      expect(response.success).toBe(false);
      expect(response.error).toBe('Custom file not found message');
      expect(response.tool).toBe('test-tool');
    });

    it('should handle 403 errors with custom message and suggestion', () => {
      const error = {
        response: { status: 403 },
        message: 'Forbidden'
      };

      const result = tool.testHandleHttpError(error, {
        403: {
          message: 'Permission denied',
          suggestion: 'Check your API key'
        }
      });

      const response = JSON.parse(result.text);
      expect(response.success).toBe(false);
      expect(response.error).toBe('Permission denied');
      expect(response.suggestion).toBe('Check your API key');
      expect(response.tool).toBe('test-tool');
    });

    it('should handle 401 errors with custom message, suggestion and example', () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized'
      };

      const result = tool.testHandleHttpError(error, {
        401: {
          message: 'Authentication failed',
          suggestion: 'Ensure your API key is valid',
          example: { apiKey: 'your-api-key-here' }
        }
      });

      const response = JSON.parse(result.text);
      expect(response.success).toBe(false);
      expect(response.error).toBe('Authentication failed');
      expect(response.suggestion).toBe('Ensure your API key is valid');
      expect(response.example).toEqual({ apiKey: 'your-api-key-here' });
      expect(response.tool).toBe('test-tool');
    });

    it('should fall back to ObsidianErrorHandler for unhandled status codes', () => {
      const error = {
        response: { status: 500 },
        message: 'Internal server error'
      };

      const result = tool.testHandleHttpError(error, {
        404: 'Not found'
        // 500 is not handled, should fall back
      });

      expect(ObsidianErrorHandler.handleHttpError).toHaveBeenCalledWith(error, 'test-tool');
    });

    it('should handle errors without response property', () => {
      const error = {
        message: 'Network error'
      };

      const result = tool.testHandleHttpError(error, {
        404: 'Not found'
      });

      expect(ObsidianErrorHandler.handleHttpError).toHaveBeenCalledWith(error, 'test-tool');
    });

    it('should work without custom handlers', () => {
      const error = {
        response: { status: 404 },
        message: 'Not found'
      };

      const result = tool.testHandleHttpError(error);

      expect(ObsidianErrorHandler.handleHttpError).toHaveBeenCalledWith(error, 'test-tool');
    });

    it('should preserve the original error message when using string handler', () => {
      const error = {
        response: { status: 404 },
        message: 'File /test.md not found'
      };

      // When providing a string, it should be used as-is
      const result = tool.testHandleHttpError(error, {
        404: 'File not found'
      });

      const response = JSON.parse(result.text);
      expect(response.error).toBe('File not found');
    });

    it('should handle multiple status codes', () => {
      const error404 = {
        response: { status: 404 },
        message: 'Not found'
      };

      const error403 = {
        response: { status: 403 },
        message: 'Forbidden'
      };

      const handlers = {
        404: 'File not found',
        403: 'Access denied',
        401: 'Not authenticated'
      };

      const result404 = tool.testHandleHttpError(error404, handlers);
      const result403 = tool.testHandleHttpError(error403, handlers);

      const response404 = JSON.parse(result404.text);
      const response403 = JSON.parse(result403.text);

      expect(response404.error).toBe('File not found');
      expect(response403.error).toBe('Access denied');
    });
  });
});
