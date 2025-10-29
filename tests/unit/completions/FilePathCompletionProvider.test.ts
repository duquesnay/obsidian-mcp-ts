import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilePathCompletionProvider } from '../../../src/completions/providers/FilePathCompletionProvider.js';
import { CompletionReference, CompletionArgument } from '../../../src/completions/types.js';
import * as CachedHandlers from '../../../src/resources/CachedConcreteHandlers.js';

describe('FilePathCompletionProvider', () => {
  let provider: FilePathCompletionProvider;

  beforeEach(() => {
    provider = new FilePathCompletionProvider();
    vi.clearAllMocks();
  });

  describe('canComplete', () => {
    it('should handle vault://note/{path}', () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(true);
    });

    it('should handle vault://folder/{path}', () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://folder/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(true);
    });

    it('should reject non-path arguments', () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(false);
    });

    it('should reject non-resource references', () => {
      const ref: CompletionReference = {
        type: 'ref/prompt',
        name: 'test',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(false);
    });

    it('should reject non-vault URIs', () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(false);
    });
  });

  describe('getCompletions', () => {
    const mockStructure = {
      structure: {
        'daily': {
          '2024-01-15.md': null,
          '2024-01-16.md': null,
        },
        'projects': {
          'obsidian-mcp.md': null,
          'ledger-lens.md': null,
        },
        'notes': {
          'meeting-notes.md': null,
          'ideas.md': null,
        },
      },
    };

    beforeEach(() => {
      // Mock the cached handler
      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(
        mockStructure
      );
    });

    it('should return all files when no partial input', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toHaveLength(6);
      expect(results).toContain('daily/2024-01-15.md');
      expect(results).toContain('daily/2024-01-16.md');
      expect(results).toContain('projects/obsidian-mcp.md');
      expect(results).toContain('projects/ledger-lens.md');
      expect(results).toContain('notes/meeting-notes.md');
      expect(results).toContain('notes/ideas.md');
    });

    it('should filter by exact prefix match', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: 'daily/',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toHaveLength(2);
      expect(results[0]).toContain('daily/');
      expect(results[1]).toContain('daily/');
    });

    it('should filter by contains match (case-insensitive)', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: 'obsidian',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toMatch(/obsidian/i);
    });

    it('should support fuzzy matching', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: 'proj',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.includes('projects'))).toBe(true);
    });

    it('should limit results to 20', async () => {
      // Create structure with many files
      const largeStructure = {
        structure: {} as Record<string, null>,
      };

      for (let i = 0; i < 50; i++) {
        largeStructure.structure[`file${i}.md`] = null;
      }

      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(
        largeStructure
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockRejectedValue(
        new Error('API error')
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toEqual([]);
    });

    it('should handle timeout gracefully', async () => {
      // Mock a slow response (>500ms)
      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockStructure), 1000);
          })
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      // Should timeout and return empty
      expect(results).toEqual([]);
    });
  });

  describe('path extraction', () => {
    it('should extract nested file paths correctly', async () => {
      const nestedStructure = {
        structure: {
          'root.md': null,
          'folder1': {
            'file1.md': null,
            'folder2': {
              'file2.md': null,
              'folder3': {
                'file3.md': null,
              },
            },
          },
        },
      };

      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(
        nestedStructure
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://note/{path}',
      };
      const arg: CompletionArgument = {
        name: 'path',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toContain('root.md');
      expect(results).toContain('folder1/file1.md');
      expect(results).toContain('folder1/folder2/file2.md');
      expect(results).toContain('folder1/folder2/folder3/file3.md');
    });
  });
});
