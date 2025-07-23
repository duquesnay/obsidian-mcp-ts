import { describe, it, expect, vi } from 'vitest';
import { TagsHandler, StatsHandler, RecentHandler, NoteHandler, FolderHandler } from '../../src/resources/concreteHandlers.js';
import { VaultStructureHandler } from '../../src/resources/VaultStructureHandler.js';

describe('Concrete Resource Handlers', () => {
  describe('TagsHandler', () => {
    it('should fetch real tags data from Obsidian API', async () => {
      const mockGetAllTags = vi.fn().mockResolvedValue([
        { name: '#project', count: 10 },
        { name: '#meeting', count: 5 }
      ]);
      const server = {
        obsidianClient: {
          getAllTags: mockGetAllTags
        }
      };
      
      const handler = new TagsHandler();
      const result = await handler.execute('vault://tags', server);
      
      expect(mockGetAllTags).toHaveBeenCalled();
      expect(result.contents[0].mimeType).toBe('application/json');
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('tags');
      expect(data.tags).toHaveLength(2);
      expect(data.tags[0]).toEqual({ name: '#project', count: 10 });
    });
  });
  
  describe('StatsHandler', () => {
    it('should fetch real vault statistics from Obsidian API', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'file1.md', 'file2.md', 'file3.txt', 'folder/note.md'
      ]);
      const server = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = new StatsHandler();
      const result = await handler.execute('vault://stats', server);
      
      expect(mockListFilesInVault).toHaveBeenCalled();
      const data = JSON.parse(result.contents[0].text);
      expect(data).toEqual({
        fileCount: 4,
        noteCount: 3 // Only .md files
      });
    });
  });
  
  describe('RecentHandler', () => {
    it('should fetch recent changes from Obsidian API', async () => {
      const mockGetRecentChanges = vi.fn().mockResolvedValue([
        { path: 'recent1.md', mtime: 1640995200000 }, // Jan 1, 2022
        { path: 'recent2.md', mtime: 1640995100000 }  // Jan 1, 2022
      ]);
      const server = {
        obsidianClient: {
          getRecentChanges: mockGetRecentChanges
        }
      };
      
      const handler = new RecentHandler();
      const result = await handler.execute('vault://recent', server);
      
      expect(mockGetRecentChanges).toHaveBeenCalledWith(undefined, 10);
      const data = JSON.parse(result.contents[0].text);
      expect(data.notes).toHaveLength(2);
      expect(data.notes[0]).toHaveProperty('path', 'recent1.md');
      expect(data.notes[0]).toHaveProperty('modifiedAt');
    });
  });
  
  describe('NoteHandler', () => {
    it('should fetch note content', async () => {
      const mockGetFileContents = vi.fn().mockResolvedValue('# My Note\n\nContent here');
      const server = {
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      const handler = new NoteHandler();
      const result = await handler.execute('vault://note/test.md', server);
      
      expect(mockGetFileContents).toHaveBeenCalledWith('test.md');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toBe('# My Note\n\nContent here');
    });
    
    it('should handle missing notes', async () => {
      const mockGetFileContents = vi.fn().mockRejectedValue({
        response: { status: 404 }
      });
      const server = {
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      const handler = new NoteHandler();
      await expect(handler.execute('vault://note/missing.md', server))
        .rejects.toThrow('Note not found: missing.md');
    });
  });
  
  describe('FolderHandler', () => {
    it('should list folder contents', async () => {
      const mockListFilesInDir = vi.fn().mockResolvedValue(['file1.md', 'file2.md']);
      const server = {
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      const handler = new FolderHandler();
      const result = await handler.execute('vault://folder/test', server);
      
      expect(mockListFilesInDir).toHaveBeenCalledWith('test');
      const data = JSON.parse(result.contents[0].text);
      expect(data).toEqual({
        path: 'test',
        items: ['file1.md', 'file2.md']
      });
    });
    
    it('should handle root folder', async () => {
      const mockListFilesInDir = vi.fn().mockResolvedValue(['Projects', 'Archive']);
      const server = {
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      const handler = new FolderHandler();
      await handler.execute('vault://folder', server);
      expect(mockListFilesInDir).toHaveBeenCalledWith('');
    });
  });
  
  describe('VaultStructureHandler', () => {
    it('should fetch vault structure from Obsidian API', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'file1.md',
        'Projects/project1.md',
        'Archive/old.md'
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
      expect(data).toHaveProperty('totalFiles', 3);
      expect(data).toHaveProperty('totalFolders', 2); // Projects, Archive
      expect(data.structure.files).toContain('file1.md');
      expect(data.structure.folders).toHaveProperty('Projects');
      expect(data.structure.folders).toHaveProperty('Archive');
    });
  });
});