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
        
        expect(result.fileCount).toBe(2); // Only file1.md and file2.md, not nested.md
        expect(result.folders).toEqual(['Subfolder']);
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
        
        expect(result.items).toEqual(mockFiles);
        expect(result.path).toBe('Documents');
      });
    });

    describe('Invalid Mode Handling', () => {
      it('should default to summary mode for invalid mode parameter', async () => {
        const result = await handler.handleRequest('vault://folder/Documents?mode=invalid');
        
        expect(result.mode).toBe('summary');
        expect(result.fileCount).toBeDefined();
        expect(result.files).toEqual([]);
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
      expect(result.fileCount).toBe(2); // Only root-level files
      expect(result.folders).toEqual(['Folder']);
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
      
      expect(result.fileCount).toBe(1); // Only archive.md is at Projects level
      expect(result.folders).toEqual(['Project1', 'Project2', 'Templates']);
    });
  });
});