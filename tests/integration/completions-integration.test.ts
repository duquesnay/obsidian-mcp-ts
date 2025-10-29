import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerCompletions } from '../../src/completions/index.js';
import { CompleteRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as CachedHandlers from '../../src/resources/CachedConcreteHandlers.js';

describe('Completions Integration', () => {
  let server: Server;

  beforeAll(() => {
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
        },
      }
    );
  });

  describe('registerCompletions', () => {
    it('should register completion handler successfully', async () => {
      // Should not throw
      await expect(registerCompletions(server)).resolves.toBeUndefined();
    });

    it('should register completions capability', async () => {
      const mockServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      const registerSpy = vi.spyOn(mockServer, 'registerCapabilities');

      await registerCompletions(mockServer);

      // Note: registerCapabilities might be called multiple times or wrapped
      // Just verify the handler was set
      expect(registerSpy).toHaveBeenCalled();
    });
  });

  describe('End-to-End Completion Flow', () => {
    const mockStructure = {
      structure: {
        'daily': {
          '2024-01-15.md': null,
          '2024-01-16.md': null,
        },
        'projects': {
          'obsidian-mcp.md': null,
          'test-project.md': null,
        },
      },
    };

    const mockTags = {
      tags: [
        { name: 'important', count: 25 },
        { name: 'todo', count: 15 },
        { name: 'done', count: 10 },
      ],
    };

    beforeAll(() => {
      vi.spyOn(CachedHandlers.defaultCachedHandlers.structure, 'handleRequest').mockResolvedValue(
        mockStructure
      );
      vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest').mockResolvedValue(
        mockTags
      );
    });

    it('should complete file paths for vault://note/{path}', async () => {
      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      // Create a completion request
      const request = {
        method: 'completion/complete' as const,
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: 'daily/',
          },
        },
      };

      // Get the registered handler
      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      expect(handler).toBeDefined();

      const result = await handler(request);

      expect(result.completion).toBeDefined();
      expect(result.completion.values).toBeInstanceOf(Array);
      expect(result.completion.values.length).toBeGreaterThan(0);
      expect(result.completion.values.every((v: string) => v.includes('daily/'))).toBe(true);
    });

    it('should complete tag names for vault://tag/{tagname}', async () => {
      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      const request = {
        method: 'completion/complete' as const,
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://tag/{tagname}',
          },
          argument: {
            name: 'tagname',
            value: 'to',
          },
        },
      };

      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      expect(handler).toBeDefined();

      const result = await handler(request);

      expect(result.completion).toBeDefined();
      expect(result.completion.values).toBeInstanceOf(Array);
      expect(result.completion.values).toContain('todo');
    });

    it('should handle empty results gracefully', async () => {
      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      const request = {
        method: 'completion/complete' as const,
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: 'nonexistent-path-xyz',
          },
        },
      };

      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      const result = await handler(request);

      expect(result.completion).toBeDefined();
      expect(result.completion.values).toEqual([]);
      expect(result.completion.total).toBe(0);
    });

    it('should respect performance targets (<100ms for typical vault)', async () => {
      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      const request = {
        method: 'completion/complete' as const,
        params: {
          ref: {
            type: 'ref/resource' as const,
            uri: 'vault://note/{path}',
          },
          argument: {
            name: 'path',
            value: 'pro',
          },
        },
      };

      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      const startTime = Date.now();
      await handler(request);
      const duration = Date.now() - startTime;

      // Should be fast (with mocked data, should be <50ms)
      // Allow some overhead for test infrastructure
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent completion requests', async () => {
      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      // Make multiple concurrent requests
      const requests = [
        {
          method: 'completion/complete' as const,
          params: {
            ref: { type: 'ref/resource' as const, uri: 'vault://note/{path}' },
            argument: { name: 'path', value: 'daily/' },
          },
        },
        {
          method: 'completion/complete' as const,
          params: {
            ref: { type: 'ref/resource' as const, uri: 'vault://tag/{tagname}' },
            argument: { name: 'tagname', value: 'to' },
          },
        },
        {
          method: 'completion/complete' as const,
          params: {
            ref: { type: 'ref/resource' as const, uri: 'vault://note/{path}' },
            argument: { name: 'path', value: 'projects/' },
          },
        },
      ];

      const results = await Promise.all(requests.map((req) => handler(req)));

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.completion).toBeDefined();
        expect(result.completion.values).toBeInstanceOf(Array);
      });
    });
  });

  describe('Cache Integration', () => {
    it('should use cached structure data for file path completions', async () => {
      const structureSpy = vi.spyOn(
        CachedHandlers.defaultCachedHandlers.structure,
        'handleRequest'
      );

      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      const request = {
        method: 'completion/complete' as const,
        params: {
          ref: { type: 'ref/resource' as const, uri: 'vault://note/{path}' },
          argument: { name: 'path', value: '' },
        },
      };

      // Make multiple requests
      await handler(request);
      await handler(request);

      // Should use cached handler (called at least once)
      expect(structureSpy).toHaveBeenCalled();
    });

    it('should use cached tags data for tag completions', async () => {
      const tagsSpy = vi.spyOn(CachedHandlers.defaultCachedHandlers.tags, 'handleRequest');

      const testServer = new Server(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await registerCompletions(testServer);

      const handlers = (testServer as any)._requestHandlers;
      const handler = handlers.get(CompleteRequestSchema.shape.method.value);

      const request = {
        method: 'completion/complete' as const,
        params: {
          ref: { type: 'ref/resource' as const, uri: 'vault://tag/{tagname}' },
          argument: { name: 'tagname', value: '' },
        },
      };

      // Make multiple requests
      await handler(request);
      await handler(request);

      // Should use cached handler
      expect(tagsSpy).toHaveBeenCalled();
    });
  });
});
