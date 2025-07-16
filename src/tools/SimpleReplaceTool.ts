import { BaseTool, ToolResponse } from './base.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

interface SimpleReplaceArgs {
  filepath: string;
  find: string;
  replace: string;
}

export class SimpleReplaceTool extends BaseTool<SimpleReplaceArgs> {
  name = 'obsidian_simple_replace';
  description = 'Replace text in Obsidian vault notes (vault-only - NOT filesystem files). Simple find-and-replace.';

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

  async executeTyped(args: SimpleReplaceArgs): Promise<ToolResponse> {
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
      // Use common error handler for HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
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