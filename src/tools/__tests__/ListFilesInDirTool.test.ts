import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ListFilesInDirTool } from '../ListFilesInDirTool.js';
import { defaultCachedHandlers } from '../../resources/CachedConcreteHandlers.js';

// Mock the cached handlers
vi.mock('../../resources/CachedConcreteHandlers.js', () => ({
  defaultCachedHandlers: {
    folder: {
      handleRequest: vi.fn()
    }
  }
}));

describe('ListFilesInDirTool', () => {
  let tool: ListFilesInDirTool;

  beforeEach(() => {
    tool = new ListFilesInDirTool();
    vi.clearAllMocks();
  });

  describe('Summary Mode Response Handling', () => {
    beforeEach(() => {
      // Mock summary mode response
      (defaultCachedHandlers.folder.handleRequest as any).mockResolvedValue({
        path: 'Documents',
        mode: 'summary',
        fileCount: 5,
        files: [],
        folders: ['Projects', 'Archive'],
        message: 'Use ?mode=full for complete file listings'
      });
    });

    it('should handle summary mode response from resource', async () => {
      const result = await tool.executeTyped({ dirpath: 'Documents' });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual({
        path: 'Documents',
        mode: 'summary',
        fileCount: 5,
        folders: ['Projects', 'Archive'],
        message: 'Use ?mode=full for complete file listings'
      });

      expect(defaultCachedHandlers.folder.handleRequest).toHaveBeenCalledWith('vault://folder/Documents');
    });

    it('should handle summary mode with pagination parameters', async () => {
      const result = await tool.executeTyped({ 
        dirpath: 'Documents',
        limit: 10,
        offset: 0
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual({
        path: 'Documents',
        mode: 'summary',
        fileCount: 5,
        folders: ['Projects', 'Archive'],
        message: 'Use ?mode=full for complete file listings',
        totalCount: 5,
        hasMore: false,
        limit: 10,
        offset: 0,
        nextOffset: undefined
      });
    });
  });

  describe('Full Mode Response Handling (Backward Compatibility)', () => {
    beforeEach(() => {
      // Mock full mode response (backward compatibility)
      (defaultCachedHandlers.folder.handleRequest as any).mockResolvedValue({
        path: 'Documents',
        mode: 'full',
        items: [
          'Documents/file1.md',
          'Documents/file2.md',
          'Documents/file3.md'
        ]
      });
    });

    it('should handle full mode response from resource', async () => {
      const result = await tool.executeTyped({ dirpath: 'Documents' });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual([
        'Documents/file1.md',
        'Documents/file2.md',
        'Documents/file3.md'
      ]);
    });

    it('should handle full mode with pagination', async () => {
      const result = await tool.executeTyped({
        dirpath: 'Documents',
        limit: 2,
        offset: 1
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual({
        files: [
          'Documents/file2.md',
          'Documents/file3.md'
        ],
        totalCount: 3,
        hasMore: false,
        limit: 2,
        offset: 1,
        nextOffset: undefined,
        message: 'Showing 2 of 3 files in Documents'
      });
    });
  });

  describe('Resource Pagination Integration', () => {
    it('should handle paginated response from resource in full mode', async () => {
      // Mock paginated response from FolderHandler
      (defaultCachedHandlers.folder.handleRequest as any).mockResolvedValue({
        path: 'Documents',
        mode: 'full',
        items: ['file1.md', 'file2.md'],
        pagination: {
          totalItems: 100,
          hasMore: true,
          limit: 2,
          offset: 0,
          nextOffset: 2
        }
      });

      const result = await tool.executeTyped({
        dirpath: 'Documents',
        limit: 2,
        offset: 0
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual({
        files: ['file1.md', 'file2.md'],
        totalCount: 100,
        hasMore: true,
        limit: 2,
        offset: 0,
        nextOffset: 2,
        message: 'Showing 2 of 100 files in Documents'
      });

      // Verify the tool passes pagination to the resource
      expect(defaultCachedHandlers.folder.handleRequest).toHaveBeenCalledWith('vault://folder/Documents?limit=2&offset=0&mode=full');
    });

    it('should handle paginated response from resource in summary mode', async () => {
      // Mock paginated response from FolderHandler
      (defaultCachedHandlers.folder.handleRequest as any).mockResolvedValue({
        path: 'Documents',
        mode: 'summary',
        fileCount: 100,
        files: ['file1.md', 'file2.md'],
        folders: ['subfolder'],
        message: 'Showing 2 of 100 files',
        pagination: {
          totalItems: 100,
          hasMore: true,
          limit: 2,
          offset: 0,
          nextOffset: 2
        }
      });

      const result = await tool.executeTyped({
        dirpath: 'Documents',
        limit: 2,
        offset: 0
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual({
        path: 'Documents',
        mode: 'summary',
        fileCount: 100,
        folders: ['subfolder'],
        files: ['file1.md', 'file2.md'],
        message: 'Showing 2 of 100 files',
        totalCount: 100,
        hasMore: true,
        limit: 2,
        offset: 0,
        nextOffset: 2
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directories in summary mode', async () => {
      (defaultCachedHandlers.folder.handleRequest as any).mockResolvedValue({
        path: 'EmptyDir',
        mode: 'summary',
        fileCount: 0,
        files: [],
        folders: [],
        message: 'Use ?mode=full for complete file listings'
      });

      const result = await tool.executeTyped({ dirpath: 'EmptyDir' });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data).toEqual({
        path: 'EmptyDir',
        mode: 'summary',
        fileCount: 0,
        folders: [],
        message: 'Use ?mode=full for complete file listings'
      });
    });

    it('should validate directory path', async () => {
      const result = await tool.executeTyped({ dirpath: '' });
      
      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});