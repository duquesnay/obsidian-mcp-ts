import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FindReplaceStrategy } from '../../src/tools/strategies/FindReplaceStrategy.js';
import { EditContext, ReplaceOperation } from '../../src/tools/strategies/IEditStrategy.js';
import type { IObsidianClient } from '../../src/obsidian/interfaces/IObsidianClient.js';

describe('FindReplaceStrategy', () => {
  let strategy: FindReplaceStrategy;
  let mockClient: IObsidianClient;
  let context: EditContext;

  beforeEach(() => {
    strategy = new FindReplaceStrategy();
    mockClient = {
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      appendContent: vi.fn(),
      patchContent: vi.fn(),
    } as any;
    
    context = {
      filepath: 'test.md',
      client: mockClient
    };
  });

  describe('canHandle', () => {
    it('should handle replace operations', async () => {
      const operation: ReplaceOperation = {
        type: 'replace',
        find: 'old text',
        replace: 'new text'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(true);
    });

    it('should not handle non-replace operations', async () => {
      const operation = {
        type: 'append',
        content: 'test'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should replace text successfully', async () => {
      const operation: ReplaceOperation = {
        type: 'replace',
        find: 'old text',
        replace: 'new text'
      };

      const fileContent = 'This is old text in the file';
      const expectedContent = 'This is new text in the file';

      vi.mocked(mockClient.getFileContents).mockResolvedValue(fileContent);

      const result = await strategy.execute(operation, context);

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md');
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', expectedContent);
      expect(result).toEqual({
        success: true,
        message: 'Successfully replaced "old text" with "new text" in test.md',
        operation: 'replace',
        filepath: 'test.md',
        find: 'old text',
        replace: 'new text'
      });
    });

    it('should return warning when text is not found', async () => {
      const operation: ReplaceOperation = {
        type: 'replace',
        find: 'missing text',
        replace: 'new text'
      };

      const fileContent = 'This is some content in the file';

      vi.mocked(mockClient.getFileContents).mockResolvedValue(fileContent);

      const result = await strategy.execute(operation, context);

      expect(mockClient.updateFile).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Text "missing text" not found in test.md',
        suggestion: 'Check the exact text to replace. Text search is case-sensitive.',
        working_alternative: {
          description: 'Append instead',
          example: { file: 'test.md', append: 'new text' }
        }
      });
    });

    it('should handle errors during replacement', async () => {
      const operation: ReplaceOperation = {
        type: 'replace',
        find: 'old text',
        replace: 'new text'
      };

      const error = new Error('API error');
      vi.mocked(mockClient.getFileContents).mockRejectedValue(error);

      const result = await strategy.execute(operation, context);

      expect(result).toEqual({
        success: false,
        error: 'Replace failed: API error',
        working_alternative: {
          description: 'Try obsidian_simple_replace for basic text replacement',
          example: { filepath: 'test.md', find: 'old text', replace: 'new text' }
        }
      });
    });

    it('should throw error for non-replace operations', async () => {
      const operation = {
        type: 'append',
        content: 'test'
      } as any;

      await expect(strategy.execute(operation, context)).rejects.toThrow('Cannot execute non-replace operation');
    });
  });
});