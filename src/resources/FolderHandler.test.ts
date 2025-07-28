import { describe, beforeEach, it, expect, vi } from 'vitest';
import { FolderHandler } from './concreteHandlers.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';

// Mock the ObsidianClient
vi.mock('../obsidian/ObsidianClient.js');

describe('FolderHandler', () => {
  let handler: FolderHandler;
  let mockClient: any;

  beforeEach(() => {
    handler = new FolderHandler();
    mockClient = {
      listFilesInDir: vi.fn(),
    };

    // Mock the getObsidianClient method
    vi.spyOn(handler as any, 'getObsidianClient').mockReturnValue(mockClient);
  });

  describe('Response Modes', () => {
    const mockFiles = [
      'Documents/file1.md',
      'Documents/file2.md', 
      'Documents/Subfolder/nested.md'
    ];

    beforeEach(() => {
      mockClient.listFilesInDir.mockResolvedValue(mockFiles);
    });

    describe('Summary Mode (Default)', () => {
      it('should return summary mode by default', async () => {
        const result = await handler.handleRequest('vault://folder/Documents');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'summary',
          fileCount: 2, // Only direct files: file1.md and file2.md
          files: [],
          folders: ['Subfolder'],
          message: 'Use ?mode=full for complete file listings'
        });
      });

      it('should return summary mode when explicitly requested', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=summary');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'summary',
          fileCount: 2, // Only direct files: file1.md and file2.md
          files: [],
          folders: ['Subfolder'],
          message: 'Use ?mode=full for complete file listings'
        });
      });

      it('should include only root-level files in file count for summary mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=summary');
        
        if (result.mode === 'summary') {
          expect(result.fileCount).toBe(2); // Only file1.md and file2.md, not nested.md
          expect(result.folders).toEqual(['Subfolder']);
        }
      });
    });

    describe('Full Mode', () => {
      it('should return full mode when requested', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'full',
          items: mockFiles
        });
      });

      it('should preserve backward compatibility with full mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full');
        
        if (result.mode === 'full') {
          expect(result.items).toEqual(mockFiles);
          expect(result.path).toBe('Documents');
        }
      });
    });

    describe('Invalid Mode Handling', () => {
      it('should default to summary mode for invalid mode parameter', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=invalid');
        
        expect(result.mode).toBe('summary');
        if (result.mode === 'summary') {
          expect(result.fileCount).toBeDefined();
          expect(result.files).toEqual([]);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directories in summary mode', async () => {
      mockClient.listFilesInDir.mockResolvedValue([]);

      const result = await handler.handleRequest('vault://folder/EmptyDir?mode=summary');
      
      expect(result).toEqual({
        path: 'EmptyDir',
        mode: 'summary',
        fileCount: 0,
        files: [],
        folders: [],
        message: 'Use ?mode=full for complete file listings'
      });
    });

    it('should handle root directory', async () => {
      const rootFiles = ['root1.md', 'root2.md', 'Folder/nested.md'];
      mockClient.listFilesInDir.mockResolvedValue(rootFiles);

      const result = await handler.handleRequest('vault://folder/?mode=summary');
      
      expect(result.path).toBe('');
      if (result.mode === 'summary') {
        expect(result.fileCount).toBe(2); // Only root-level files
        expect(result.folders).toEqual(['Folder']);
      }
    });
  });

  describe('Metadata Analysis', () => {
    it('should correctly separate files and folders in complex structure', async () => {
      const complexFiles = [
        'Projects/Project1/doc1.md',
        'Projects/Project1/doc2.md',
        'Projects/Project2/readme.md',
        'Projects/archive.md',
        'Projects/Templates/template1.md'
      ];
      mockClient.listFilesInDir.mockResolvedValue(complexFiles);

      const result = await handler.handleRequest('vault://folder/Projects?mode=summary');
      
      if (result.mode === 'summary') {
        expect(result.fileCount).toBe(1); // Only archive.md is at Projects level
        expect(result.folders).toEqual(['Project1', 'Project2', 'Templates']);
      }
    });
  });

  describe('Pagination Support', () => {
    const manyFiles = Array.from({ length: 100 }, (_, i) => `Documents/file${i + 1}.md`);

    beforeEach(() => {
      mockClient.listFilesInDir.mockResolvedValue(manyFiles);
    });

    describe('Full Mode Pagination', () => {
      it('should handle pagination parameters in full mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=0');
        
        expect(result).toEqual({
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
      });

      it('should handle pagination with offset in full mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=20');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'full',
          items: manyFiles.slice(20, 30),
          pagination: {
            totalItems: 100,
            hasMore: true,
            limit: 10,
            offset: 20,
            nextOffset: 30
          }
        });
      });

      it('should handle last page in full mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=95');
        
        expect(result).toEqual({
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

      it('should use default limit when not specified in full mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&offset=10');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'full',
          items: manyFiles.slice(10, 60), // Default limit should be 50
          pagination: {
            totalItems: 100,
            hasMore: true,
            limit: 50,
            offset: 10,
            nextOffset: 60
          }
        });
      });
    });

    describe('Summary Mode Pagination', () => {
      it('should handle pagination parameters in summary mode', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=summary&limit=10&offset=0');
        
        if (result.mode === 'summary') {
          expect(result).toEqual({
            path: 'Documents',
            mode: 'summary',
            fileCount: 100,
            files: manyFiles.slice(0, 10),
            folders: [],
            message: 'Showing 10 of 100 files',
            pagination: {
              totalItems: 100,
              hasMore: true,
              limit: 10,
              offset: 0,
              nextOffset: 10
            }
          });
        }
      });

      it('should return empty files array in summary mode when no pagination requested', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=summary');
        
        if (result.mode === 'summary') {
          expect(result.files).toEqual([]);
          expect(result.message).toBe('Use ?mode=full for complete file listings');
          expect(result.pagination).toBeUndefined();
        }
      });
    });

    describe('Pagination Edge Cases', () => {
      it('should handle limit larger than total items', async () => {
        const smallFiles = ['file1.md', 'file2.md'];
        mockClient.listFilesInDir.mockResolvedValue(smallFiles);
        
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&limit=50&offset=0');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'full',
          items: smallFiles,
          pagination: {
            totalItems: 2,
            hasMore: false,
            limit: 50,
            offset: 0,
            nextOffset: undefined
          }
        });
      });

      it('should handle offset beyond total items', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&limit=10&offset=150');
        
        expect(result).toEqual({
          path: 'Documents',
          mode: 'full',
          items: [],
          pagination: {
            totalItems: 100,
            hasMore: false,
            limit: 10,
            offset: 150,
            nextOffset: undefined
          }
        });
      });

      it('should validate maximum limit constraint', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=full&limit=10000&offset=0');
        
        // Should limit to MAX_LIST_LIMIT (5000)
        expect(result).toEqual({
          path: 'Documents',
          mode: 'full',
          items: manyFiles, // All 100 items since it's less than the limit
          pagination: {
            totalItems: 100,
            hasMore: false,
            limit: 5000, // Should be capped at MAX_LIST_LIMIT
            offset: 0,
            nextOffset: undefined
          }
        });
      });
    });
  });
});