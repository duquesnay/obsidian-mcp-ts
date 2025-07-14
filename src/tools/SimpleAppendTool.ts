import { BaseTool, ToolResponse } from './base.js';

interface SimpleAppendArgs {
  filepath: string;
  content: string;
  create_file_if_missing?: boolean;
}

export class SimpleAppendTool extends BaseTool<SimpleAppendArgs> {
  name = 'obsidian_simple_append';
  description = 'Append text to Obsidian vault notes (vault-only - NOT filesystem files). Simple text additions.';

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
      return this.handleErrorWithRecovery(
        new Error('Missing required parameters'),
        {
          suggestion: 'Provide filepath and content parameters',
          example: { filepath: 'notes.md', content: 'Text to append' }
        }
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
      // Handle common error scenarios with specific recovery guidance
      if (error.message?.includes('File not found') || error.response?.status === 404) {
        return this.handleErrorWithRecovery(error, {
          suggestion: 'File does not exist. Try setting create_file_if_missing to true.',
          workingAlternative: 'Enable file creation',
          example: { filepath, content, create_file_if_missing: true }
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
          description: 'Use obsidian_simple_replace to replace specific text',
          tool: 'obsidian_simple_replace',
          example: { filepath, find: 'old text', replace: 'new text' }
        }
      ]);
    }
  }
}