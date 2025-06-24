import { BaseTool } from './base.js';

export class AppendContentTool extends BaseTool {
  name = 'obsidian_append_content';
  description = 'Append content to a new or existing file in the vault. A newline is automatically added before the appended content if the file exists and has content.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path of the file to append to (relative to vault root). Will be created if it doesn\'t exist.'
      },
      content: {
        type: 'string',
        description: 'The content to append to the file.'
      },
      createIfNotExists: {
        type: 'boolean',
        description: 'Create the file if it doesn\'t exist.',
        default: true
      }
    },
    required: ['filepath', 'content']
  };

  async execute(args: {
    filepath: string;
    content: string;
    createIfNotExists?: boolean;
  }): Promise<any> {
    try {
      if (!args.filepath) {
        throw new Error('filepath argument missing in arguments');
      }
      if (!args.content) {
        throw new Error('content argument missing in arguments');
      }
      
      const client = this.getClient();
      await client.appendContent(
        args.filepath,
        args.content,
        args.createIfNotExists !== false // Default to true
      );
      
      return this.formatResponse({ success: true, message: 'Content appended successfully' });
    } catch (error) {
      return this.handleError(error);
    }
  }
}