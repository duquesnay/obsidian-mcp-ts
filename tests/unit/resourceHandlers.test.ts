import { describe, it, expect, vi } from 'vitest';
import { createTagsHandler, createStatsHandler, createRecentHandler, createNoteHandler, createFolderHandler } from '../../src/resources/handlers.js';

describe('Resource Handlers', () => {
  describe('createTagsHandler', () => {
    it('should return hardcoded tags data', async () => {
      const handler = createTagsHandler();
      const result = await handler('vault://tags');
      
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://tags',
        mimeType: 'application/json'
      });
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.mode).toBe('summary');
      expect(data).toHaveProperty('topTags');
      expect(Array.isArray(data.topTags)).toBe(true);
    });
  });
  
  describe('createStatsHandler', () => {
    it('should fetch real vault statistics', async () => {
      const mockListFilesInVault = vi.fn().mockResolvedValue([
        'file1.md', 'file2.md', 'file3.txt', 'folder/note.md'
      ]);
      const mockServer = {
        obsidianClient: {
          listFilesInVault: mockListFilesInVault
        }
      };
      
      const handler = createStatsHandler();
      const result = await handler('vault://stats', mockServer);
      
      expect(mockListFilesInVault).toHaveBeenCalled();
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://stats',
        mimeType: 'application/json'
      });
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('fileCount', 4);
      expect(data).toHaveProperty('noteCount', 3); // Only .md files
    });
  });
  
  describe('createRecentHandler', () => {
    it('should return recent notes with timestamps', async () => {
      const handler = createRecentHandler();
      const result = await handler('vault://recent');
      
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://recent',
        mimeType: 'application/json'
      });
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('notes');
      expect(data.notes).toHaveLength(20);
      
      data.notes.forEach((note: any) => {
        expect(note).toHaveProperty('path');
        expect(note).toHaveProperty('modifiedAt');
      });
    });
  });
  
  describe('createNoteHandler', () => {
    it('should fetch note content in preview mode by default', async () => {
      const mockGetFileContents = vi.fn().mockResolvedValue('# Test Note\n\nContent');
      const mockServer = {
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      const handler = createNoteHandler();
      const result = await handler('vault://note/Daily/2024-01-01.md', mockServer);
      
      expect(mockGetFileContents).toHaveBeenCalledWith('Daily/2024-01-01.md');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('vault://note/Daily/2024-01-01.md');
      expect(result.contents[0].mimeType).toBe('application/json');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toMatchObject({
        mode: 'preview',
        frontmatter: null,
        preview: '# Test Note\n\nContent',
        statistics: {
          wordCount: 4,
          characterCount: 20,
          headingCount: 1,
          headings: ['Test Note']
        }
      });
    });

    it('should return full content when mode=full is specified', async () => {
      const mockGetFileContents = vi.fn().mockResolvedValue('# Full Test Note\n\nComplete content');
      const mockServer = {
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      const handler = createNoteHandler();
      const result = await handler('vault://note/test.md?mode=full', mockServer);
      
      expect(mockGetFileContents).toHaveBeenCalledWith('test.md');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: 'vault://note/test.md?mode=full',
        mimeType: 'text/markdown',
        text: '# Full Test Note\n\nComplete content'
      });
    });
    
    it('should handle 404 errors for missing notes', async () => {
      const mockGetFileContents = vi.fn().mockRejectedValue({
        response: { status: 404 }
      });
      const mockServer = {
        obsidianClient: {
          getFileContents: mockGetFileContents
        }
      };
      
      const handler = createNoteHandler();
      await expect(handler('vault://note/Missing.md', mockServer))
        .rejects.toThrow('Note not found: Missing.md');
    });
  });
  
  describe('createFolderHandler', () => {
    it('should list folder contents using ObsidianClient', async () => {
      const mockListFilesInDir = vi.fn().mockResolvedValue(['Note1.md', 'Subfolder']);
      const mockServer = {
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      const handler = createFolderHandler();
      const result = await handler('vault://folder/Projects', mockServer);
      
      expect(mockListFilesInDir).toHaveBeenCalledWith('Projects');
      expect(result.contents).toHaveLength(1);
      
      const data = JSON.parse(result.contents[0].text);
      // New folder handler returns summary mode by default
      expect(data).toEqual({
        path: 'Projects',
        mode: 'summary',
        fileCount: 2,
        files: [],
        folders: [],
        message: 'Use ?mode=full for complete file listings'
      });
    });
    
    it('should handle root folder', async () => {
      const mockListFilesInDir = vi.fn().mockResolvedValue(['Projects', 'Archive']);
      const mockServer = {
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      const handler = createFolderHandler();
      
      // Test with trailing slash
      await handler('vault://folder/', mockServer);
      expect(mockListFilesInDir).toHaveBeenCalledWith('');
      
      // Test without trailing slash
      mockListFilesInDir.mockClear();
      await handler('vault://folder', mockServer);
      expect(mockListFilesInDir).toHaveBeenCalledWith('');
    });
    
    it('should handle 404 errors for missing folders', async () => {
      const mockListFilesInDir = vi.fn().mockRejectedValue({
        response: { status: 404 }
      });
      const mockServer = {
        obsidianClient: {
          listFilesInDir: mockListFilesInDir
        }
      };
      
      const handler = createFolderHandler();
      await expect(handler('vault://folder/NonExistent', mockServer))
        .rejects.toThrow('Folder not found: NonExistent');
    });
  });
});