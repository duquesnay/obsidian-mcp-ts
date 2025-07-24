import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IEditStrategy, EditOperation, EditContext, EditResult } from './IEditStrategy.js';
import { BaseEditStrategy } from './BaseEditStrategy.js';
import type { IObsidianClient } from '../../obsidian/interfaces/IObsidianClient.js';

// Test implementation of BaseEditStrategy
class TestEditStrategy extends BaseEditStrategy {
  async canHandle(operation: EditOperation): Promise<boolean> {
    return operation.type === 'test';
  }

  async execute(operation: EditOperation, context: EditContext): Promise<EditResult> {
    if (operation.type !== 'test') {
      throw new Error('Invalid operation type');
    }
    
    return {
      success: true,
      message: 'Test operation executed',
      operation: operation.type,
      filepath: context.filepath
    };
  }
}

describe('IEditStrategy Interface', () => {
  it('should define the correct interface methods', () => {
    // This test ensures the interface is properly defined
    const strategy: IEditStrategy = new TestEditStrategy();
    
    expect(typeof strategy.canHandle).toBe('function');
    expect(typeof strategy.execute).toBe('function');
  });
});

describe('BaseEditStrategy', () => {
  let strategy: TestEditStrategy;
  let mockClient: any;
  
  beforeEach(() => {
    strategy = new TestEditStrategy();
    mockClient = {
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      appendContent: vi.fn(),
      patchContent: vi.fn()
    };
  });

  describe('canHandle', () => {
    it('should return true for supported operation type', async () => {
      const operation: EditOperation = { type: 'test' };
      const result = await strategy.canHandle(operation);
      expect(result).toBe(true);
    });

    it('should return false for unsupported operation type', async () => {
      const operation: EditOperation = { type: 'unsupported' as any };
      const result = await strategy.canHandle(operation);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute the operation successfully', async () => {
      const operation: EditOperation = { type: 'test' };
      const context: EditContext = {
        filepath: 'test.md',
        client: mockClient
      };

      const result = await strategy.execute(operation, context);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test operation executed');
      expect(result.operation).toBe('test');
      expect(result.filepath).toBe('test.md');
    });

    it('should throw error for invalid operation type', async () => {
      const operation: EditOperation = { type: 'invalid' as any };
      const context: EditContext = {
        filepath: 'test.md',
        client: mockClient
      };

      await expect(strategy.execute(operation, context)).rejects.toThrow('Invalid operation type');
    });
  });

  describe('formatResult', () => {
    it('should format a success result', () => {
      const result = strategy['formatResult']({
        success: true,
        message: 'Operation completed',
        operation: 'test',
        filepath: 'test.md'
      });

      expect(result).toEqual({
        success: true,
        message: 'Operation completed',
        operation: 'test',
        filepath: 'test.md'
      });
    });

    it('should format an error result', () => {
      const result = strategy['formatError']('Test error', 'Try this instead');

      expect(result).toEqual({
        success: false,
        error: 'Test error',
        suggestion: 'Try this instead'
      });
    });
  });

  describe('EditOperation types', () => {
    it('should support append operations', () => {
      const operation: EditOperation = {
        type: 'append',
        content: 'New content'
      };
      
      expect(operation.type).toBe('append');
      expect(operation.content).toBe('New content');
    });

    it('should support replace operations', () => {
      const operation: EditOperation = {
        type: 'replace',
        find: 'old text',
        replace: 'new text'
      };
      
      expect(operation.type).toBe('replace');
      expect(operation.find).toBe('old text');
      expect(operation.replace).toBe('new text');
    });

    it('should support heading insert operations', () => {
      const operation: EditOperation = {
        type: 'heading-insert',
        position: 'after',
        heading: 'Section Title',
        content: 'Content to insert'
      };
      
      expect(operation.type).toBe('heading-insert');
      expect(operation.position).toBe('after');
      expect(operation.heading).toBe('Section Title');
      expect(operation.content).toBe('Content to insert');
    });

    it('should support new section operations', () => {
      const operation: EditOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'end',
        content: 'Section content'
      };
      
      expect(operation.type).toBe('new-section');
      expect(operation.title).toBe('New Section');
      expect(operation.at).toBe('end');
      expect(operation.content).toBe('Section content');
    });

    it('should support batch operations', () => {
      const operation: EditOperation = {
        type: 'batch',
        operations: [
          { type: 'append', content: 'First' },
          { type: 'replace', find: 'old', replace: 'new' }
        ]
      };
      
      expect(operation.type).toBe('batch');
      expect(operation.operations).toHaveLength(2);
      expect(operation.operations![0].type).toBe('append');
      expect(operation.operations![1].type).toBe('replace');
    });
  });
});