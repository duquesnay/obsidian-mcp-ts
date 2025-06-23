import { BaseTool } from './base.js';

export class BatchGetFileContentsTool extends BaseTool {
  name = 'obsidian_batch_get_file_contents';
  description = 'Return the contents of multiple files in your vault, concatenated with headers.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepaths: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of paths to get contents from (relative to vault root).'
      }
    },
    required: ['filepaths']
  };

  async execute(args: { filepaths: string[] }): Promise<any> {
    try {
      if (!args.filepaths || !Array.isArray(args.filepaths)) {
        throw new Error('filepaths argument must be an array');
      }
      
      const client = this.getClient();
      const content = await client.getBatchFileContents(args.filepaths);
      return this.formatResponse(content);
    } catch (error) {
      return this.handleError(error);
    }
  }
}