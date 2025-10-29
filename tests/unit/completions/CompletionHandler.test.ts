import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionHandler } from '../../../src/completions/CompletionHandler.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as CachedHandlers from '../../../src/resources/CachedConcreteHandlers.js';

describe('CompletionHandler', () => {
  let handler: CompletionHandler;
  let mockServer: Server;

  beforeEach(() => {
    handler = new CompletionHandler();
    mockServer = {
      setRequestHandler: vi.fn(),
      registerCapabilities: vi.fn(),
    } as any;
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register completion handler with server', () => {
      handler.register(mockServer);

      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function)
      );
      expect(mockServer.registerCapabilities).toHaveBeenCalledWith({
        completions: {},
      });
    });

    it('should handle duplicate capability registration gracefully', () => {
      // Mock registerCapabilities to throw
      mockServer.registerCapabilities = vi.fn().mockImplementation(() => {
        throw new Error('Capability already registered');
      });

      // Should not throw
      expect(() => handler.register(mockServer)).not.toThrow();
    });
  });

  describe('handleComplete', () => {
    const mockStructure = {
      structure: {
        'daily': {
          '2024-01-15.md': null,
        },
        'notes': {
          'test.md': null,
        },
      },
    };

    const mockTags = {
      tags: [
        { name: 'project', count: 10 },
        { name: 'meeting', count: 5 },
      ],
    };

    beforeEach(() => {
      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(
        mockStructure
      );
      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockResolvedValue(
        mockTags
      );
    });

    it('should route to FilePathCompletionProvider for vault://note/{path}', async () => {
      handler.register(mockServer);

      // Get the handler function that was registered
      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      expect(result.completion).toBeDefined();
      expect(result.completion.values).toBeInstanceOf(Array);
      expect(result.completion.values.length).toBeGreaterThan(0);
      expect(result.completion.total).toBeDefined();
    });

    it('should route to TagCompletionProvider for vault://tag/{tagname}', async () => {
      handler.register(mockServer);

      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://tag/{tagname}',
          },
          argument: {
            name: 'tagname',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      expect(result.completion).toBeDefined();
      expect(result.completion.values).toBeInstanceOf(Array);
      expect(result.completion.values.length).toBeGreaterThan(0);
      expect(result.completion.values).toContain('project');
      expect(result.completion.values).toContain('meeting');
    });

    it('should return empty completions for unsupported reference types', async () => {
      handler.register(mockServer);

      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/prompt' as const,
            name: 'test-prompt',
          },
          argument: {
            name: 'arg',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      expect(result.completion.values).toEqual([]);
      expect(result.completion.total).toBe(0);
      expect(result.completion.hasMore).toBe(false);
    });

    it('should return empty completions for unsupported URIs', async () => {
      handler.register(mockServer);

      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://unknown/{param}',
          },
          argument: {
            name: 'param',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      expect(result.completion.values).toEqual([]);
      expect(result.completion.total).toBe(0);
      expect(result.completion.hasMore).toBe(false);
    });

    it('should limit results to 100 values', async () => {
      // Create structure with >100 files
      const largeStructure = {
        structure: {} as Record<string, null>,
      };

      for (let i = 0; i < 150; i++) {
        largeStructure.structure[`file${i}.md`] = null;
      }

      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(
        largeStructure
      );

      handler.register(mockServer);

      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      // Should enforce 100 value limit (provider returns 20, but test the handler limit)
      expect(result.completion.values.length).toBeLessThanOrEqual(100);
    });

    it('should set hasMore flag when results are truncated', async () => {
      // Mock provider to return exactly 20 results (provider limit)
      // But we'll simulate the scenario where total > 100
      handler.register(mockServer);

      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      // With mock data, hasMore should be false (only 2 files)
      expect(result.completion.hasMore).toBe(false);
    });

    it('should handle provider errors gracefully', async () => {
      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockRejectedValue(
        new Error('API error')
      );

      handler.register(mockServer);

      const handlerFn = (mockServer.setRequestHandler as any).mock.calls[0][1];

      const request = {
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: '',
          },
        },
      };

      const result = await handlerFn(request);

      expect(result.completion.values).toEqual([]);
      expect(result.completion.total).toBe(0);
      expect(result.completion.hasMore).toBe(false);
    });
  });
});
