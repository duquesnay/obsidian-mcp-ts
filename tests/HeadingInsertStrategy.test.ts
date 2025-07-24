import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HeadingInsertStrategy } from '../src/tools/strategies/HeadingInsertStrategy.js';
import { HeadingInsertOperation, EditContext } from '../src/tools/strategies/IEditStrategy.js';
import type { IObsidianClient } from '../src/obsidian/interfaces/IObsidianClient.js';

describe('HeadingInsertStrategy', () => {
  let strategy: HeadingInsertStrategy;
  let mockClient: IObsidianClient;
  let context: EditContext;

  beforeEach(() => {
    strategy = new HeadingInsertStrategy();
    mockClient = {
      patchContent: vi.fn(),
    } as any;
    context = {
      filepath: 'test.md',
      client: mockClient
    };
  });

  describe('canHandle', () => {
    it('should handle heading-insert operations', async () => {
      const operation: HeadingInsertOperation = {
        type: 'heading-insert',
        position: 'after',
        heading: 'Test Heading',
        content: 'New content'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(true);
    });

    it('should not handle other operation types', async () => {
      const operation = {
        type: 'append',
        content: 'Some content'
      };

      const result = await strategy.canHandle(operation as any);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should insert content after heading', async () => {
      const operation: HeadingInsertOperation = {
        type: 'heading-insert',
        position: 'after',
        heading: 'Test Heading',
        content: 'New content after heading'
      };

      const result = await strategy.execute(operation, context);

      expect(mockClient.patchContent).toHaveBeenCalledWith(
        'test.md',
        'New content after heading',
        {
          targetType: 'heading',
          target: 'Test Heading',
          insertAfter: true,
          insertBefore: false,
          createIfNotExists: false
        }
      );

      expect(result).toEqual({
        success: true,
        message: 'Successfully inserted content after heading "Test Heading" in test.md',
        operation: 'insert_after_heading',
        filepath: 'test.md',
        heading: 'Test Heading'
      });
    });

    it('should insert content before heading', async () => {
      const operation: HeadingInsertOperation = {
        type: 'heading-insert',
        position: 'before',
        heading: 'Test Heading',
        content: 'New content before heading'
      };

      const result = await strategy.execute(operation, context);

      expect(mockClient.patchContent).toHaveBeenCalledWith(
        'test.md',
        'New content before heading',
        {
          targetType: 'heading',
          target: 'Test Heading',
          insertAfter: false,
          insertBefore: true,
          createIfNotExists: false
        }
      );

      expect(result).toEqual({
        success: true,
        message: 'Successfully inserted content before heading "Test Heading" in test.md',
        operation: 'insert_before_heading',
        filepath: 'test.md',
        heading: 'Test Heading'
      });
    });

    it('should handle errors with working alternatives', async () => {
      const operation: HeadingInsertOperation = {
        type: 'heading-insert',
        position: 'after',
        heading: 'Non-existent Heading',
        content: 'New content'
      };

      vi.mocked(mockClient.patchContent).mockRejectedValueOnce(new Error('Heading not found'));

      const result = await strategy.execute(operation, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Heading insertion failed: Heading not found');
      expect(result.possible_causes).toBeDefined();
      expect(result.working_alternatives).toBeDefined();
      expect(result.working_alternatives[0].example).toEqual({
        file: 'test.md',
        append: 'New content'
      });
    });

    it('should throw error for non-heading-insert operations', async () => {
      const operation = {
        type: 'append',
        content: 'Some content'
      };

      await expect(strategy.execute(operation as any, context))
        .rejects.toThrow('Cannot execute non-heading-insert operation');
    });
  });
});