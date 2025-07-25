import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SectionEditStrategy } from './SectionEditStrategy.js';
import { NewSectionOperation, EditContext, EditOperation } from './IEditStrategy.js';
import type { IObsidianClient } from '../../obsidian/interfaces/IObsidianClient.js';

describe('SectionEditStrategy', () => {
  let strategy: SectionEditStrategy;
  let mockClient: IObsidianClient;
  let context: EditContext;

  beforeEach(() => {
    strategy = new SectionEditStrategy();
    mockClient = {
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      appendContent: vi.fn(),
      patchContent: vi.fn()
    } as unknown as IObsidianClient;
    
    context = {
      filepath: 'test.md',
      client: mockClient
    };
  });

  describe('canHandle', () => {
    it('should handle new-section operations', async () => {
      const operation: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'end',
        content: 'Section content'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(true);
    });

    it('should not handle other operation types', async () => {
      const operation: EditOperation = {
        type: 'append',
        content: 'test'
      };

      const result = await strategy.canHandle(operation);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should append section at end of file', async () => {
      const operation: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'end',
        content: 'Section content'
      };

      const result = await strategy.execute(operation, context);

      expect(mockClient.appendContent).toHaveBeenCalledWith(
        'test.md',
        '\n## New Section\nSection content',
        false
      );
      expect(result).toEqual({
        success: true,
        message: 'Successfully created section "New Section" in test.md',
        operation: 'new_section',
        filepath: 'test.md',
        section: 'New Section',
        position: 'end'
      });
    });

    it('should prepend section at start of file', async () => {
      const operation: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'start',
        content: 'Section content'
      };

      vi.mocked(mockClient.getFileContents).mockResolvedValue('Existing content');

      const result = await strategy.execute(operation, context);

      expect(mockClient.updateFile).toHaveBeenCalledWith(
        'test.md',
        '\n## New Section\nSection content\n\nExisting content'
      );
      expect(result.success).toBe(true);
    });

    it('should insert section after specified heading', async () => {
      const operation: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'Existing Heading',
        content: 'Section content'
      };

      const result = await strategy.execute(operation, context);

      expect(mockClient.patchContent).toHaveBeenCalledWith(
        'test.md',
        '\n## New Section\nSection content',
        {
          targetType: 'heading',
          target: 'Existing Heading',
          insertAfter: true,
          createIfNotExists: false
        }
      );
      expect(result.success).toBe(true);
    });

    it('should handle sections without content', async () => {
      const operation: NewSectionOperation = {
        type: 'new-section',
        title: 'Empty Section',
        at: 'end'
      };

      const result = await strategy.execute(operation, context);

      expect(mockClient.appendContent).toHaveBeenCalledWith(
        'test.md',
        '\n## Empty Section\n',
        false
      );
      expect(result.success).toBe(true);
    });

    it('should return error with alternative on failure', async () => {
      const operation: NewSectionOperation = {
        type: 'new-section',
        title: 'New Section',
        at: 'Missing Heading',
        content: 'Section content'
      };

      vi.mocked(mockClient.patchContent).mockRejectedValue(new Error('Heading not found'));

      const result = await strategy.execute(operation, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('New section creation failed');
      expect(result.working_alternative).toBeDefined();
      expect(result.working_alternative?.description).toBe('Try appending the section to the end');
    });

    it('should throw error for non-new-section operations', async () => {
      const operation = {
        type: 'append',
        content: 'test'
      } as any;

      await expect(strategy.execute(operation, context)).rejects.toThrow(
        'Cannot execute non-new-section operation'
      );
    });
  });
});