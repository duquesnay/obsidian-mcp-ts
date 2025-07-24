import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { SimpleSearchArgs } from './types/SimpleSearchArgs.js';

export class SimpleSearchTool extends BaseTool<SimpleSearchArgs> {
  name = 'obsidian_simple_search';
  description = 'Search text in Obsidian vault notes (vault-only - NOT filesystem search). Returns paginated results.';
  
  metadata: ToolMetadata = {
    category: 'search',
    keywords: ['search', 'find', 'query', 'text', 'content'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      contextLength: {
        type: 'integer',
        description: 'Number of characters to include around each match.',
        default: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results to return (default: 50, max: 200)',
        default: OBSIDIAN_DEFAULTS.DEFAULT_SEARCH_LIMIT,
        minimum: 1,
        maximum: OBSIDIAN_DEFAULTS.MAX_SEARCH_RESULTS
      },
      offset: {
        type: 'integer',
        description: 'Number of results to skip for pagination (default: 0)',
        default: 0,
        minimum: 0
      }
    },
    required: ['query']
  };

  async executeTyped(args: SimpleSearchArgs): Promise<ToolResponse> {
    try {
      // Enhanced input validation with recovery
      if (!args.query) {
        return this.handleSimplifiedError(
          new Error('Missing required parameters'),
          'Provide query parameter to specify what text to search for',
          {
            query: 'search text',
            limit: 50,
            contextLength: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
          }
        );
      }
      
      const limit = Math.min(args.limit || OBSIDIAN_DEFAULTS.DEFAULT_SEARCH_LIMIT, OBSIDIAN_DEFAULTS.MAX_SEARCH_RESULTS);
      const offset = args.offset || 0;
      
      const client = this.getClient();
      const results = await client.search(args.query, args.contextLength || OBSIDIAN_DEFAULTS.CONTEXT_LENGTH, limit, offset);
      return this.formatResponse(results);
    } catch (error: unknown) {
      // Use the new handleHttpError method with custom handlers
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status) {
        return this.handleHttpError(error, {
          500: 'Search service error. The Obsidian REST API may be experiencing issues'
        });
      }
      
      // Handle search-specific errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('index') || errorMessage.includes('search')) {
        return this.handleSimplifiedError(
          error,
          'Search service may be unavailable. Try browsing files directly or check Obsidian plugin status'
        );
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(error);
    }
  }
}