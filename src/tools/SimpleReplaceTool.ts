import { BaseTool, ToolResponse, ToolMetadata } from './base.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

interface SimpleReplaceArgs {
  filepath: string;
  find: string;
  replace: string;
}

export class SimpleReplaceTool extends BaseTool<SimpleReplaceArgs> {
  name = 'obsidian_simple_replace';
  description = 'Replace text in Obsidian vault notes (vault-only - NOT filesystem files). Simple find-and-replace.';
  
  metadata: ToolMetadata = {
    category: 'editing',
    keywords: ['replace', 'find', 'substitute', 'edit', 'text'],
    version: '1.0.0'
  };

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
      return this.handleSimplifiedError(
        new Error('Missing required parameters'), 
        'Provide filepath, find, and replace parameters',
        { filepath: 'notes.md', find: 'old text', replace: 'new text' }
      );
    }

    try {
      const client = this.getClient();
      
      // Get the current content
      const currentContent = await client.getFileContents(filepath);
      
      // Type assertion is safe here because we're not passing a format parameter
      const contentString = currentContent as string;
      
      // Check if text to find exists
      if (!contentString.includes(find)) {
        return this.handleSimplifiedError(
          new Error(`Text "${find}" not found in ${filepath}`),
          'Check the exact text to replace. Text search is case-sensitive.'
        );
      }
      
      // Perform the replacement
      const newContent = contentString.replace(find, replace);
      
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

      return this.handleSimplifiedError(error);
    }
  }
}