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

    // Input validation
    if (!filepath || !find || replace === undefined) {
      return this.handleErrorWithRecovery(
        new Error('Missing required parameters'), 
        {
          suggestion: 'Provide filepath, find, and replace parameters',
          example: { filepath: 'notes.md', find: 'old text', replace: 'new text' }
        }
      );
    }

    try {
      const client = this.getClient();
      
      // Get the current content
      const currentContent = await client.getFileContents(filepath);
      
      // Check if text to find exists
      if (!currentContent.includes(find)) {
        return this.handleErrorWithRecovery(
          new Error(`Text "${find}" not found in ${filepath}`),
          {
            suggestion: 'Check the exact text to replace. Text search is case-sensitive.',
            workingAlternative: 'Use obsidian_simple_append to add content instead',
            example: { filepath, append: replace }
          }
        );
      }
      
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
      // Handle common error scenarios with specific recovery guidance
      if (error.message?.includes('File not found') || error.response?.status === 404) {
        return this.handleErrorWithRecovery(error, {
          suggestion: 'File does not exist. Check the filepath.',
          workingAlternative: 'Use obsidian_list_files_in_vault to see available files',
          example: { }
        });
      }

      if (error.message?.includes('Permission denied') || error.response?.status === 403) {
        return this.handleErrorWithRecovery(error, {
          suggestion: 'Permission denied. Check API key and file permissions.',
          workingAlternative: 'Verify Obsidian REST API plugin is running and API key is correct'
        });
      }

      return this.handleError(error, [
        {
          description: 'Use simple append instead',
          tool: 'obsidian_simple_append',
          example: { filepath, content: replace }
        }
      ]);
    }
  }
}