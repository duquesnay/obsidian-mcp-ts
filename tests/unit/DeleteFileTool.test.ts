import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteFileTool } from '../../src/tools/DeleteFileTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

// Path validation is now done by PathValidationUtil internally

describe('DeleteFileTool', () => {
  let tool: DeleteFileTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(async () => {
    mockClient = {
      deleteFile: vi.fn()
    };

    tool = new DeleteFileTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('success scenarios', () => {
    it('should delete a file successfully', async () => {
      const args = {
        filepath: 'notes/old-note.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('File deleted successfully');
      expect(mockClient.deleteFile).toHaveBeenCalledWith('notes/old-note.md');
    });

    it('should delete a directory successfully', async () => {
      const args = {
        filepath: 'old-folder'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('File deleted successfully');
      expect(mockClient.deleteFile).toHaveBeenCalledWith('old-folder');
    });

    it('should delete nested directory successfully', async () => {
      const args = {
        filepath: 'projects/archived/old-project'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('File deleted successfully');
      expect(mockClient.deleteFile).toHaveBeenCalledWith('projects/archived/old-project');
    });

    it('should delete file with special characters in name', async () => {
      const args = {
        filepath: 'notes/file with spaces & symbols (2024).md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('File deleted successfully');
      expect(mockClient.deleteFile).toHaveBeenCalledWith('notes/file with spaces & symbols (2024).md');
    });

    it('should delete file with unicode characters', async () => {
      const args = {
        filepath: 'notes/文档.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(response.message).toBe('File deleted successfully');
      expect(mockClient.deleteFile).toHaveBeenCalledWith('notes/文档.md');
    });
  });

  describe('error scenarios - input validation', () => {
    it('should handle missing filepath parameter', async () => {
      const args = {};

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
      expect(response.tool).toBe('obsidian_delete_file');
    });

    it('should handle empty filepath parameter', async () => {
      const args = {
        filepath: ''
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle null filepath parameter', async () => {
      const args = {
        filepath: null
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });

    it('should handle undefined filepath parameter', async () => {
      const args = {
        filepath: undefined
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameters');
    });
  });

  describe('error scenarios - file operations', () => {
    it('should handle file not found errors', async () => {
      const args = {
        filepath: 'nonexistent-file.md'
      };

      const error = new Error('File not found');
      (error as any).response = { status: 404 };
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('File not found');
      expect(response.tool).toBe('obsidian_delete_file');
    });

    it('should handle permission errors', async () => {
      const args = {
        filepath: 'protected-file.md'
      };

      const error = new Error('Permission denied');
      (error as any).response = { status: 403 };
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Permission denied');
    });

    it('should handle API connection errors', async () => {
      const args = {
        filepath: 'test-file.md'
      };

      const error = new Error('Connection refused');
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Connection refused');
    });

    it('should handle timeout errors', async () => {
      const args = {
        filepath: 'large-directory'
      };

      const error = new Error('Request timeout');
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Request timeout');
    });

    it('should handle file in use errors', async () => {
      const args = {
        filepath: 'locked-file.md'
      };

      const error = new Error('File is currently in use');
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('File is currently in use');
    });

    it('should handle directory not empty errors', async () => {
      const args = {
        filepath: 'non-empty-directory'
      };

      const error = new Error('Directory not empty');
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Directory not empty');
    });
  });

  describe('path validation', () => {
    it('should validate filepath using PathValidationUtil', async () => {
      const args = {
        filepath: 'valid/path/file.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      await tool.execute(args);

      // The path validation happens internally now, just verify the call succeeds
      expect(mockClient.deleteFile).toHaveBeenCalled();
    });

    it('should handle path validation errors', async () => {
      const args = {
        filepath: '../../../etc/passwd'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('filepath contains parent directory traversal');
    });

    it('should handle path traversal attempts', async () => {
      const args = {
        filepath: '../../sensitive/file.txt'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('filepath contains parent directory traversal');
    });

    it('should handle absolute path attempts', async () => {
      const args = {
        filepath: '/absolute/path/file.md'
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('filepath cannot be an absolute path');
    });
  });

  describe('response format validation', () => {
    it('should return structured success response', async () => {
      const args = {
        filepath: 'test-file.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      
      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'File deleted successfully');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.message).toBe('string');
    });

    it('should return structured error response', async () => {
      const args = {
        filepath: 'nonexistent.md'
      };

      const error = new Error('File not found');
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('tool', 'obsidian_delete_file');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.error).toBe('string');
    });

    it('should handle consistent response structure across scenarios', async () => {
      const testCases = [
        { filepath: 'file1.md', shouldSucceed: true },
        { filepath: 'file2.md', shouldSucceed: false, error: 'File not found' }
      ];

      for (const testCase of testCases) {
        if (testCase.shouldSucceed) {
          vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);
        } else {
          vi.mocked(mockClient.deleteFile!).mockRejectedValue(new Error(testCase.error!));
        }

        const result = await tool.execute({ filepath: testCase.filepath });
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
    it('should provide clear confirmation of deletion', async () => {
      const args = {
        filepath: 'important-file.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // LLM should be able to clearly understand the operation completed
      expect(response.success).toBe(true);
      expect(response.message).toContain('deleted successfully');
      expect(typeof response.success).toBe('boolean'); // Easily checkable by LLM
    });

    it('should provide actionable error information', async () => {
      const args = {
        filepath: 'missing-file.md'
      };

      const error = new Error('File not found');
      (error as any).response = { status: 404 };
      vi.mocked(mockClient.deleteFile!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // LLM should be able to understand what went wrong
      expect(response.success).toBe(false);
      expect(response.error).toBe('File not found');
      expect(response.tool).toBe('obsidian_delete_file');
      
      // Error message should help LLM understand the issue
      expect(response.error).not.toContain('undefined');
      expect(response.error).not.toContain('[object Object]');
    });

    it('should handle different file types consistently', async () => {
      const fileTypes = [
        'document.md',
        'image.png', 
        'data.json',
        'script.js',
        'style.css',
        'README.txt'
      ];

      for (const filepath of fileTypes) {
        vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

        const result = await tool.execute({ filepath });
        const response = JSON.parse(result.text);

        expect(response.success).toBe(true);
        expect(response.message).toBe('File deleted successfully');
        expect(mockClient.deleteFile).toHaveBeenCalledWith(filepath);
      }
    });

    it('should maintain consistent tool identification', async () => {
      const args = {
        filepath: 'test.md'
      };

      // Test both success and error scenarios
      const scenarios = [
        { shouldSucceed: true },
        { shouldSucceed: false, error: 'Test error' }
      ];

      for (const scenario of scenarios) {
        if (scenario.shouldSucceed) {
          vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);
        } else {
          vi.mocked(mockClient.deleteFile!).mockRejectedValue(new Error(scenario.error!));
        }

        const result = await tool.execute(args);
        const response = JSON.parse(result.text);

        if (!scenario.shouldSucceed) {
          expect(response.tool).toBe('obsidian_delete_file');
        }
      }
    });

    it('should be clear about destructive nature of operation', async () => {
      const args = {
        filepath: 'important-data.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // The success message should clearly indicate deletion happened
      expect(response.message).toContain('deleted');
      expect(response.success).toBe(true);
      
      // LLM should understand this is a destructive operation that completed
      expect(response.message).not.toContain('created');
      expect(response.message).not.toContain('updated');
    });
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_delete_file');
      expect(tool.description).toContain('Delete a note or folder');
      expect(tool.description).toContain('vault');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.filepath).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['filepath']);
    });

    it('should specify filepath parameter correctly', () => {
      const filepathProperty = tool.inputSchema.properties.filepath;
      expect(filepathProperty.type).toBe('string');
      expect(filepathProperty.description).toContain('Path to the file or directory to delete');
      expect(filepathProperty.description).toContain('relative to vault root');
    });

    it('should clearly indicate destructive nature in description', () => {
      expect(tool.description).toContain('Delete');
      expect(tool.description.toLowerCase()).toContain('delete');
    });

    it('should support both files and directories', () => {
      expect(tool.description).toContain('note or folder');
      expect(tool.inputSchema.properties.filepath.description).toContain('file or directory');
    });
  });

  describe('edge cases', () => {
    it('should handle very long file paths', async () => {
      const longPath = 'very/long/nested/path/structure/with/many/levels/and/a/very/long/filename/that/tests/path/length/limits.md';
      const args = {
        filepath: longPath
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.deleteFile).toHaveBeenCalledWith(longPath);
    });

    it('should handle files with no extension', async () => {
      const args = {
        filepath: 'README'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.deleteFile).toHaveBeenCalledWith('README');
    });

    it('should handle hidden files', async () => {
      const args = {
        filepath: '.hidden-file'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.deleteFile).toHaveBeenCalledWith('.hidden-file');
    });

    it('should handle files with multiple dots', async () => {
      const args = {
        filepath: 'file.name.with.many.dots.md'
      };

      vi.mocked(mockClient.deleteFile!).mockResolvedValue(undefined);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(true);
      expect(mockClient.deleteFile).toHaveBeenCalledWith('file.name.with.many.dots.md');
    });
  });
});