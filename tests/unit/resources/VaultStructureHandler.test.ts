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
      const result = await handler.execute('vault://structure', server);
      
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
      const result = await handler.execute('vault://structure', server);
      
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
      const result = await handler.execute('vault://structure', server);
      
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
      const result = await handler.execute('vault://structure', server);
      
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
      
      await expect(handler.execute('vault://structure', server))
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
      const result = await handler.execute('vault://structure', server);
      
      const data = JSON.parse(result.contents[0].text);
      
      expect(data.structure.folders).toHaveProperty('folder with spaces');
      expect(data.structure.folders).toHaveProperty('folder-with-dashes');
      expect(data.structure.folders).toHaveProperty('folder.with.dots');
      
      expect(data.structure.folders['folder with spaces'].files).toContain('file with spaces.md');
      expect(data.structure.folders['folder-with-dashes'].files).toContain('file_with_underscores.md');
      expect(data.structure.folders['folder.with.dots'].files).toContain('file.with.dots.md');
    });
  });
});