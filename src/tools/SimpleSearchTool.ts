import { BaseTool } from './base.js';

export class SimpleSearchTool extends BaseTool {
  name = 'obsidian_simple_search';
  description = 'Simple search for documents matching a specified text query across all files in the vault. Returns paginated results to avoid token limits. Use offset to get more results.';
  
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
              contextLength: 100
            }
          }
        );
      }
      
      const limit = Math.min(args.limit || 50, 200);
      const offset = args.offset || 0;
      
      const client = this.getClient();
      const results = await client.search(args.query, args.contextLength || 100, limit, offset);
      return this.formatResponse(results);
    } catch (error: any) {
      // Enhanced error handling with HTTP status codes
      if (error.response?.status === 403) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Permission denied. Check your API key and ensure the Obsidian Local REST API plugin is running',
            workingAlternative: 'Verify your OBSIDIAN_API_KEY environment variable and plugin status',
            example: {
              query: args.query
            }
          }
        );
      }
      
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