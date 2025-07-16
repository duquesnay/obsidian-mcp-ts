import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleAppendTool } from '../../src/tools/SimpleAppendTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

describe('SimpleAppendTool', () => {
  let tool: SimpleAppendTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(() => {
    mockClient = {
      appendContent: vi.fn()
    };

    tool = new SimpleAppendTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('success scenarios', () => {
    it('should append content successfully', async () => {
      const args = {
        filepath: 'test.md',
        content: 'New content to append'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully appended content to test.md');
      expect(response.operation).toBe('append');
      expect(response.filepath).toBe('test.md');
      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'New content to append', false);
    });

    it('should handle create_file_if_missing option', async () => {
      const args = {
        filepath: 'new-file.md',
        content: 'Content for new file',
        create_file_if_missing: true
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('new-file.md', 'Content for new file', true);
    });

    it('should handle empty content', async () => {
      const args = {
        filepath: 'test.md',
        content: ''
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', '', false);
    });

    it('should handle multiline content', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Line 1\nLine 2\nLine 3'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'Line 1\nLine 2\nLine 3', false);
    });
  });

  describe('error scenarios - input validation', () => {
    it('should provide recovery when filepath is missing', async () => {
      const args = {
        content: 'Some content'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
      expect(response.suggestion).toContain('Provide filepath and content parameters');
      expect(response.example).toEqual({
        filepath: 'notes.md',
        content: 'Text to append'
      });
    });

    it('should provide recovery when content is missing', async () => {
      const args = {
        filepath: 'test.md'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
      expect(response.example).toBeDefined();
    });

    it('should allow content to be empty string', async () => {
      const args = {
        filepath: 'test.md',
        content: ''
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
    });
  });

  describe('error scenarios - file operations', () => {
    it('should provide recovery for file not found errors', async () => {
      const args = {
        filepath: 'nonexistent.md',
        content: 'Content to append'
      };

      const error = new Error('File not found');
      (error as any).response = { status: 404 };
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.suggestion).toContain('File does not exist');
      expect(response.suggestion).toContain('create_file_if_missing to true');
      expect(response.working_alternative).toContain('Enable file creation');
      expect(response.example).toEqual({
        filepath: 'nonexistent.md',
        content: 'Content to append',
        create_file_if_missing: true
      });
    });

    it('should provide recovery for permission errors', async () => {
      const args = {
        filepath: 'protected.md',
        content: 'Content to append'
      };

      const error = new Error('Permission denied');
      (error as any).response = { status: 403 };
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Permission denied');
      expect(response.suggestion).toContain('OBSIDIAN_API_KEY');
      expect(response.working_alternative).toContain('Local REST API plugin');
    });

    it('should provide alternative tools for generic errors', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Content to append'
      };

      vi.mocked(mockClient.appendContent!).mockRejectedValue(new Error('Generic network error'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.alternatives).toBeDefined();
      expect(response.alternatives[0].tool).toBe('obsidian_simple_replace');
      expect(response.alternatives[0].example).toEqual({
        filepath: 'test.md',
        find: 'old text',
        replace: 'new text'
      });
    });
  });

  describe('LLM ergonomics validation', () => {
    it('should provide working examples in all error responses', async () => {
      const testCases = [
        // Missing filepath
        { args: { content: 'content' } },
        // Missing content
        { args: { filepath: 'test.md' } },
        // File not found
        { args: { filepath: 'missing.md', content: 'content' }, shouldMockError: true }
      ];

      for (const testCase of testCases) {
        if (testCase.shouldMockError) {
          const error = new Error('File not found');
          (error as any).response = { status: 404 };
          vi.mocked(mockClient.appendContent!).mockRejectedValue(error);
        }

        const result = await tool.execute(testCase.args as any);
        const response = JSON.parse(result.text);

        expect(response.success).toBe(false);
        expect(response.example || response.alternatives).toBeDefined();
      }
    });

    it('should provide appropriate alternative tool suggestions', async () => {
      const args = {
        filepath: 'test.md',
        content: 'content'
      };

      vi.mocked(mockClient.appendContent!).mockRejectedValue(new Error('Generic error'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.alternatives[0].description).toContain('obsidian_simple_replace');
      expect(response.alternatives[0].tool).toBe('obsidian_simple_replace');
    });

    it('should maintain tool name consistency in responses', async () => {
      const args = {
        filepath: 'test.md',
        content: 'content'
      };

      vi.mocked(mockClient.appendContent!).mockRejectedValue(new Error('Test error'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.tool).toBe('obsidian_simple_append');
    });

    it('should handle special characters in content', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Content with special chars: áéíóú ñ ç'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'Content with special chars: áéíóú ñ ç', false);
    });
  });

  describe('default parameter handling', () => {
    it('should default create_file_if_missing to false when not provided', async () => {
      const args = {
        filepath: 'test.md',
        content: 'content'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'content', false);
    });

    it('should respect create_file_if_missing when explicitly set to false', async () => {
      const args = {
        filepath: 'test.md',
        content: 'content',
        create_file_if_missing: false
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'content', false);
    });
  });
});