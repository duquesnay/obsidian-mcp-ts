import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { validatePath } from '../utils/pathValidator.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';
import { AppendContentArgs } from './types/AppendContentArgs.js';

export class AppendContentTool extends BaseTool<AppendContentArgs> {
  name = 'obsidian_append_content';
  description = 'Append content to Obsidian vault notes (NOT filesystem files - vault notes only). Auto-adds newline between content.';
  
  metadata: ToolMetadata = {
    category: 'editing',
    keywords: ['append', 'add', 'write', 'content', 'note'],
    version: '1.0.0'
  };
  
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

  async executeTyped(args: AppendContentArgs): Promise<ToolResponse> {
    try {
      // Enhanced input validation with recovery
      if (!args.filepath || !args.content) {
        return this.handleSimplifiedError(
          new Error('Missing required parameters'),
          'Provide both filepath and content parameters. Use obsidian_list_files_in_vault to browse available files if you need to find the target file',
          {
            filepath: 'notes/journal.md',
            content: 'New content to append',
            createIfNotExists: true
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
      // Special case: 404 with createIfNotExists false
      if (error.response?.status === 404 && args.createIfNotExists === false) {
        return this.handleSimplifiedError(
          error,
          'File does not exist and createIfNotExists is set to false. Either set createIfNotExists to true or use an existing file. Use obsidian_list_files_in_vault to find existing files',
          {
            filepath: args.filepath,
            content: args.content,
            createIfNotExists: true
          }
        );
      }
      
      // Use centralized error handler for common HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }
      
      // Handle disk space errors
      if (error.message?.includes('disk space') || error.message?.includes('space')) {
        return this.handleSimplifiedError(
          error,
          'Insufficient disk space. Free up space on your system and try again. Try appending smaller content or delete unused files first',
          {
            filepath: args.filepath,
            content: 'Shorter content'
          }
        );
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(
        error,
        'Alternative options: Browse files in your vault (tool: obsidian_list_files_in_vault), Get existing file content first (tool: obsidian_get_file_contents), Replace content instead of appending (tool: obsidian_simple_replace)',
        { filepath: args.filepath }
      );
    }
  }
}