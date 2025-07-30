import { describe, beforeEach, it, expect, vi } from 'vitest';
import { FolderHandler } from './concreteHandlers.js';
import { ListFilesInDirTool } from '../tools/ListFilesInDirTool.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';

// Mock the ObsidianClient
vi.mock('../obsidian/ObsidianClient.js');

/**
 * Integration tests for folder pagination workflow
 * Tests the complete flow from FolderHandler resource to ListFilesInDirTool
 */
describe('Folder Pagination Integration', () => {
  let folderHandler: FolderHandler;
  let mockClient: any;
  let manyFiles: string[];

  beforeEach(() => {
    folderHandler = new FolderHandler();
    mockClient = {
      listFilesInDir: vi.fn(),
    };

    // Mock the getObsidianClient method
    vi.spyOn(folderHandler as any, 'getObsidianClient').mockReturnValue(mockClient);

    // Generate 100 test files
    manyFiles = Array.from({ length: 100 }, (_, i) => `Documents/file${i + 1}.md`);
    mockClient.listFilesInDir.mockResolvedValue(manyFiles);
  });

  describe('End-to-End Pagination Workflow', () => {
    it('should provide paginated responses with proper navigation metadata', async () => {
      // Test first page
      const firstPage = await folderHandler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=0');
      expect(firstPage).toEqual({
        path: 'Documents',
        mode: 'full',
        items: manyFiles.slice(0, 10),
        pagination: {
          totalItems: 100,
          hasMore: true,
          limit: 10,
          offset: 0,
          nextOffset: 10
        }
      });

      // Test middle page
      const middlePage = await folderHandler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=50');
      expect(middlePage).toEqual({
        path: 'Documents',
        mode: 'full',
        items: manyFiles.slice(50, 60),
        pagination: {
          totalItems: 100,
          hasMore: true,
          limit: 10,
          offset: 50,
          nextOffset: 60
        }
      });

      // Test last page
      const lastPage = await folderHandler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=95');
      expect(lastPage).toEqual({
        path: 'Documents',
        mode: 'full',
        items: manyFiles.slice(95, 100),
        pagination: {
          totalItems: 100,
          hasMore: false,
          limit: 10,
          offset: 95,
          nextOffset: undefined
        }
      });
    });

    it('should handle mixed mode responses correctly', async () => {
      // Summary mode without pagination - should not return file listings
      const summaryResponse = await folderHandler.handleRequest('vault://folder/Documents?mode=summary');
      expect(summaryResponse.mode).toBe('summary');
      if (summaryResponse.mode === 'summary') {
        expect(summaryResponse.files).toEqual([]);
        expect(summaryResponse.fileCount).toBe(100);
        expect(summaryResponse.pagination).toBeUndefined();
      }

      // Summary mode with pagination - should return file listings
      const paginatedSummary = await folderHandler.handleRequest('vault://folder/Documents?mode=summary&limit=5&offset=0');
      expect(paginatedSummary.mode).toBe('summary');
      if (paginatedSummary.mode === 'summary') {
        expect(paginatedSummary.files).toEqual(manyFiles.slice(0, 5));
        expect(paginatedSummary.fileCount).toBe(100);
        expect(paginatedSummary.pagination).toEqual({
          totalItems: 100,
          hasMore: true,
          limit: 5,
          offset: 0,
          nextOffset: 5
        });
      }
    });

    it('should use default limit when not specified', async () => {
      const response = await folderHandler.handleRequest('vault://folder/Documents?mode=full&offset=10');
      expect(response).toEqual({
        path: 'Documents',
        mode: 'full',
        items: manyFiles.slice(10, 60), // Default limit is 50
        pagination: {
          totalItems: 100,
          hasMore: true,
          limit: 50,
          offset: 10,
          nextOffset: 60
        }
      });
    });

    it('should respect maximum limit constraints', async () => {
      const response = await folderHandler.handleRequest('vault://folder/Documents?mode=full&limit=10000&offset=0');
      // Should be limited to MAX_LIST_LIMIT (5000), but since we only have 100 files, should return all
      expect(response).toEqual({
        path: 'Documents',
        mode: 'full',
        items: manyFiles, // All 100 files
        pagination: {
          totalItems: 100,
          hasMore: false,
          limit: 5000, // Capped at MAX_LIST_LIMIT
          offset: 0,
          nextOffset: undefined
        }
      });
    });

    it('should handle edge cases properly', async () => {
      // Empty directory
      mockClient.listFilesInDir.mockResolvedValue([]);
      const emptyResponse = await folderHandler.handleRequest('vault://folder/Empty?mode=full&limit=10&offset=0');
      expect(emptyResponse).toEqual({
        path: 'Empty',
        mode: 'full',
        items: [],
        pagination: {
          totalItems: 0,
          hasMore: false,
          limit: 10,
          offset: 0,
          nextOffset: undefined
        }
      });

      // Offset beyond total items
      mockClient.listFilesInDir.mockResolvedValue(manyFiles);
      const beyondResponse = await folderHandler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=200');
      expect(beyondResponse).toEqual({
        path: 'Documents',
        mode: 'full',
        items: [],
        pagination: {
          totalItems: 100,
          hasMore: false,
          limit: 10,
          offset: 200,
          nextOffset: undefined
        }
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain non-paginated behavior when no pagination parameters provided', async () => {
      // Full mode without pagination should return all items
      const fullResponse = await folderHandler.handleRequest('vault://folder/Documents?mode=full');
      expect(fullResponse).toEqual({
        path: 'Documents',
        mode: 'full',
        items: manyFiles
      });
      expect(fullResponse.pagination).toBeUndefined();

      // Summary mode without pagination should return metadata only
      const summaryResponse = await folderHandler.handleRequest('vault://folder/Documents?mode=summary');
      expect(summaryResponse.mode).toBe('summary');
      if (summaryResponse.mode === 'summary') {
        expect(summaryResponse.files).toEqual([]);
        expect(summaryResponse.fileCount).toBe(100);
        expect(summaryResponse.pagination).toBeUndefined();
      }
    });
  });
});