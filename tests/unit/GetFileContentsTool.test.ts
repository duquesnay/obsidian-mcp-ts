import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetFileContentsTool } from '../../src/tools/GetFileContentsTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

// Mock path validator
vi.mock('../../src/utils/pathValidator.js', () => ({
  validatePath: vi.fn().mockImplementation(() => {}) // Default to no-op
}));

describe('GetFileContentsTool', () => {
  let tool: GetFileContentsTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(async () => {
    mockClient = {
      getFileContents: vi.fn()
    };

    tool = new GetFileContentsTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
    
    // Reset path validator mock to default behavior
    const { validatePath } = await import('../../src/utils/pathValidator.js');
    vi.mocked(validatePath).mockImplementation(() => {});
  });

  describe('success scenarios', () => {
    it('should get file contents with default format', async () => {
      const args = {
        filepath: 'notes/example.md'
      };

      const mockContent = '# Example Note\n\nThis is content.';
      vi.mocked(mockClient.getFileContents!).mockResolvedValue(mockContent);

      const result = await tool.execute(args);
      
      // For string content, the result.text contains the raw string
      expect(result.text).toBe(mockContent);
      expect(mockClient.getFileContents).toHaveBeenCalledWith('notes/example.md', undefined);
    });

    it('should get file contents with specified format', async () => {
      const args = {
        filepath: 'notes/example.md',
        format: 'plain' as const
      };

      const mockContent = 'Example Note\n\nThis is content.';
      vi.mocked(mockClient.getFileContents!).mockResolvedValue(mockContent);

      const result = await tool.execute(args);
      
      // For string content, the result.text contains the raw string
      expect(result.text).toBe(mockContent);
      expect(mockClient.getFileContents).toHaveBeenCalledWith('notes/example.md', 'plain');
    });

    it('should handle all supported formats', async () => {
      const formats: Array<'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'> = [
        'content', 'metadata', 'frontmatter', 'plain', 'html'
      ];

      for (const format of formats) {
        const args = {
          filepath: 'test.md',
          format
        };

        const mockResponse = format === 'metadata' 
          ? { name: 'test.md', size: 100, modified: '2024-01-01' }
          : `Content in ${format} format`;
        
        vi.mocked(mockClient.getFileContents!).mockResolvedValue(mockResponse);

        const result = await tool.execute(args);
        
        if (format === 'metadata') {
          // Object responses are JSON-stringified
          const response = JSON.parse(result.text);
          expect(response).toEqual(mockResponse);
        } else {
          // String responses are returned directly
          expect(result.text).toBe(mockResponse);
        }
        
        expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md', format);
      }
    });

    it('should handle large file contents', async () => {
      const args = {
        filepath: 'large-file.md'
      };

      const largeContent = 'a'.repeat(10000) + '\n\n' + 'b'.repeat(10000);
      vi.mocked(mockClient.getFileContents!).mockResolvedValue(largeContent);

      const result = await tool.execute(args);
      
      // For string content, the result.text contains the raw string
      expect(result.text).toBe(largeContent);
      expect(result.text.length).toBe(20002); // 20000 chars + 2 newlines
    });
  });

  describe('error scenarios - input validation', () => {
    it('should handle missing filepath parameter', async () => {
      const args = {};

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('filepath argument missing');
      expect(response.tool).toBe('obsidian_get_file_contents');
    });

    it('should handle empty filepath parameter', async () => {
      const args = {
        filepath: ''
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('filepath argument missing');
    });

    it('should handle null filepath parameter', async () => {
      const args = {
        filepath: null
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('filepath argument missing');
    });
  });

  describe('error scenarios - file operations', () => {
    it('should handle file not found errors', async () => {
      const args = {
        filepath: 'nonexistent.md'
      };

      const error = new Error('File not found');
      (error as any).response = { status: 404 };
      vi.mocked(mockClient.getFileContents!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('File not found');
      expect(response.tool).toBe('obsidian_get_file_contents');
    });

    it('should handle permission errors', async () => {
      const args = {
        filepath: 'restricted.md'
      };

      const error = new Error('Permission denied');
      (error as any).response = { status: 403 };
      vi.mocked(mockClient.getFileContents!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Permission denied');
    });

    it('should handle API timeout errors', async () => {
      const args = {
        filepath: 'large-file.md'
      };

      const error = new Error('Request timeout');
      vi.mocked(mockClient.getFileContents!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Request timeout');
    });

    it('should handle invalid format errors', async () => {
      const args = {
        filepath: 'test.md',
        format: 'invalid-format' as any
      };

      const error = new Error('Invalid format specified');
      vi.mocked(mockClient.getFileContents!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid format specified');
    });
  });

  describe('path validation', () => {
    it('should validate filepath using path validator', async () => {
      const { validatePath } = await import('../../src/utils/pathValidator.js');
      
      const args = {
        filepath: 'test/file.md'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('content');

      await tool.execute(args);

      expect(validatePath).toHaveBeenCalledWith('test/file.md', 'filepath');
    });

    it('should handle path validation errors', async () => {
      const { validatePath } = await import('../../src/utils/pathValidator.js');
      vi.mocked(validatePath).mockImplementation(() => {
        throw new Error('Invalid path: contains dangerous characters');
      });

      const args = {
        filepath: '../../../etc/passwd'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid path: contains dangerous characters');
    });
  });

  describe('response format validation', () => {
    it('should handle string content correctly', async () => {
      const args = {
        filepath: 'simple.md'
      };

      const mockContent = 'Simple markdown content';
      vi.mocked(mockClient.getFileContents!).mockResolvedValue(mockContent);

      const result = await tool.execute(args);
      
      expect(result.type).toBe('text');
      expect(result.text).toBe(mockContent);
    });

    it('should handle object content correctly (metadata format)', async () => {
      const args = {
        filepath: 'test.md',
        format: 'metadata' as const
      };

      const mockMetadata = {
        name: 'test.md',
        path: 'test.md',
        size: 1024,
        modified: '2024-01-01T00:00:00Z',
        created: '2024-01-01T00:00:00Z'
      };
      vi.mocked(mockClient.getFileContents!).mockResolvedValue(mockMetadata);

      const result = await tool.execute(args);
      
      // For object responses (like metadata), they are JSON-stringified
      const response = JSON.parse(result.text);
      expect(response).toEqual(mockMetadata);
      expect(response.name).toBe('test.md');
      expect(response.size).toBe(1024);
    });

    it('should handle empty content', async () => {
      const args = {
        filepath: 'empty.md'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('');

      const result = await tool.execute(args);
      
      // For string content, the result.text contains the raw string
      expect(result.text).toBe('');
    });

    it('should handle special characters in content', async () => {
      const args = {
        filepath: 'special.md'
      };

      const specialContent = 'Content with "quotes", \\backslashes, and 🚀 emojis';
      vi.mocked(mockClient.getFileContents!).mockResolvedValue(specialContent);

      const result = await tool.execute(args);
      
      // For string content, the result.text contains the raw string
      expect(result.text).toBe(specialContent);
    });
  });

  describe('LLM ergonomics', () => {
    it('should provide consistent response structure', async () => {
      const args = {
        filepath: 'test.md'
      };

      vi.mocked(mockClient.getFileContents!).mockResolvedValue('test content');

      const result = await tool.execute(args);
      
      expect(result).toHaveProperty('type', 'text');
      expect(result).toHaveProperty('text');
      expect(typeof result.text).toBe('string');
    });

    it('should handle different content types seamlessly', async () => {
      const testCases = [
        { format: 'content', expected: '# Header\nContent' },
        { format: 'plain', expected: 'Header\nContent' },
        { format: 'html', expected: '<h1>Header</h1>\n<p>Content</p>' },
        { format: 'frontmatter', expected: 'title: Test\ntags: [example]' }
      ];

      for (const testCase of testCases) {
        const args = {
          filepath: 'test.md',
          format: testCase.format as any
        };

        vi.mocked(mockClient.getFileContents!).mockResolvedValue(testCase.expected);

        const result = await tool.execute(args);
        
        // For string content, the result.text contains the raw string
        expect(result.text).toBe(testCase.expected);
      }
    });

    it('should be accessible to LLMs for further processing', async () => {
      const args = {
        filepath: 'structured.md'
      };

      const structuredContent = `# Document Title

## Section 1
Content for section 1

## Section 2  
Content for section 2

### Subsection
Nested content`;

      vi.mocked(mockClient.getFileContents!).mockResolvedValue(structuredContent);

      const result = await tool.execute(args);
      
      // For string content, the result.text contains the raw string
      // LLM should be able to parse and work with this content
      expect(result.text).toContain('# Document Title');
      expect(result.text).toContain('## Section 1');
      expect(result.text).toContain('### Subsection');
    });
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_get_file_contents');
      expect(tool.description).toContain('Return the content of a single file');
      expect(tool.description).toContain('vault');
      expect(tool.description).toContain('formats');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.filepath).toBeDefined();
      expect(tool.inputSchema.properties.format).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['filepath']);
      
      // Check format enum values
      expect(tool.inputSchema.properties.format.enum).toEqual([
        'content', 'metadata', 'frontmatter', 'plain', 'html'
      ]);
    });

    it('should specify format parameter correctly', () => {
      const formatProperty = tool.inputSchema.properties.format;
      expect(formatProperty.type).toBe('string');
      expect(formatProperty.enum).toContain('content');
      expect(formatProperty.enum).toContain('metadata');
      expect(formatProperty.enum).toContain('frontmatter');
      expect(formatProperty.enum).toContain('plain');
      expect(formatProperty.enum).toContain('html');
    });
  });
});