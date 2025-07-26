import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { AppendContentArgs } from './types/AppendContentArgs.js';
import { FILE_PATH_SCHEMA, CONTENT_SCHEMA } from '../utils/validation.js';
import { hasHttpResponse, hasMessage, getHttpStatus, getErrorMessage } from '../utils/errorTypeGuards.js';

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
        ...FILE_PATH_SCHEMA,
        description: 'Path of the file to append to (relative to vault root). Will be created if it doesn\'t exist.'
      },
      content: {
        ...CONTENT_SCHEMA,
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
      PathValidationUtil.validate(args.filepath, 'filepath', { type: PathValidationType.FILE });
      
      const client = this.getClient();
      await client.appendContent(
        args.filepath,
        args.content,
        args.createIfNotExists !== false // Default to true
      );
      
      // Notify that file was updated (or created if it didn't exist)
      this.notifyFileOperation('update', args.filepath, {
        contentLength: args.content.length,
        createIfNotExists: args.createIfNotExists !== false
      });
      
      return this.formatResponse({ success: true, message: 'Content appended successfully' });
    } catch (error: unknown) {
      // Special case: 404 with createIfNotExists false
      if (getHttpStatus(error) === 404 && args.createIfNotExists === false) {
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
      
      
      // Handle disk space errors
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes('disk space') || errorMessage.includes('space')) {
        return this.handleSimplifiedError(
          error,
          'Insufficient disk space. Free up space on your system and try again. Try appending smaller content or delete unused files first',
          {
            filepath: args.filepath,
            content: 'Shorter content'
          }
        );
      }
      
      // Use the new handleHttpError method to handle HTTP errors
      // For non-HTTP errors, provide fallback suggestions
      if (hasHttpResponse(error)) {
        return this.handleHttpError(error);
      }
      
      // Fallback to basic error handling for non-HTTP errors
      return this.handleSimplifiedError(
        error,
        'Alternative options: Browse files in your vault (tool: obsidian_list_files_in_vault), Get existing file content first (tool: obsidian_get_file_contents), Replace content instead of appending (tool: obsidian_simple_replace)',
        { filepath: args.filepath }
      );
    }
  }
}