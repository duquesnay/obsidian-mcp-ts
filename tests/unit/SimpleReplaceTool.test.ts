import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleReplaceTool } from '../../src/tools/SimpleReplaceTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

describe('SimpleReplaceTool', () => {
  let tool: SimpleReplaceTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(() => {
    mockClient = {
      getFileContents: vi.fn(),
      updateFile: vi.fn()
    };

    tool = new SimpleReplaceTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('success scenarios', () => {
    it('should replace text successfully', async () => {
      const args = {
        filepath: 'test.md',
        find: 'old text',
        replace: 'new text'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('This is old text content');
      vi.mocked(mockClient.updateFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully replaced "old text" with "new text"');
      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md');
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'This is new text content');
    });

    it('should handle empty replace text', async () => {
      const args = {
        filepath: 'test.md',
        find: 'remove this',
        replace: ''
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('Text to remove this part');
      vi.mocked(mockClient.updateFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'Text to  part');
    });

    it('should handle exact match replacement', async () => {
      const args = {
        filepath: 'test.md',
        find: 'exact match',
        replace: 'replacement'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('exact match');
      vi.mocked(mockClient.updateFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'replacement');
    });
  });

  describe('error scenarios - input validation', () => {
    it('should provide recovery when filepath is missing', async () => {
      const args = {
        find: 'text',
        replace: 'replacement'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
      expect(response.suggestion).toContain('Provide filepath, find, and replace parameters');
      expect(response.example).toEqual({
        filepath: 'notes.md',
        find: 'old text',
        replace: 'new text'
      });
    });

    it('should provide recovery when find parameter is missing', async () => {
      const args = {
        filepath: 'test.md',
        replace: 'replacement'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
      expect(response.example).toBeDefined();
    });

    it('should allow replace parameter to be empty string', async () => {
      const args = {
        filepath: 'test.md',
        find: 'text',
        replace: ''
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('some text here');
      vi.mocked(mockClient.updateFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
    });
  });

  describe('error scenarios - text not found', () => {
    it('should provide recovery when text not found', async () => {
      const args = {
        filepath: 'test.md',
        find: 'nonexistent text',
        replace: 'replacement'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('This file has different content');

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Text "nonexistent text" not found');
      expect(response.suggestion).toContain('Check the exact text to replace');
      expect(response.working_alternative).toContain('Use obsidian_simple_append');
      expect(response.example).toEqual({
        filepath: 'test.md',
        append: 'replacement'
      });
    });

    it('should be case sensitive in text matching', async () => {
      const args = {
        filepath: 'test.md',
        find: 'TEXT',
        replace: 'replacement'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('This contains text in lowercase');

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('TEXT" not found');
    });
  });

  describe('error scenarios - file operations', () => {
    it('should provide recovery for file not found errors', async () => {
      const args = {
        filepath: 'nonexistent.md',
        find: 'text',
        replace: 'replacement'
      };

      const error = new Error('File not found');
      (error as any).response = { status: 404 };
      vi.mocked(mockClient.getFileContents!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.suggestion).toContain('File does not exist');
      expect(response.working_alternative).toContain('obsidian_list_files_in_vault');
    });

    it('should provide recovery for permission errors', async () => {
      const args = {
        filepath: 'protected.md',
        find: 'text',
        replace: 'replacement'
      };

      const error = new Error('Permission denied');
      (error as any).response = { status: 403 };
      vi.mocked(mockClient.getFileContents!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.suggestion).toContain('Permission denied');
      expect(response.working_alternative).toContain('API key');
    });

    it('should provide alternative tools for generic errors', async () => {
      const args = {
        filepath: 'test.md',
        find: 'text',
        replace: 'replacement'
      };

      vi.mocked(mockClient.getFileContents!).mockRejectedValue(new Error('Generic network error'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.alternatives).toBeDefined();
      expect(response.alternatives[0].tool).toBe('obsidian_simple_append');
    });
  });

  describe('LLM ergonomics validation', () => {
    it('should provide working examples in all error responses', async () => {
      const testCases = [
        // Missing parameters
        { args: { find: 'text', replace: 'new' } },
        // Text not found  
        { args: { filepath: 'test.md', find: 'missing', replace: 'new' }, mockContent: 'different content' }
      ];

      for (const testCase of testCases) {
        if (testCase.mockContent) {
          vi.mocked(mockClient.getFileContents!).mockResolvedValue(testCase.mockContent);
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
        find: 'missing text',
        replace: 'replacement'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('file content');

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.working_alternative).toContain('obsidian_simple_append');
      expect(response.example.append).toBe('replacement');
    });

    it('should maintain tool name consistency in responses', async () => {
      const args = {
        filepath: 'test.md',
        find: 'text',
        replace: 'replacement'
      };

      vi.mocked(mockClient.getFileContents!).mockRejectedValue(new Error('Test error'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.tool).toBe('obsidian_simple_replace');
    });
  });
});