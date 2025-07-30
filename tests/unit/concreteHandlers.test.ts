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
      expect(data.mode).toBe('summary');
      expect(data).toHaveProperty('topTags');
      expect(data.topTags).toHaveLength(2);
      expect(data.topTags[0]).toEqual({ name: '#project', count: 10 });
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
      
      expect(mockGetRecentChanges).toHaveBeenCalledWith(undefined, 100);
      const data = JSON.parse(result.contents[0].text);
      expect(data.notes).toHaveLength(2);
      expect(data.notes[0]).toHaveProperty('path', 'recent1.md');
      expect(data.notes[0]).toHaveProperty('modifiedAt');
    });
  });
  
  describe('NoteHandler', () => {
    describe('Legacy behavior (backward compatibility)', () => {
      it('should fetch note content with mode=full for backward compatibility', async () => {
        const mockGetFileContents = vi.fn().mockResolvedValue('# My Note\n\nContent here');
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/test.md?mode=full', server);
        
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

    describe('Preview mode (default mode)', () => {
      it('should return preview mode by default with frontmatter + first 200 chars + statistics', async () => {
        const fullContent = `---
title: "My Note"
tags: [project, important]
created: 2023-01-01
---

# My Note

This is a long note with multiple paragraphs. This content should be truncated at 200 characters in preview mode. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 2

More content here that should not appear in preview mode.

### Subsection

Even more content that should be truncated.`;

        const mockGetFileContents = vi.fn().mockResolvedValue(fullContent);
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/test.md', server);
        
        expect(mockGetFileContents).toHaveBeenCalledWith('test.md');
        expect(result.contents[0].mimeType).toBe('application/json');
        
        const data = JSON.parse(result.contents[0].text);
        expect(data).toHaveProperty('mode', 'preview');
        expect(data).toHaveProperty('frontmatter');
        expect(data.frontmatter).toEqual({
          title: 'My Note',
          tags: ['project', 'important'],
          created: '2023-01-01'
        });
        expect(data).toHaveProperty('preview');
        expect(data.preview).toHaveLength(200);
        expect(data.preview).toBe('# My Note\n\nThis is a long note with multiple paragraphs. This content should be truncated at 200 characters in preview mode. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tem');
        expect(data).toHaveProperty('statistics');
        expect(data.statistics).toEqual({
          wordCount: 63,
          characterCount: 382,
          headingCount: 3,
          headings: ['My Note', 'Section 2', 'Subsection']
        });
      });

      it('should handle notes without frontmatter in preview mode', async () => {
        const contentWithoutFrontmatter = `# Simple Note

This is a simple note without frontmatter. It should still work in preview mode and show the first 200 characters along with statistics.

More content here.`;

        const mockGetFileContents = vi.fn().mockResolvedValue(contentWithoutFrontmatter);
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/simple.md', server);
        
        const data = JSON.parse(result.contents[0].text);
        expect(data.mode).toBe('preview');
        expect(data.frontmatter).toBeNull();
        expect(data.preview.length).toBeLessThanOrEqual(200);
        expect(data.statistics.wordCount).toBe(29);
        expect(data.statistics.headingCount).toBe(1);
      });

      it('should handle short notes (less than 200 chars) in preview mode', async () => {
        const shortContent = `---
title: "Short"
---

# Short Note

This is short.`;

        const mockGetFileContents = vi.fn().mockResolvedValue(shortContent);
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/short.md', server);
        
        const data = JSON.parse(result.contents[0].text);
        expect(data.mode).toBe('preview');
        expect(data.preview).toBe('# Short Note\n\nThis is short.');
        expect(data.preview.length).toBeLessThan(200);
      });
    });

    describe('Full mode', () => {
      it('should return complete content when mode=full is specified', async () => {
        const fullContent = `---
title: "Full Note"
---

# Complete Note

This is the complete content that should be returned in full mode without any truncation.

## All sections

All content should be preserved.`;

        const mockGetFileContents = vi.fn().mockResolvedValue(fullContent);
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/test.md?mode=full', server);
        
        expect(result.contents[0].mimeType).toBe('text/markdown');
        expect(result.contents[0].text).toBe(fullContent);
      });

      it('should handle notes without query parameters (legacy behavior)', async () => {
        const content = '# Legacy Note\n\nThis should work as before.';
        const mockGetFileContents = vi.fn().mockResolvedValue(content);
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/legacy.md', server);
        
        // Should default to preview mode now
        const data = JSON.parse(result.contents[0].text);
        expect(data.mode).toBe('preview');
      });
    });

    describe('Invalid mode parameter', () => {
      it('should default to preview mode for invalid mode parameter', async () => {
        const content = '# Test\n\nContent here.';
        const mockGetFileContents = vi.fn().mockResolvedValue(content);
        const server = {
          obsidianClient: {
            getFileContents: mockGetFileContents
          }
        };
        
        const handler = new NoteHandler();
        const result = await handler.execute('vault://note/test.md?mode=invalid', server);
        
        const data = JSON.parse(result.contents[0].text);
        expect(data.mode).toBe('preview');
      });
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
      // New folder handler returns summary mode by default
      expect(data).toEqual({
        path: 'test',
        mode: 'summary',
        fileCount: 2,
        files: [],
        folders: [],
        message: 'Use ?mode=full for complete file listings'
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
      const result = await handler.execute('vault://structure?mode=full', server);
      
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