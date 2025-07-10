import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

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
      // Enhanced input validation with recovery
      if (!args.filepath || !args.content) {
        return this.handleErrorWithRecovery(
          new Error('Missing required parameters'),
          {
            suggestion: 'Provide both filepath and content parameters',
            workingAlternative: 'Use obsidian_list_files_in_vault to browse available files if you need to find the target file',
            example: {
              filepath: 'notes/journal.md',
              content: 'New content to append',
              createIfNotExists: true
            }
          }
        );
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      await client.appendContent(
        args.filepath,
        args.content,
        args.createIfNotExists !== false // Default to true
      );
      
      return this.formatResponse({ success: true, message: 'Content appended successfully' });
    } catch (error: any) {
      // Enhanced error handling with HTTP status codes
      if (error.response?.status === 404 && args.createIfNotExists === false) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'File does not exist and createIfNotExists is set to false. Either set createIfNotExists to true or use an existing file',
            workingAlternative: 'Use obsidian_list_files_in_vault to find existing files or set createIfNotExists to true',
            example: {
              filepath: args.filepath,
              content: args.content,
              createIfNotExists: true
            }
          }
        );
      }
      
      if (error.response?.status === 403) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Permission denied. Check your API key and ensure the Obsidian Local REST API plugin is running, or the file may be read-only',
            workingAlternative: 'Verify your OBSIDIAN_API_KEY environment variable and plugin status',
            example: {
              filepath: args.filepath,
              content: args.content
            }
          }
        );
      }
      
      if (error.message?.includes('disk space') || error.message?.includes('space')) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'Insufficient disk space. Free up space on your system and try again',
            workingAlternative: 'Try appending smaller content or delete unused files first',
            example: {
              filepath: args.filepath,
              content: 'Shorter content'
            }
          }
        );
      }
      
      // Fallback to basic error handling with alternatives
      return this.handleError(error, [
        {
          description: 'Browse files in your vault',
          tool: 'obsidian_list_files_in_vault'
        },
        {
          description: 'Get existing file content first',
          tool: 'obsidian_get_file_contents',
          example: { filepath: args.filepath }
        },
        {
          description: 'Replace content instead of appending',
          tool: 'obsidian_simple_replace',
          example: { filepath: args.filepath, find: 'old text', replace: 'new text' }
        }
      ]);
    }
  }
}