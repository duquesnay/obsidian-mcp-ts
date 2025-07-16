import { BaseTool } from './base.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

export class SimpleSearchTool extends BaseTool {
  name = 'obsidian_simple_search';
  description = 'Search text in Obsidian vault notes (vault-only - NOT filesystem search). Returns paginated results.';
  
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
        default: 100
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results to return (default: 50, max: 200)',
        default: 50,
        minimum: 1,
        maximum: 200
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

  async executeTyped(args: { query: string; contextLength?: number; limit?: number; offset?: number }): Promise<any> {
    try {
      // Enhanced input validation with recovery
      if (!args.query) {
        return this.handleErrorWithRecovery(
          new Error('Missing required parameters'),
          {
            suggestion: 'Provide query parameter to specify what text to search for',
            workingAlternative: 'Use obsidian_list_files_in_vault to browse files if you\'re looking for a specific file',
            example: {
              query: 'search text',
              limit: 50,
              contextLength: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
            }
          }
        );
      }
      
      const limit = Math.min(args.limit || 50, 200);
      const offset = args.offset || 0;
      
      const client = this.getClient();
      const results = await client.search(args.query, args.contextLength || OBSIDIAN_DEFAULTS.CONTEXT_LENGTH, limit, offset);
      return this.formatResponse(results);
    } catch (error: any) {
      // Use centralized error handler for common HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }
      
      // Handle search-specific errors
      if (error.message?.includes('index') || error.message?.includes('search')) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Search service may be unavailable. Try browsing files directly or check Obsidian plugin status',
            workingAlternative: 'Use obsidian_list_files_in_vault to browse files by name instead',
            example: {
              query: args.query
            }
          }
        );
      }
      
      // Fallback to basic error handling with alternatives
      return this.handleError(error, [
        {
          description: 'Browse files in your vault',
          tool: 'obsidian_list_files_in_vault'
        },
        {
          description: 'Get specific file content',
          tool: 'obsidian_get_file_contents',
          example: { filepath: 'filename.md' }
        }
      ]);
    }
  }
}