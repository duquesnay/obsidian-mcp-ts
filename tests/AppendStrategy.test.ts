import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppendStrategy } from '../src/tools/strategies/AppendStrategy.js';
import { AppendOperation, EditContext } from '../src/tools/strategies/IEditStrategy.js';
import type { IObsidianClient } from '../src/obsidian/interfaces/IObsidianClient.js';

describe('AppendStrategy', () => {
  let strategy: AppendStrategy;
  let mockClient: IObsidianClient;
  let context: EditContext;

  beforeEach(() => {
    strategy = new AppendStrategy();
    mockClient = {
      appendContent: vi.fn(),
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      patchContent: vi.fn(),
    } as any;
    
    context = {
      filepath: 'test.md',
      client: mockClient
    };
  });

  describe('canHandle', () => {
    it('should return true for append operations', async () => {
      const operation: AppendOperation = {
        type: 'append',
        content: 'New content'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(true);
    });

    it('should return false for non-append operations', async () => {
      const operation = {
        type: 'replace',
        find: 'old',
        replace: 'new'
      } as any;

      const result = await strategy.canHandle(operation);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should successfully append content to a file', async () => {
      const operation: AppendOperation = {
        type: 'append',
        content: 'New content to append'
      };

      const result = await strategy.execute(operation, context);

      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'New content to append', false);
      expect(result).toEqual({
        success: true,
        message: 'Successfully appended content to test.md',
        operation: 'append',
        filepath: 'test.md'
      });
    });

    it('should handle append errors and provide alternative', async () => {
      const operation: AppendOperation = {
        type: 'append',
        content: 'New content'
      };

      const error = new Error('Append failed');
      vi.mocked(mockClient.appendContent).mockRejectedValue(error);

      const result = await strategy.execute(operation, context);

      expect(result).toEqual({
        success: false,
        error: 'Append failed: Append failed',
        working_alternative: {
          description: 'Try using obsidian_simple_append instead',
          example: {
            filepath: 'test.md',
            content: 'New content',
            create_file_if_missing: true
          }
        }
      });
    });

    it('should throw error if operation type is not append', async () => {
      const operation = {
        type: 'replace',
        find: 'old',
        replace: 'new'
      } as any;

      await expect(strategy.execute(operation, context)).rejects.toThrow('Cannot execute non-append operation');
    });
  });
});