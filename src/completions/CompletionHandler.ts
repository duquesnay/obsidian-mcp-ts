import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CompleteRequestSchema, CompleteResult } from '@modelcontextprotocol/sdk/types.js';
import { CompletionProvider, CompletionRequest } from './types.js';
import { FilePathCompletionProvider } from './providers/FilePathCompletionProvider.js';
import { TagCompletionProvider } from './providers/TagCompletionProvider.js';

/**
 * Maximum completion values to return (MCP spec limit: 100)
 */
const MAX_COMPLETION_VALUES = 100;

/**
 * Handles MCP completion requests by routing to appropriate providers
 *
 * Registered providers:
 * - FilePathCompletionProvider: vault://note/{path}, vault://folder/{path}
 * - TagCompletionProvider: vault://tag/{tagname}
 */
export class CompletionHandler {
  private providers: CompletionProvider[];

  constructor() {
    // Register completion providers
    this.providers = [
      new FilePathCompletionProvider(),
      new TagCompletionProvider(),
    ];
  }

  /**
   * Register completion handler with MCP server
   */
  register(server: Server): void {
    server.setRequestHandler(CompleteRequestSchema, async (request) => {
      return this.handleComplete(request.params as CompletionRequest);
    });

    // Register completion capability
    // Note: This might already be registered by resources/prompts
    // The SDK handles duplicate capability registration gracefully
    try {
      server.registerCapabilities({
        completions: {},
      });
    } catch (error) {
      // Capability already registered - this is fine
    }
  }

  /**
   * Handle completion request
   */
  private async handleComplete(request: CompletionRequest): Promise<CompleteResult> {
    try {
      // Find provider that can handle this request
      const provider = this.providers.find(p =>
        p.canComplete(request.ref, request.argument)
      );

      if (!provider) {
        // No provider found - return empty completions
        return {
          completion: {
            values: [],
            total: 0,
            hasMore: false,
          },
        };
      }

      // Get completions from provider
      const values = await provider.getCompletions(request.ref, request.argument);

      // Ensure we don't exceed MCP limit
      const limitedValues = values.slice(0, MAX_COMPLETION_VALUES);

      return {
        completion: {
          values: limitedValues,
          total: values.length,
          hasMore: values.length > MAX_COMPLETION_VALUES,
        },
      };
    } catch (error) {
      console.error('Completion error:', error);
      // Return empty completions on error
      return {
        completion: {
          values: [],
          total: 0,
          hasMore: false,
        },
      };
    }
  }
}
