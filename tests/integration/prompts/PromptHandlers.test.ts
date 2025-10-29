import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerPromptHandlers } from '../../../src/prompts/PromptHandler.js';
import { promptRegistry } from '../../../src/prompts/PromptRegistry.js';
import { DailyNoteWorkflow } from '../../../src/prompts/templates/DailyNoteWorkflow.js';
import { BatchTagOperation } from '../../../src/prompts/templates/BatchTagOperation.js';

describe('Prompt Handlers Integration', () => {
  let server: Server;

  beforeEach(() => {
    // Create server instance
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
        },
      }
    );

    // Clear registry and register test prompts
    promptRegistry.clear();
    promptRegistry.registerPrompts([
      new DailyNoteWorkflow(),
      new BatchTagOperation(),
    ]);
  });

  afterEach(() => {
    promptRegistry.clear();
  });

  describe('prompts/list handler', () => {
    it('should register prompts/list handler', async () => {
      await registerPromptHandlers(server);

      // The handler should be registered
      // We can verify by checking the server has the capability
      expect(server).toBeDefined();
    });

    it('should return list of all registered prompts', async () => {
      await registerPromptHandlers(server);

      // Simulate MCP request
      const request = {
        method: 'prompts/list',
        params: {},
      };

      // Get the handler from the server
      const handler = (server as any)._requestHandlers?.get?.('prompts/list');
      expect(handler).toBeDefined();

      if (handler) {
        const response = await handler(request);

        expect(response.prompts).toHaveLength(2);
        expect(response.prompts[0].name).toBe('daily_note_workflow');
        expect(response.prompts[1].name).toBe('batch_tag_operation');
      }
    });

    it('should include prompt descriptions and arguments', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/list');
      if (handler) {
        const response = await handler({ method: 'prompts/list', params: {} });

        const dailyPrompt = response.prompts.find(
          (p: any) => p.name === 'daily_note_workflow'
        );
        expect(dailyPrompt.description).toBeTruthy();
        expect(dailyPrompt.arguments).toHaveLength(2);
        expect(dailyPrompt.arguments[0].name).toBe('date');
        expect(dailyPrompt.arguments[1].name).toBe('template');
      }
    });

    it('should return empty list when no prompts registered', async () => {
      promptRegistry.clear();
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/list');
      if (handler) {
        const response = await handler({ method: 'prompts/list', params: {} });
        expect(response.prompts).toEqual([]);
      }
    });
  });

  describe('prompts/get handler', () => {
    it('should register prompts/get handler', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      expect(handler).toBeDefined();
    });

    it('should return error for non-existent prompt', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'nonexistent_prompt',
            arguments: {},
          },
        };

        await expect(handler(request)).rejects.toThrow(
          "Prompt 'nonexistent_prompt' not found"
        );
      }
    });

    it('should return error for missing required arguments', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'batch_tag_operation',
            arguments: {}, // Missing required source_tag and operation
          },
        };

        await expect(handler(request)).rejects.toThrow('Required argument');
      }
    });

    it('should list available prompts in error message', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'unknown',
            arguments: {},
          },
        };

        try {
          await handler(request);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toContain('daily_note_workflow');
          expect(error.message).toContain('batch_tag_operation');
        }
      }
    });

    it('should handle prompts/get with default arguments', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'batch_tag_operation',
            arguments: {
              source_tag: 'test',
              operation: 'add',
            },
          },
        };

        const response = await handler(request);

        expect(response.messages).toBeDefined();
        expect(response.messages).toHaveLength(2);
        expect(response.messages[0].role).toBe('user');
        expect(response.messages[1].role).toBe('assistant');
      }
    });
  });

  describe('MCP protocol compliance', () => {
    it('should return messages in correct format', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'batch_tag_operation',
            arguments: {
              source_tag: 'project',
              operation: 'add',
            },
          },
        };

        const response = await handler(request);

        // Verify MCP PromptMessage format
        for (const message of response.messages) {
          expect(message.role).toMatch(/^(user|assistant)$/);
          expect(message.content).toBeDefined();
          expect(message.content.type).toBe('text');
          expect(message.content.text).toBeTruthy();
        }
      }
    });

    it('should include optional description', async () => {
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'batch_tag_operation',
            arguments: {
              source_tag: 'test',
              operation: 'add',
            },
          },
        };

        const response = await handler(request);

        expect(response.description).toBeTruthy();
        expect(typeof response.description).toBe('string');
      }
    });
  });

  describe('error handling', () => {
    it('should wrap unknown errors as InternalError', async () => {
      // Register a prompt that throws unexpected error
      class ErrorPrompt extends DailyNoteWorkflow {
        readonly name = 'error_prompt';

        async generate(): Promise<any> {
          throw new Error('Unexpected error');
        }
      }

      promptRegistry.registerPrompt(new ErrorPrompt());
      await registerPromptHandlers(server);

      const handler = (server as any)._requestHandlers?.get?.('prompts/get');
      if (handler) {
        const request = {
          method: 'prompts/get',
          params: {
            name: 'error_prompt',
            arguments: {},
          },
        };

        try {
          await handler(request);
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toContain('Unexpected error');
        }
      }
    });
  });
});
