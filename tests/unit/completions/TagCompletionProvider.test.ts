import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagCompletionProvider } from '../../../src/completions/providers/TagCompletionProvider.js';
import { CompletionReference, CompletionArgument } from '../../../src/completions/types.js';
import * as CachedHandlers from '../../../src/resources/CachedConcreteHandlers.js';

describe('TagCompletionProvider', () => {
  let provider: TagCompletionProvider;

  beforeEach(() => {
    provider = new TagCompletionProvider();
    vi.clearAllMocks();
  });

  describe('canComplete', () => {
    it('should handle vault://tag/{tagname}', () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(true);
    });

    it('should reject non-tagname arguments', () => {
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

    it('should reject non-resource references', () => {
      const ref: CompletionReference = {
        type: 'ref/prompt',
        name: 'test',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      expect(provider.canComplete(ref, arg)).toBe(false);
    });

    it('should reject non-tag URIs', () => {
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
  });

  describe('getCompletions', () => {
    const mockTags = {
      tags: [
        { name: 'project', count: 25 },
        { name: 'meeting', count: 15 },
        { name: 'idea', count: 10 },
        { name: 'todo', count: 30 },
        { name: 'done', count: 20 },
        { name: 'archive', count: 5 },
      ],
    };

    beforeEach(() => {
      // Mock the cached handler
      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockResolvedValue(
        mockTags
      );
    });

    it('should return all tags sorted by popularity when no partial input', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toHaveLength(6);
      // Most popular first
      expect(results[0]).toBe('todo'); // count: 30
      expect(results[1]).toBe('project'); // count: 25
      expect(results[2]).toBe('done'); // count: 20
    });

    it('should filter by prefix match (case-insensitive)', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: 'pro',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toHaveLength(1);
      expect(results[0]).toBe('project');
    });

    it('should filter by contains match', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: 'ee',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toBe('meeting'); // Exact match, more popular
    });

    it('should handle # prefix in input', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '#proj',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toHaveLength(1);
      expect(results[0]).toBe('project');
      // Result should NOT include # prefix
      expect(results[0]).not.toContain('#');
    });

    it('should prioritize prefix matches over contains matches', async () => {
      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: 'do',
      };

      const results = await provider.getCompletions(ref, arg);

      // 'done' starts with 'do' and should come before 'todo' (which only contains 'do')
      expect(results[0]).toBe('done');
    });

    it('should sort by popularity within same match type', async () => {
      const samePrefixTags = {
        tags: [
          { name: 'test1', count: 5 },
          { name: 'test2', count: 15 },
          { name: 'test3', count: 10 },
        ],
      };

      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockResolvedValue(
        samePrefixTags
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: 'test',
      };

      const results = await provider.getCompletions(ref, arg);

      // All match the prefix, should be sorted by popularity
      expect(results[0]).toBe('test2'); // count: 15
      expect(results[1]).toBe('test3'); // count: 10
      expect(results[2]).toBe('test1'); // count: 5
    });

    it('should limit results to 20', async () => {
      const manyTags = {
        tags: Array.from({ length: 50 }, (_, i) => ({
          name: `tag${i}`,
          count: i,
        })),
      };

      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockResolvedValue(
        manyTags
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockRejectedValue(
        new Error('API error')
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toEqual([]);
    });

    it('should handle timeout gracefully', async () => {
      // Mock a slow response (>500ms)
      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockTags), 1000);
          })
      );

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      // Should timeout and return empty
      expect(results).toEqual([]);
    });

    it('should handle empty tags array', async () => {
      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockResolvedValue({
        tags: [],
      });

      const ref: CompletionReference = {
        type: 'ref/resource',
        uri: 'vault://tag/{tagname}',
      };
      const arg: CompletionArgument = {
        name: 'tagname',
        value: '',
      };

      const results = await provider.getCompletions(ref, arg);

      expect(results).toEqual([]);
    });
  });
});
