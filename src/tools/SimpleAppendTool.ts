import { BaseTool, ToolResponse, ToolMetadata } from './base.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

interface SimpleAppendArgs {
  filepath: string;
  content: string;
  create_file_if_missing?: boolean;
}

export class SimpleAppendTool extends BaseTool<SimpleAppendArgs> {
  name = 'obsidian_simple_append';
  description = 'Append text to Obsidian vault notes (vault-only - NOT filesystem files). Simple text additions.';
  
  metadata: ToolMetadata = {
    category: 'editing',
    keywords: ['append', 'add', 'text', 'simple', 'edit'],
    version: '1.0.0'
  };

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

  async executeTyped(args: SimpleAppendArgs): Promise<ToolResponse> {
    const { filepath, content, create_file_if_missing = false } = args;

    // Input validation
    if (!filepath || content === undefined) {
      return this.handleSimplifiedError(
        new Error('Missing required parameters'),
        'Provide filepath and content parameters',
        { filepath: 'notes.md', content: 'Text to append' }
      );
    }

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
      // Use common error handler for HTTP errors
      if (error.response?.status) {
        // Special handling for 404 - suggest creating the file
        if (error.response.status === 404 && !create_file_if_missing) {
          return this.handleSimplifiedError(
            error,
            'File does not exist. Try setting create_file_if_missing to true.',
            { filepath, content, create_file_if_missing: true }
          );
        }
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }

      return this.handleSimplifiedError(error);
    }
  }
}