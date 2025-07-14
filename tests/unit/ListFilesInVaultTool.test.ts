import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListFilesInVaultTool } from '../../src/tools/ListFilesInVaultTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

describe('ListFilesInVaultTool', () => {
  let tool: ListFilesInVaultTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(() => {
    mockClient = {
      listFilesInVault: vi.fn()
    };

    tool = new ListFilesInVaultTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('success scenarios', () => {
    it('should list files successfully', async () => {
      const mockFiles = [
        { name: 'note1.md', path: 'note1.md', type: 'file' },
        { name: 'note2.md', path: 'folder/note2.md', type: 'file' },
        { name: 'folder', path: 'folder', type: 'folder' }
      ];

      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue(mockFiles);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toEqual(mockFiles);
      expect(response.count).toBe(3);
      expect(mockClient.listFilesInVault).toHaveBeenCalled();
    });

    it('should handle empty vault', async () => {
      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue([]);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toEqual([]);
      expect(response.count).toBe(0);
    });

    it('should handle large number of files', async () => {
      const mockFiles = Array.from({ length: 1000 }, (_, i) => ({
        name: `note${i}.md`,
        path: `folder${i % 10}/note${i}.md`,
        type: 'file'
      }));

      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue(mockFiles);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toHaveLength(1000);
      expect(response.count).toBe(1000);
    });
  });

  describe('error scenarios', () => {
    it('should handle API connection errors', async () => {
      const error = new Error('Connection refused');
      vi.mocked(mockClient.listFilesInVault!).mockRejectedValue(error);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Connection refused');
    });

    it('should handle permission errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };
      vi.mocked(mockClient.listFilesInVault!).mockRejectedValue(error);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unauthorized');
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout');
      vi.mocked(mockClient.listFilesInVault!).mockRejectedValue(error);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Request timeout');
    });
  });

  describe('response format validation', () => {
    it('should include all required response fields', async () => {
      const mockFiles = [
        { name: 'test.md', path: 'test.md', type: 'file' }
      ];
      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue(mockFiles);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response).toHaveProperty('files');
      expect(response).toHaveProperty('count');
      expect(typeof response.count).toBe('number');
      expect(Array.isArray(response.files)).toBe(true);
    });

    it('should preserve file metadata structure', async () => {
      const mockFiles = [
        { 
          name: 'complex-note.md', 
          path: 'projects/2024/complex-note.md', 
          type: 'file',
          size: 1024,
          modified: '2024-01-01T00:00:00Z'
        }
      ];
      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue(mockFiles);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files[0]).toEqual(mockFiles[0]);
      expect(response.files[0]).toHaveProperty('name');
      expect(response.files[0]).toHaveProperty('path');
      expect(response.files[0]).toHaveProperty('type');
    });
  });

  describe('LLM ergonomics', () => {
    it('should provide structured output for easy parsing', async () => {
      const mockFiles = [
        { name: 'note1.md', path: 'note1.md', type: 'file' },
        { name: 'images', path: 'images', type: 'folder' }
      ];
      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue(mockFiles);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      // Should be easy for LLMs to iterate through
      expect(response.files).toBeInstanceOf(Array);
      expect(response.count).toBe(2);
      
      // Each file should have consistent structure
      response.files.forEach((file: any) => {
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('type');
      });
    });

    it('should handle mixed content types gracefully', async () => {
      const mockFiles = [
        { name: 'readme.md', path: 'readme.md', type: 'file' },
        { name: 'images', path: 'images', type: 'folder' },
        { name: 'data.json', path: 'data/data.json', type: 'file' },
        { name: 'archive', path: 'old/archive', type: 'folder' }
      ];
      vi.mocked(mockClient.listFilesInVault!).mockResolvedValue(mockFiles);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      const files = response.files.filter((f: any) => f.type === 'file');
      const folders = response.files.filter((f: any) => f.type === 'folder');
      
      expect(files).toHaveLength(2);
      expect(folders).toHaveLength(2);
      expect(response.count).toBe(4);
    });
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_list_files_in_vault');
      expect(tool.description).toContain('List all notes and folders');
      expect(tool.description).toContain('vault');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toEqual([]);
    });
  });
});