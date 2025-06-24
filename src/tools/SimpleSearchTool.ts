import { BaseTool } from './base.js';

export class SimpleSearchTool extends BaseTool {
  name = 'obsidian_simple_search';
  description = 'Simple search for documents matching a specified text query across all files in the vault.';
  
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
      }
    },
    required: ['query']
  };

  async execute(args: { query: string; contextLength?: number }): Promise<any> {
    try {
      if (!args.query) {
        throw new Error('query argument missing in arguments');
      }
      
      const client = this.getClient();
      const results = await client.search(args.query, args.contextLength || 100);
      return this.formatResponse(results);
    } catch (error) {
      return this.handleError(error);
    }
  }
}