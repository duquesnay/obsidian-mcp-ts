import { describe, it, expect, vi } from 'vitest';
import { TagsHandler, StatsHandler, RecentHandler, NoteHandler, FolderHandler } from '../../src/resources/concreteHandlers.js';

describe('Concrete Resource Handlers', () => {
  describe('TagsHandler', () => {
    it('should return hardcoded tags data', async () => {
      const handler = new TagsHandler();
      const result = await handler.execute('vault://tags');
      
      expect(result.contents[0].mimeType).toBe('application/json');
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('tags');
      expect(Array.isArray(data.tags)).toBe(true);
    });
  });
  
  describe('StatsHandler', () => {
    it('should return hardcoded stats data', async () => {
      const handler = new StatsHandler();
      const result = await handler.execute('vault://stats');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data).toEqual({
        fileCount: 42,
        noteCount: 35
      });
    });
  });
  
  describe('RecentHandler', () => {
    it('should return recent notes with timestamps', async () => {
      const handler = new RecentHandler();
      const result = await handler.execute('vault://recent');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.notes).toHaveLength(10);
      data.notes.forEach((note: any) => {
        expect(note).toHaveProperty('path');
        expect(note).toHaveProperty('modifiedAt');
      });
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
});