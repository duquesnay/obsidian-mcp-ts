import { describe, it, expect, beforeEach, vi } from 'vitest';
import { discoverTools, getToolMetadata, getToolsByCategory, isValidToolClass, validateToolInstance } from './discovery.js';
import { BaseTool } from './base.js';
import type { ToolResponse } from './base.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn()
}));

// Create mock tool classes for testing
class ValidTool extends BaseTool<{ test: string }> {
  name = 'valid_tool';
  description = 'A valid tool';
  inputSchema = {
    type: 'object' as const,
    properties: {
      test: { type: 'string' }
    }
  };

  async executeTyped(args: { test: string }): Promise<ToolResponse> {
    return { type: 'text', text: 'success' };
  }
}

class InvalidToolMissingName extends BaseTool<any> {
  // Missing name property
  description = 'Invalid tool';
  inputSchema = { type: 'object' as const, properties: {} };

  async executeTyped(args: any): Promise<ToolResponse> {
    return { type: 'text', text: 'success' };
  }
}

class InvalidToolMissingDescription extends BaseTool<any> {
  name = 'invalid_tool';
  // Missing description property
  inputSchema = { type: 'object' as const, properties: {} };

  async executeTyped(args: any): Promise<ToolResponse> {
    return { type: 'text', text: 'success' };
  }
}

class InvalidToolMissingSchema extends BaseTool<any> {
  name = 'invalid_tool';
  description = 'Invalid tool';
  // Missing inputSchema property

  async executeTyped(args: any): Promise<ToolResponse> {
    return { type: 'text', text: 'success' };
  }
}

class NotATool {
  // Not extending BaseTool
  name = 'not_a_tool';
  description = 'Not a tool';
}

describe('Tool Discovery Type Safety', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isValidToolClass', () => {
    it('should return true for valid tool class', () => {
      expect(isValidToolClass(ValidTool)).toBe(true);
    });

    it('should return false for non-function exports', () => {
      expect(isValidToolClass('not a class')).toBe(false);
      expect(isValidToolClass(123)).toBe(false);
      expect(isValidToolClass(null)).toBe(false);
      expect(isValidToolClass(undefined)).toBe(false);
      expect(isValidToolClass({})).toBe(false);
    });

    it('should return false for classes not extending BaseTool', () => {
      expect(isValidToolClass(NotATool)).toBe(false);
    });

    it('should return false for functions that are not constructors', () => {
      const notAConstructor = () => {};
      expect(isValidToolClass(notAConstructor)).toBe(false);
    });
  });

  describe('validateToolInstance', () => {
    it('should validate tool with all required properties', () => {
      const tool = new ValidTool();
      const result = validateToolInstance(tool, 'ValidTool');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing name property', () => {
      const tool = new InvalidToolMissingName();
      const result = validateToolInstance(tool, 'InvalidToolMissingName');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required property: name');
    });

    it('should detect missing description property', () => {
      const tool = new InvalidToolMissingDescription();
      const result = validateToolInstance(tool, 'InvalidToolMissingDescription');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required property: description');
    });

    it('should detect missing inputSchema property', () => {
      const tool = new InvalidToolMissingSchema();
      const result = validateToolInstance(tool, 'InvalidToolMissingSchema');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required property: inputSchema');
    });

    it('should detect invalid name type', () => {
      const tool = new ValidTool();
      (tool as any).name = 123; // Invalid type
      const result = validateToolInstance(tool, 'ValidTool');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property "name" must be a string');
    });

    it('should detect invalid description type', () => {
      const tool = new ValidTool();
      (tool as any).description = {}; // Invalid type
      const result = validateToolInstance(tool, 'ValidTool');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property "description" must be a string');
    });

    it('should detect invalid inputSchema type', () => {
      const tool = new ValidTool();
      (tool as any).inputSchema = 'not an object'; // Invalid type
      const result = validateToolInstance(tool, 'ValidTool');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property "inputSchema" must be a object');
    });

    it('should detect invalid inputSchema.type value', () => {
      const tool = new ValidTool();
      (tool as any).inputSchema = { type: 'array', properties: {} }; // Should be 'object'
      const result = validateToolInstance(tool, 'ValidTool');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('inputSchema.type must be "object"');
    });

    it('should detect missing inputSchema.properties', () => {
      const tool = new ValidTool();
      (tool as any).inputSchema = { type: 'object' }; // Missing properties
      const result = validateToolInstance(tool, 'ValidTool');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('inputSchema must have a "properties" object');
    });

    it('should detect if tool is not an instance of BaseTool', () => {
      const notATool = { name: 'fake', description: 'fake', inputSchema: {} };
      const result = validateToolInstance(notATool, 'NotATool');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tool must be an instance of BaseTool');
    });
  });

  describe('discoverTools with type checking', () => {
    it('should log validation errors for invalid tools', async () => {
      const { readdir } = await import('fs/promises');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock readdir to return test files
      (readdir as any).mockResolvedValue(['InvalidTool.js']);

      // Mock dynamic import to return invalid tool
      vi.doMock('./InvalidTool.js', () => ({
        InvalidTool: InvalidToolMissingName
      }));

      await discoverTools();

      // Should log validation errors
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool validation failed for InvalidTool'),
        expect.any(Array)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should skip non-tool exports gracefully', async () => {
      const { readdir } = await import('fs/promises');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock readdir to return test files
      (readdir as any).mockResolvedValue(['NotATool.js']);

      // Mock dynamic import to return non-tool export
      vi.doMock('./NotATool.js', () => ({
        NotATool: 'not a class'
      }));

      const tools = await discoverTools();

      // Should handle gracefully without crashing
      expect(tools).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('is not a valid tool class'),
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});