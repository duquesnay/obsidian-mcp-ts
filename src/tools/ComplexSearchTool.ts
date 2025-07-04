import { BaseTool } from './base.js';

export class ComplexSearchTool extends BaseTool {
  name = 'obsidian_complex_search';
  description = 'Complex search for documents using a JsonLogic query.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'object',
        description: 'JsonLogic query object for complex searches.'
      }
    },
    required: ['query']
  };

  async execute(args: { query: any }): Promise<any> {
    try {
      if (!args.query) {
        throw new Error('query argument missing in arguments');
      }
      
      const client = this.getClient();
      const results = await client.complexSearch(args.query);
      return this.formatResponse(results);
    } catch (error) {
      return this.handleError(error);
    }
  }
}