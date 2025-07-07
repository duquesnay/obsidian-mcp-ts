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

  async execute(args: { query: string; contextLength?: number; limit?: number; offset?: number }): Promise<any> {
    try {
      if (!args.query) {
        throw new Error('query argument missing in arguments');
      }
      
      const limit = Math.min(args.limit || 50, 200);
      const offset = args.offset || 0;
      
      const client = this.getClient();
      const results = await client.search(args.query, args.contextLength || 100, limit, offset);
      return this.formatResponse(results);
    } catch (error) {
      return this.handleError(error);
    }
  }
}