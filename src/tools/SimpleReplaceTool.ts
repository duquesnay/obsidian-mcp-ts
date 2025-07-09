import { BaseTool } from './base.js';

interface SimpleReplaceArgs {
  filepath: string;
  find: string;
  replace: string;
}

export class SimpleReplaceTool extends BaseTool {
  name = 'obsidian_simple_replace';
  description = 'Replace text in a file. Use this for simple find-and-replace operations.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string' as const,
        description: 'Path to the file (relative to vault root)'
      },
      find: {
        type: 'string' as const,
        description: 'Text to find (exact match)'
      },
      replace: {
        type: 'string' as const,
        description: 'Text to replace with'
      }
    },
    required: ['filepath', 'find', 'replace']
  };

  async execute(args: SimpleReplaceArgs): Promise<any> {
    const { filepath, find, replace } = args;

    try {
      const client = this.getClient();
      
      // Get the current content
      const currentContent = await client.getFileContents(filepath);
      
      // Perform the replacement
      const newContent = currentContent.replace(find, replace);
      
      // Update the file
      await client.updateFile(filepath, newContent);
      
      return this.formatResponse({
        success: true,
        message: `Successfully replaced "${find}" with "${replace}" in ${filepath}`,
        operation: 'replace',
        filepath,
        find,
        replace
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}