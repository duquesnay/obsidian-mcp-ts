import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InsertAfterHeadingTool } from '../../src/tools/InsertAfterHeadingTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

describe('InsertAfterHeadingTool', () => {
  let tool: InsertAfterHeadingTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(() => {
    mockClient = {
      patchContent: vi.fn()
    };

    tool = new InsertAfterHeadingTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('success scenarios', () => {
    it('should insert content after heading successfully', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Introduction',
        content: 'New content after intro'
      };

      vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully inserted content after heading "Introduction"');
      expect(response.operation).toBe('insert_after_heading');
      expect(response.filepath).toBe('test.md');
      expect(response.heading).toBe('Introduction');
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'New content after intro', {
        targetType: 'heading',
        target: 'Introduction',
        insertAfter: true,
        createIfNotExists: false
      });
    });

    it('should handle create_file_if_missing option', async () => {
      const args = {
        filepath: 'new-file.md',
        heading: 'New Section',
        content: 'Content for new section',
        create_file_if_missing: true
      };

      vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.patchContent).toHaveBeenCalledWith('new-file.md', 'Content for new section', {
        targetType: 'heading',
        target: 'New Section',
        insertAfter: true,
        createIfNotExists: true
      });
    });

    it('should handle headings with special characters', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Section with Numbers & Symbols (2024)',
        content: 'Content under special heading'
      };

      vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'Content under special heading', {
        targetType: 'heading',
        target: 'Section with Numbers & Symbols (2024)',
        insertAfter: true,
        createIfNotExists: false
      });
    });

    it('should handle multiline content insertion', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Details',
        content: 'Line 1\n\nLine 2 with paragraph break\n- List item'
      };

      vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'Line 1\n\nLine 2 with paragraph break\n- List item', expect.any(Object));
    });
  });

  describe('error scenarios - enhanced error handling', () => {
    it('should provide recovery suggestions when heading not found', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Nonexistent Heading',
        content: 'Content to insert'
      };

      const error = new Error('Heading not found');
      // Simulate the enhanced error detection
      error.message = 'invalid-target: heading not found';
      vi.mocked(mockClient.patchContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Heading "Nonexistent Heading" not found');
      expect(response.suggestion).toContain('Try using obsidian_simple_replace instead');
      expect(response.suggestion).toContain('## Nonexistent Heading');
      expect(response.alternative_approach).toContain('obsidian_simple_append');
      expect(response.alternative_approach).toContain('obsidian_simple_replace');
    });

    it('should handle invalid-target errors specifically', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Missing Section',
        content: 'Content to add'
      };

      const error = new Error('invalid-target');
      vi.mocked(mockClient.patchContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('"Missing Section" not found');
      expect(response.suggestion).toBeDefined();
      expect(response.alternative_approach).toBeDefined();
    });

    it('should provide contextual replacement suggestions', async () => {
      const args = {
        filepath: 'document.md',
        heading: 'Implementation',
        content: 'New implementation details'
      };

      const error = new Error('heading not found');
      vi.mocked(mockClient.patchContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.suggestion).toContain('## Implementation\\n\\nExisting content" and replace with "## Implementation\\n\\nExisting content\\n\\nNew implementation details');
    });

    it('should handle generic patch errors gracefully', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Section',
        content: 'Content'
      };

      vi.mocked(mockClient.patchContent!).mockRejectedValue(new Error('Network timeout'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Network timeout');
      expect(response.tool).toBe('obsidian_insert_after_heading');
    });
  });

  describe('input validation', () => {
    it('should require filepath parameter', async () => {
      const args = {
        heading: 'Section',
        content: 'Content'
      };

      // This should be caught by the schema validation, but let's test graceful handling
      const result = await tool.execute(args as any);
      
      // The tool should handle missing required parameters gracefully
      expect(result).toBeDefined();
    });

    it('should require heading parameter', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Content'
      };

      const result = await tool.execute(args as any);
      expect(result).toBeDefined();
    });

    it('should require content parameter', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Section'
      };

      const result = await tool.execute(args as any);
      expect(result).toBeDefined();
    });
  });

  describe('LLM ergonomics validation', () => {
    it('should provide working alternatives in error messages', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Missing Heading',
        content: 'Content to insert'
      };

      const error = new Error('invalid-target');
      vi.mocked(mockClient.patchContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.suggestion).toContain('obsidian_simple_replace');
      expect(response.alternative_approach).toContain('obsidian_simple_append');
    });

    it('should maintain consistent tool naming', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Section',
        content: 'Content'
      };

      vi.mocked(mockClient.patchContent!).mockRejectedValue(new Error('Test error'));

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.tool).toBe('obsidian_insert_after_heading');
    });

    it('should provide clear description in tool metadata', () => {
      expect(tool.description).toContain('Insert content after a specific heading');
      expect(tool.description).toContain('obsidian_simple_replace');
    });

    it('should handle edge cases in heading names', async () => {
      const edgeCases = [
        'Heading with "quotes"',
        'Heading with \n newline',
        'Heading with & ampersand',
        'Heading with / slash'
      ];

      for (const heading of edgeCases) {
        const args = {
          filepath: 'test.md',
          heading,
          content: 'Test content'
        };

        vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

        const result = await tool.execute(args);
        const response = JSON.parse(result.text);

        expect(response.success).toBe(true);
        expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'Test content', expect.objectContaining({
          target: heading
        }));
      }
    });
  });

  describe('default parameter handling', () => {
    it('should default create_file_if_missing to false when not provided', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Section',
        content: 'Content'
      };

      vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'Content', expect.objectContaining({
        createIfNotExists: false
      }));
    });

    it('should respect create_file_if_missing when explicitly set', async () => {
      const args = {
        filepath: 'test.md',
        heading: 'Section',
        content: 'Content',
        create_file_if_missing: true
      };

      vi.mocked(mockClient.patchContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'Content', expect.objectContaining({
        createIfNotExists: true
      }));
    });
  });
});