import { describe, it, expect, vi } from 'vitest';
import { VaultStructureHandler } from '../../../src/resources/VaultStructureHandler.js';

describe('VaultStructureHandler', () => {
  describe('handleRequest', () => {
    it('should return hierarchical structure for vault', async () => {
      // Mock ObsidianClient methods
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'file1.md',
        'file2.txt',
        'Projects/project1.md',
        'Projects/project2.md',
        'Projects/SubProject/task.md',
        'Archive/old.md',
        'Archive/2023/old-year.md'
      ]);
      
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      expect(mockListFilesInVault).toHaveBeenCalled();
      expect(result.contents[0].mimeType).toBe('application/json');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('structure');
      expect(data).toHaveProperty('totalFiles');
      expect(data).toHaveProperty('totalFolders');
      
      // Should have hierarchical structure
      expect(data.structure).toHaveProperty('files');
      expect(data.structure).toHaveProperty('folders');
      
      // Root level files
      expect(data.structure.files).toContain('file1.md');
      expect(data.structure.files).toContain('file2.txt');
      
      // Folders should be nested
      expect(data.structure.folders).toHaveProperty('Projects');
      expect(data.structure.folders.Projects.files).toContain('project1.md');
      expect(data.structure.folders.Projects.files).toContain('project2.md');
      expect(data.structure.folders.Projects.folders).toHaveProperty('SubProject');
      expect(data.structure.folders.Projects.folders.SubProject.files).toContain('task.md');
      
      expect(data.structure.folders).toHaveProperty('Archive');
      expect(data.structure.folders.Archive.files).toContain('old.md');
      expect(data.structure.folders.Archive.folders).toHaveProperty('2023');
      expect(data.structure.folders.Archive.folders['2023'].files).toContain('old-year.md');
      
      // Counts should be correct
      expect(data.totalFiles).toBe(7);
      expect(data.totalFolders).toBe(4); // Projects, SubProject, Archive, 2023
    });
    
    it('should handle empty vault', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([]);
      
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.structure.files).toEqual([]);
      expect(data.structure.folders).toEqual({});
      expect(data.totalFiles).toBe(0);
      expect(data.totalFolders).toBe(0);
    });
    
    it('should handle vault with only root files', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'README.md',
        'notes.txt',
        'ideas.md'
      ]);
      
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.structure.files).toEqual(['README.md', 'notes.txt', 'ideas.md']);
      expect(data.structure.folders).toEqual({});
      expect(data.totalFiles).toBe(3);
      expect(data.totalFolders).toBe(0);
    });
    
    it('should handle deeply nested folders', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'A/B/C/D/deep.md',
        'A/B/mid.md',
        'A/shallow.md'
      ]);
      
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      const data = JSON.parse(result.contents[0].text);
      
      // Check nested structure
      expect(data.structure.folders.A.files).toContain('shallow.md');
      expect(data.structure.folders.A.folders.B.files).toContain('mid.md');
      expect(data.structure.folders.A.folders.B.folders.C.folders.D.files).toContain('deep.md');
      
      expect(data.totalFiles).toBe(3);
      expect(data.totalFolders).toBe(4); // A, B, C, D
    });
    
    it('should handle API errors gracefully', async () => {
      const mockListFilesInVault = vi.fn().mockRejectedValue(new Error('API Error'));
      
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new VaultStructureHandler();
      
      await expect(handler.execute('vault://structure?mode=full', server))
        .rejects.toThrow('API Error');
    });
    
    it('should handle files with special characters in paths', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'folder with spaces/file with spaces.md',
        'folder-with-dashes/file_with_underscores.md',
        'folder.with.dots/file.with.dots.md'
      ]);
      
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.structure.folders).toHaveProperty('folder with spaces');
      expect(data.structure.folders).toHaveProperty('folder-with-dashes');
      expect(data.structure.folders).toHaveProperty('folder.with.dots');
      
      expect(data.structure.folders['folder with spaces'].files).toContain('file with spaces.md');
      expect(data.structure.folders['folder-with-dashes'].files).toContain('file_with_underscores.md');
      expect(data.structure.folders['folder.with.dots'].files).toContain('file.with.dots.md');
    });
  });

  describe('response modes', () => {
    const mockFiles = [
      'file1.md',
      'file2.txt',
      'Projects/project1.md',
      'Projects/project2.md',
      'Projects/SubProject/task.md',
      'Archive/old.md',
      'Archive/2023/old-year.md'
    ];

    const createMockServer = () => ({
      obsidianClient: {
        listFilesInVault: vi.fn().mockResolvedValue(mockFiles)
      }
    });

    it('should default to summary mode', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('summary');
      expect(data.totalFiles).toBe(7);
      expect(data.totalFolders).toBe(4);
      expect(data.message).toContain('Use ?mode=full for complete structure');
      
      // Should return summary structure (minimal folder/file info)
      expect(data.structure.files).toHaveLength(0);
      expect(data.structure.folders).toHaveProperty('...');
    });

    it('should support ?mode=summary explicitly', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=summary', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('summary');
      expect(data.totalFiles).toBe(7);
      expect(data.totalFolders).toBe(4);
      expect(data.message).toContain('Use ?mode=full for complete structure');
    });

    it('should support ?mode=preview with basic metadata', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=preview', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('preview');
      expect(data.totalFiles).toBe(7);
      expect(data.totalFolders).toBe(4);
      
      // Should include folder names but limited file info
      expect(data.structure.folders).toHaveProperty('Projects');
      expect(data.structure.folders).toHaveProperty('Archive');
      expect(data.structure.folders.Projects).toHaveProperty('fileCount');
      expect(data.structure.folders.Projects).toHaveProperty('folders');
      expect(data.structure.folders.Projects.folders.SubProject).toHaveProperty('fileCount');
    });

    it('should support ?mode=full with complete structure', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('full');
      expect(data.totalFiles).toBe(7);
      expect(data.totalFolders).toBe(4);
      
      // Should have complete hierarchical structure with all files
      expect(data.structure.files).toContain('file1.md');
      expect(data.structure.files).toContain('file2.txt');
      expect(data.structure.folders.Projects.files).toContain('project1.md');
      expect(data.structure.folders.Projects.files).toContain('project2.md');
      expect(data.structure.folders.Projects.folders.SubProject.files).toContain('task.md');
    });

    it('should handle invalid mode parameter', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=invalid', server);
      
      const data = JSON.parse(result.contents[0].text);
      // Should default to summary mode for invalid parameters
      expect(data.mode).toBe('summary');
    });

    it('should handle large vault threshold in summary mode', async () => {
      // Create a large file list that exceeds the threshold
      const largeFileList = Array.from({ length: 6000 }, (_, i) => `file${i}.md`);
      
      const server = {
        obsidianClient: {
          listFilesInVault: vi.fn().mockResolvedValue(largeFileList)
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=full', server);
      
      const data = JSON.parse(result.contents[0].text);
      // Should force summary mode for large vaults even when full mode requested
      expect(data.mode).toBe('summary');
      expect(data.totalFiles).toBe(6000);
      expect(data.message).toContain('6000 files');
    });
  });

  describe('pagination', () => {
    const mockFiles = Array.from({ length: 100 }, (_, i) => `file${i}.md`);

    const createMockServer = () => ({
      obsidianClient: {
        listFilesInVault: vi.fn().mockResolvedValue(mockFiles)
      }
    });

    it('should support pagination with limit and offset parameters', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?limit=10&offset=5', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('paginatedFiles');
      expect(data).toHaveProperty('totalFiles', 100);
      expect(data).toHaveProperty('hasMore');
      expect(data).toHaveProperty('limit', 10);
      expect(data).toHaveProperty('offset', 5);
      expect(data.paginatedFiles).toHaveLength(10);
      expect(data.paginatedFiles[0]).toBe('file5.md');
      expect(data.paginatedFiles[9]).toBe('file14.md');
      expect(data.hasMore).toBe(true);
    });

    it('should default to limit=50 when no limit specified', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('limit', 50);
      expect(data).toHaveProperty('offset', 0);
      expect(data.paginatedFiles).toHaveLength(50);
    });

    it('should handle offset beyond total files', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?offset=150', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.paginatedFiles).toHaveLength(0);
      expect(data.hasMore).toBe(false);
      expect(data.totalFiles).toBe(100);
    });

    it('should include nextUri when there are more results', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?limit=20&offset=10', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('nextUri', 'vault://structure?limit=20&offset=30');
      expect(data.hasMore).toBe(true);
    });

    it('should not include nextUri when there are no more results', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?limit=20&offset=90', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.nextUri).toBeUndefined();
      expect(data.hasMore).toBe(false);
      expect(data.paginatedFiles).toHaveLength(10); // Only 10 files left from offset 90
    });

    it('should support legacy mode with unlimited results', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?legacy=true', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).not.toHaveProperty('paginatedFiles');
      expect(data).not.toHaveProperty('hasMore');
      expect(data).not.toHaveProperty('nextUri');
      expect(data).toHaveProperty('structure'); // Should have full structure
      expect(data.totalFiles).toBe(100);
    });

    it('should work with folders and nested files in pagination', async () => {
      const mockNestedFiles = [
        'file1.md',
        'folder1/file2.md',
        'folder1/subfolder1/file3.md',
        'folder2/file4.md',
        'file5.md'
      ];
      
      const server = {
        obsidianClient: {
          listFilesInVault: vi.fn().mockResolvedValue(mockNestedFiles)
        }
      };
      
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?limit=3&offset=1', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.paginatedFiles).toEqual([
        'folder1/file2.md',
        'folder1/subfolder1/file3.md',
        'folder2/file4.md'
      ]);
      expect(data.totalFiles).toBe(5);
      expect(data.hasMore).toBe(true);
    });

    it('should preserve other query parameters with pagination', async () => {
      const server = createMockServer();
      const handler = new VaultStructureHandler();
      const result = await handler.execute('vault://structure?mode=preview&limit=10&offset=5', server);
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('preview');
      expect(data).toHaveProperty('paginatedFiles');
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(5);
    });
  });
});