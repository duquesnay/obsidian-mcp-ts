import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppendContentTool } from '../../src/tools/AppendContentTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

// Mock path validator
vi.mock('../../src/utils/pathValidator.js', () => ({
  validatePath: vi.fn().mockImplementation(() => {}) // Default to no-op
}));

describe('AppendContentTool', () => {
  let tool: AppendContentTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(async () => {
    mockClient = {
      appendContent: vi.fn()
    };

    tool = new AppendContentTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
    
    // Reset path validator mock to default behavior
    const { validatePath } = await import('../../src/utils/pathValidator.js');
    vi.mocked(validatePath).mockImplementation(() => {});
  });

  describe('success scenarios', () => {
    it('should append content to existing file with default createIfNotExists', async () => {
      const args = {
        filepath: 'notes/journal.md',
        content: 'New entry for today'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Content appended successfully');
      expect(mockClient.appendContent).toHaveBeenCalledWith('notes/journal.md', 'New entry for today', true);
    });

    it('should append content with createIfNotExists set to true', async () => {
      const args = {
        filepath: 'new-file.md',
        content: 'First content',
        createIfNotExists: true
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Content appended successfully');
      expect(mockClient.appendContent).toHaveBeenCalledWith('new-file.md', 'First content', true);
    });

    it('should append content with createIfNotExists set to false', async () => {
      const args = {
        filepath: 'existing-file.md',
        content: 'Additional content',
        createIfNotExists: false
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Content appended successfully');
      expect(mockClient.appendContent).toHaveBeenCalledWith('existing-file.md', 'Additional content', false);
    });

    it('should handle multiline content', async () => {
      const args = {
        filepath: 'multiline.md',
        content: 'Line 1\nLine 2\n\nLine 4 with empty line above'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('multiline.md', 'Line 1\nLine 2\n\nLine 4 with empty line above', true);
    });

    it('should handle content with special characters', async () => {
      const args = {
        filepath: 'special.md',
        content: 'Content with "quotes", \\backslashes, and 🚀 emojis & symbols!'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('special.md', 'Content with "quotes", \\backslashes, and 🚀 emojis & symbols!', true);
    });

    it('should handle empty content string', async () => {
      const args = {
        filepath: 'empty-content.md',
        content: ''
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(10000);
      const args = {
        filepath: 'large-append.md',
        content: longContent
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('large-append.md', longContent, true);
    });

    it('should handle markdown content correctly', async () => {
      const markdownContent = `# New Section

## Subsection

- List item 1
- List item 2

> Blockquote text

\`\`\`javascript
console.log('Code block');
\`\`\``;

      const args = {
        filepath: 'markdown.md',
        content: markdownContent
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('markdown.md', markdownContent, true);
    });
  });

  describe('error scenarios - input validation', () => {
    it('should handle missing filepath parameter', async () => {
      const args = {
        content: 'Some content'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
      expect(response.tool).toBe('obsidian_append_content');
    });

    it('should handle empty filepath parameter', async () => {
      const args = {
        filepath: '',
        content: 'Some content'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle null filepath parameter', async () => {
      const args = {
        filepath: null,
        content: 'Some content'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle missing content parameter', async () => {
      const args = {
        filepath: 'test.md'
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle null content parameter', async () => {
      const args = {
        filepath: 'test.md',
        content: null
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle undefined content parameter', async () => {
      const args = {
        filepath: 'test.md',
        content: undefined
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });
  });

  describe('error scenarios - file operations', () => {
    it('should handle file not found when createIfNotExists is false', async () => {
      const args = {
        filepath: 'nonexistent.md',
        content: 'New content',
        createIfNotExists: false
      };

      const error = new Error('File not found');
      (error as any).response = { status: 404 };
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('File not found');
      expect(response.tool).toBe('obsidian_append_content');
    });

    it('should handle permission errors', async () => {
      const args = {
        filepath: 'protected.md',
        content: 'Content'
      };

      const error = new Error('Permission denied');
      (error as any).response = { status: 403 };
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Permission denied');
    });

    it('should handle API connection errors', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Content'
      };

      const error = new Error('Connection refused');
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Connection refused');
    });

    it('should handle timeout errors', async () => {
      const args = {
        filepath: 'large-file.md',
        content: 'Content to append'
      };

      const error = new Error('Request timeout');
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Request timeout');
    });

    it('should handle disk space errors', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Large content'
      };

      const error = new Error('Insufficient disk space');
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Insufficient disk space');
    });

    it('should handle file locked errors', async () => {
      const args = {
        filepath: 'locked.md',
        content: 'Content'
      };

      const error = new Error('File is currently locked');
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('File is currently locked');
    });
  });

  describe('path validation', () => {
    it('should validate filepath using path validator', async () => {
      const { validatePath } = await import('../../src/utils/pathValidator.js');
      
      const args = {
        filepath: 'valid/path.md',
        content: 'Content'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(validatePath).toHaveBeenCalledWith('valid/path.md', 'filepath');
    });

    it('should handle path validation errors', async () => {
      const { validatePath } = await import('../../src/utils/pathValidator.js');
      vi.mocked(validatePath).mockImplementation(() => {
        throw new Error('Invalid path: contains dangerous characters');
      });

      const args = {
        filepath: '../../../etc/passwd',
        content: 'Malicious content'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid path: contains dangerous characters');
    });

    it('should handle path traversal attempts', async () => {
      const { validatePath } = await import('../../src/utils/pathValidator.js');
      vi.mocked(validatePath).mockImplementation(() => {
        throw new Error('Path traversal detected');
      });

      const args = {
        filepath: '../../sensitive.txt',
        content: 'Content'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Path traversal detected');
    });

    it('should handle absolute path attempts', async () => {
      const { validatePath } = await import('../../src/utils/pathValidator.js');
      vi.mocked(validatePath).mockImplementation(() => {
        throw new Error('Absolute paths not allowed');
      });

      const args = {
        filepath: '/absolute/path.md',
        content: 'Content'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Absolute paths not allowed');
    });
  });

  describe('createIfNotExists parameter handling', () => {
    it('should default createIfNotExists to true when not specified', async () => {
      const args = {
        filepath: 'default-create.md',
        content: 'Content'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.appendContent).toHaveBeenCalledWith('default-create.md', 'Content', true);
    });

    it('should respect explicit createIfNotExists true', async () => {
      const args = {
        filepath: 'explicit-true.md',
        content: 'Content',
        createIfNotExists: true
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.appendContent).toHaveBeenCalledWith('explicit-true.md', 'Content', true);
    });

    it('should respect explicit createIfNotExists false', async () => {
      const args = {
        filepath: 'explicit-false.md',
        content: 'Content',
        createIfNotExists: false
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      await tool.execute(args);

      expect(mockClient.appendContent).toHaveBeenCalledWith('explicit-false.md', 'Content', false);
    });

    it('should handle falsy createIfNotExists values correctly', async () => {
      const falsyValues = [false, 0, '', null, undefined];
      
      for (const falsyValue of falsyValues) {
        const args = {
          filepath: 'falsy-test.md',
          content: 'Content',
          createIfNotExists: falsyValue as any
        };

        vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

        await tool.execute(args);

        const expectedValue = falsyValue !== false; // Only false should be false, others default to true
        expect(mockClient.appendContent).toHaveBeenCalledWith('falsy-test.md', 'Content', expectedValue);
      }
    });
  });

  describe('response format validation', () => {
    it('should return structured success response', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Content'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      
      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'Content appended successfully');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.message).toBe('string');
    });

    it('should return structured error response', async () => {
      const args = {
        filepath: 'error.md',
        content: 'Content'
      };

      const error = new Error('Test error');
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('tool', 'obsidian_append_content');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.error).toBe('string');
    });

    it('should handle consistent response structure across scenarios', async () => {
      const testCases = [
        { 
          name: 'success case',
          args: { filepath: 'success.md', content: 'Content' },
          shouldSucceed: true 
        },
        { 
          name: 'error case',
          args: { filepath: 'error.md', content: 'Content' },
          shouldSucceed: false,
          error: 'Test error'
        }
      ];

      for (const testCase of testCases) {
        if (testCase.shouldSucceed) {
          vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);
        } else {
          vi.mocked(mockClient.appendContent!).mockRejectedValue(new Error(testCase.error!));
        }

        const result = await tool.execute(testCase.args);
        const response = JSON.parse(result.text);

        expect(response).toHaveProperty('success');
        expect(typeof response.success).toBe('boolean');
        
        if (testCase.shouldSucceed) {
          expect(response.success).toBe(true);
          expect(response).toHaveProperty('message');
        } else {
          expect(response.success).toBe(false);
          expect(response).toHaveProperty('error');
          expect(response).toHaveProperty('tool');
        }
      }
    });
  });

  describe('LLM ergonomics', () => {
    it('should provide clear confirmation of append operation', async () => {
      const args = {
        filepath: 'journal.md',
        content: 'Important entry'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // LLM should clearly understand the operation succeeded
      expect(response.success).toBe(true);
      expect(response.message).toContain('appended successfully');
      expect(typeof response.success).toBe('boolean'); // Easily checkable
    });

    it('should provide actionable error information', async () => {
      const args = {
        filepath: 'readonly.md',
        content: 'Content'
      };

      const error = new Error('Permission denied');
      (error as any).response = { status: 403 };
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // LLM should understand what went wrong
      expect(response.success).toBe(false);
      expect(response.error).toBe('Permission denied');
      expect(response.tool).toBe('obsidian_append_content');
      
      // Error should be human-readable
      expect(response.error).not.toContain('undefined');
      expect(response.error).not.toContain('[object Object]');
    });

    it('should handle different content types seamlessly', async () => {
      const contentTypes = [
        'Plain text content',
        '# Markdown heading\n\nWith paragraph',
        '- List item 1\n- List item 2',
        '```javascript\nconsole.log("code");\n```',
        'Text with "quotes" and special chars!',
        'Multi\nline\ncontent',
        ''
      ];

      for (const content of contentTypes) {
        const args = {
          filepath: 'test-content.md',
          content
        };

        if (content === '') {
          // Empty content should fail validation
          const result = await tool.execute(args);
          const response = JSON.parse(result.text);
          expect(response.success).toBe(false);
        } else {
          vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);
          
          const result = await tool.execute(args);
          const response = JSON.parse(result.text);
          
          expect(response.success).toBe(true);
          expect(mockClient.appendContent).toHaveBeenCalledWith('test-content.md', content, true);
        }
      }
    });

    it('should be clear about file creation behavior', async () => {
      const testCases = [
        { createIfNotExists: true, description: 'will create file if needed' },
        { createIfNotExists: false, description: 'requires existing file' },
        { createIfNotExists: undefined, description: 'will create file by default' }
      ];

      for (const testCase of testCases) {
        const args: any = {
          filepath: 'test.md',
          content: 'Content'
        };
        
        if (testCase.createIfNotExists !== undefined) {
          args.createIfNotExists = testCase.createIfNotExists;
        }

        vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

        const result = await tool.execute(args);
        const response = JSON.parse(result.text);

        expect(response.success).toBe(true);
        
        const expectedCreateValue = testCase.createIfNotExists !== false;
        expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'Content', expectedCreateValue);
      }
    });

    it('should maintain consistent tool identification', async () => {
      const args = {
        filepath: 'test.md',
        content: 'Content'
      };

      // Test error scenario only (success doesn't include tool field)
      const error = new Error('Test error');
      vi.mocked(mockClient.appendContent!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.tool).toBe('obsidian_append_content');
    });
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_append_content');
      expect(tool.description).toContain('Append content');
      expect(tool.description).toContain('vault');
      expect(tool.description).toContain('Auto-adds newline between content');
      expect(tool.description).toContain('NOT filesystem files');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.filepath).toBeDefined();
      expect(tool.inputSchema.properties.content).toBeDefined();
      expect(tool.inputSchema.properties.createIfNotExists).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['filepath', 'content']);
    });

    it('should specify parameters correctly', () => {
      const schema = tool.inputSchema.properties;
      
      expect(schema.filepath.type).toBe('string');
      expect(schema.filepath.description).toContain('Path of the file to append to');
      expect(schema.filepath.description).toContain('relative to vault root');
      expect(schema.filepath.description).toContain('created if it doesn\'t exist');
      
      expect(schema.content.type).toBe('string');
      expect(schema.content.description).toBe('The content to append to the file.');
      
      expect(schema.createIfNotExists.type).toBe('boolean');
      expect(schema.createIfNotExists.description).toBe('Create the file if it doesn\'t exist.');
      expect(schema.createIfNotExists.default).toBe(true);
    });

    it('should indicate default behavior for createIfNotExists', () => {
      const createProperty = tool.inputSchema.properties.createIfNotExists;
      expect(createProperty.default).toBe(true);
      expect(createProperty.description).toContain('Create the file if it doesn\'t exist');
    });

    it('should explain automatic newline behavior', () => {
      expect(tool.description).toContain('Auto-adds newline between content');
      expect(tool.description).toContain('Auto-adds newline');
    });
  });

  describe('edge cases', () => {
    it('should handle files with no extension', async () => {
      const args = {
        filepath: 'README',
        content: 'Additional info'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('README', 'Additional info', true);
    });

    it('should handle very long file paths', async () => {
      const longPath = 'very/long/nested/path/structure/with/many/levels/and/a/very/long/filename.md';
      const args = {
        filepath: longPath,
        content: 'Content'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith(longPath, 'Content', true);
    });

    it('should handle content with only whitespace', async () => {
      const args = {
        filepath: 'whitespace.md',
        content: '   \n\t  \n   '
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('whitespace.md', '   \n\t  \n   ', true);
    });

    it('should handle unicode content', async () => {
      const args = {
        filepath: 'unicode.md',
        content: '你好世界 🌍 ñoño café résumé'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('unicode.md', '你好世界 🌍 ñoño café résumé', true);
    });

    it('should handle files with special characters in path', async () => {
      const args = {
        filepath: 'folder with spaces/file-with-dashes_and_underscores (2024).md',
        content: 'Content'
      };

      vi.mocked(mockClient.appendContent!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.appendContent).toHaveBeenCalledWith('folder with spaces/file-with-dashes_and_underscores (2024).md', 'Content', true);
    });
  });
});