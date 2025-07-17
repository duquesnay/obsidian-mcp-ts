import { describe, it, expect } from 'vitest';
import { SimplifiedError } from '../../src/types/errors.js';

describe('SimplifiedError', () => {
  it('should have required fields', () => {
    // This test will fail because SimplifiedError doesn't exist yet
    const error: SimplifiedError = {
      success: false,
      error: 'Something went wrong',
      tool: 'TestTool'
    };

    expect(error.success).toBe(false);
    expect(error.error).toBe('Something went wrong');
    expect(error.tool).toBe('TestTool');
  });

  it('should allow optional suggestion field', () => {
    const error: SimplifiedError = {
      success: false,
      error: 'File not found',
      tool: 'GetFileTool',
      suggestion: 'Make sure the file path is correct'
    };

    expect(error.suggestion).toBe('Make sure the file path is correct');
  });

  it('should allow optional example field', () => {
    const error: SimplifiedError = {
      success: false,
      error: 'Invalid arguments',
      tool: 'SearchTool',
      example: {
        query: 'search term',
        limit: 10
      }
    };

    expect(error.example).toEqual({
      query: 'search term',
      limit: 10
    });
  });
});