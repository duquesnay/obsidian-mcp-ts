import { BaseTool } from './base.js';

interface SimpleAppendArgs {
  filepath: string;
  content: string;
  create_file_if_missing?: boolean;
}

export class SimpleAppendTool extends BaseTool {
  name = 'obsidian_simple_append';
  description = 'Append text to the end of a file. Use this for simple text additions.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string' as const,
        description: 'Path to the file (relative to vault root)'
      },
      content: {
        type: 'string' as const,
        description: 'Text to append to the end of the file'
      },
      create_file_if_missing: {
        type: 'boolean' as const,
        description: 'Create the file if it doesn\'t exist (default: false)',
        default: false
      }
    },
    required: ['filepath', 'content']
  };

  async execute(args: SimpleAppendArgs): Promise<any> {
    const { filepath, content, create_file_if_missing = false } = args;

    try {
      const client = this.getClient();
      
      // Use the existing append_content functionality
      await client.appendContent(filepath, content, create_file_if_missing);
      
      return this.formatResponse({
        success: true,
        message: `Successfully appended content to ${filepath}`,
        operation: 'append',
        filepath
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}