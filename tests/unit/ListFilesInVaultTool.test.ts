import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListFilesInVaultTool } from '../../src/tools/ListFilesInVaultTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { defaultCachedHandlers } from '../../src/resources/CachedConcreteHandlers.js';

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
    
    // Reset all mocks to ensure test isolation
    vi.clearAllMocks();
  });

  describe('success scenarios', () => {
    it('should list files successfully', async () => {
      const mockStructureData = {
        structure: {
          files: ['note1.md'],
          folders: {
            'folder': {
              files: ['note2.md'],
              folders: {}
            }
          }
        },
        totalFiles: 2,
        totalFolders: 1
      };

      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toEqual(['note1.md', 'folder/note2.md']);
      expect(response.count).toBe(2);
      expect(mockClient.listFilesInVault).not.toHaveBeenCalled();
    });

    it('should handle empty vault', async () => {
      const mockStructureData = {
        structure: {
          files: [],
          folders: {}
        },
        totalFiles: 0,
        totalFolders: 0
      };

      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toEqual([]);
      expect(response.count).toBe(0);
    });

    it('should handle large number of files', async () => {
      const mockFiles = Array.from({ length: 1000 }, (_, i) => `note${i}.md`);
      
      const mockStructureData = {
        structure: {
          files: mockFiles,
          folders: {}
        },
        totalFiles: 1000,
        totalFolders: 0
      };

      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toHaveLength(1000);
      expect(response.count).toBe(1000);
    });
  });

  describe('error scenarios', () => {
    it('should handle API connection errors', async () => {
      const error = new Error('Connection refused');
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockRejectedValue(error);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Connection refused');
    });

    it('should handle permission errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockRejectedValue(error);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Authentication failed');
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout');
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockRejectedValue(error);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Request timeout');
    });
  });

  describe('response format validation', () => {
    it('should include all required response fields', async () => {
      const mockStructureData = {
        structure: {
          files: ['test.md'],
          folders: {}
        },
        totalFiles: 1,
        totalFolders: 0
      };
      
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response).toHaveProperty('files');
      expect(response).toHaveProperty('count');
      expect(typeof response.count).toBe('number');
      expect(Array.isArray(response.files)).toBe(true);
    });

    it('should return file paths as strings', async () => {
      const mockStructureData = {  
        structure: {
          files: [],
          folders: {
            'projects': {
              files: [],
              folders: {
                '2024': {
                  files: ['complex-note.md'],
                  folders: {}
                }
              }
            }
          }
        },
        totalFiles: 1,
        totalFolders: 2
      };
      
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files[0]).toBe('projects/2024/complex-note.md');
      expect(typeof response.files[0]).toBe('string');
      expect(response.count).toBe(1);
    });
  });

  describe('LLM ergonomics', () => {
    it('should provide structured output for easy parsing', async () => {
      const mockStructureData = {
        structure: {
          files: ['note1.md'],
          folders: {
            'images': {
              files: ['photo.jpg'],
              folders: {}
            }
          }
        },
        totalFiles: 2,
        totalFolders: 1
      };
      
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      // Should be easy for LLMs to iterate through
      expect(response.files).toBeInstanceOf(Array);
      expect(response.count).toBe(2);
      
      // Each file should be a string path
      response.files.forEach((file: any) => {
        expect(typeof file).toBe('string');
      });
      
      expect(response.files).toEqual(['note1.md', 'images/photo.jpg']);
    });

    it('should handle mixed content types gracefully', async () => {
      const mockStructureData = {
        structure: {
          files: ['readme.md'],
          folders: {
            'images': {
              files: [],
              folders: {}
            },
            'data': {
              files: ['data.json'],
              folders: {}
            },
            'old': {
              files: [],
              folders: {
                'archive': {
                  files: [],
                  folders: {}
                }
              }
            }
          }
        },
        totalFiles: 2, // Only actual files: readme.md and data/data.json
        totalFolders: 4 // images, data, old, archive
      };
      
      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureData);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);
      
      expect(response.files).toEqual(['readme.md', 'data/data.json']);
      expect(response.count).toBe(2); // Only files, not folders
    });
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_list_files_in_vault');
      expect(tool.description).toContain('List all notes and folders');
      expect(tool.description).toContain('vault');
    });

    it('should mention the vault://structure resource with 5min cache', () => {
      expect(tool.description).toContain('vault://structure');
      expect(tool.description).toMatch(/5\s*min(?:ute)?s?\s*cache/i);
      expect(tool.description).toContain('resource');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('pagination support', () => {
    it('should handle paginated vault structure responses', async () => {
      // Mock structure that will be flattened into 100 files total
      const mockStructureResponse = {
        structure: {
          files: Array.from({ length: 100 }, (_, i) => `file${i + 1}.md`),
          folders: {}
        }
      };

      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureResponse);

      const result = await tool.execute({ limit: 3, offset: 0 });
      const response = JSON.parse(result.text);

      expect(response.files).toEqual(['file1.md', 'file2.md', 'file3.md']);
      expect(response.totalCount).toBe(100);
      expect(response.hasMore).toBe(true);
      expect(response.limit).toBe(3);
      expect(response.offset).toBe(0);
      expect(response.nextOffset).toBe(3);
    });

    it('should handle legacy mode responses without pagination', async () => {
      const mockLegacyResponse = {
        structure: {
          files: ['file1.md'],
          folders: {
            'folder1': {
              files: ['file2.md'],
              folders: {}
            }
          }
        },
        totalFiles: 2,
        totalFolders: 1
      };

      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockLegacyResponse);

      const result = await tool.execute({});
      const response = JSON.parse(result.text);

      expect(response.files).toEqual(['file1.md', 'folder1/file2.md']);
      expect(response.count).toBe(2);
      expect(response).not.toHaveProperty('totalCount');
      expect(response).not.toHaveProperty('hasMore');
    });

    it('should correctly construct vault URI with pagination parameters', async () => {
      const mockStructureResponse = {
        structure: {
          files: Array.from({ length: 50 }, (_, i) => `file${i + 1}.md`),
          folders: {}
        }
      };

      const handleRequestSpy = vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureResponse);

      await tool.execute({ limit: 10, offset: 5 });

      // The tool always requests full mode from the structure handler, not pagination parameters
      expect(handleRequestSpy).toHaveBeenCalledWith('vault://structure?mode=full');
    });

    it('should handle case where offset exceeds available files', async () => {
      const mockStructureResponse = {
        structure: {
          files: Array.from({ length: 10 }, (_, i) => `file${i + 1}.md`),
          folders: {}
        }
      };

      vi.spyOn(defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(mockStructureResponse);

      const result = await tool.execute({ limit: 5, offset: 15 });
      const response = JSON.parse(result.text);

      expect(response.files).toEqual([]);
      expect(response.totalCount).toBe(10);
      expect(response.hasMore).toBe(false);
      expect(response.nextOffset).toBeUndefined();
    });
  });
});