import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';
import { ObsidianErrorHandler } from '../utils/ObsidianErrorHandler.js';

export class DeleteFileTool extends BaseTool {
  name = 'obsidian_delete_file';
  description = 'Delete a note or folder from your Obsidian vault (vault-only operation - NOT filesystem deletion).';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to the file or directory to delete (relative to vault root).'
      }
    },
    required: ['filepath']
  };

  async executeTyped(args: { filepath: string }): Promise<any> {
    try {
      // Enhanced input validation with recovery
      if (!args.filepath) {
        return this.handleErrorWithRecovery(
          new Error('Missing required parameters'),
          {
            suggestion: 'Provide filepath parameter to specify which file or directory to delete',
            workingAlternative: 'Use obsidian_list_files_in_vault to browse available files first',
            example: {
              filepath: 'notes/file-to-delete.md'
            }
          }
        );
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      await client.deleteFile(args.filepath);
      
      return this.formatResponse({ success: true, message: 'File deleted successfully' });
    } catch (error: any) {
      // Use centralized error handler for common HTTP errors
      if (error.response?.status) {
        return ObsidianErrorHandler.handleHttpError(error, this.name);
      }
      
      // Handle file lock errors
      if (error.message?.includes('in use') || error.message?.includes('locked')) {
        return this.handleErrorWithRecovery(
          error,
          {
            suggestion: 'File is currently in use or locked. Close the file in Obsidian and try again',
            workingAlternative: 'Wait for the file to be released and retry the operation',
            example: {
              filepath: args.filepath
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
          description: 'Get file content before deletion',
          tool: 'obsidian_get_file_contents',
          example: { filepath: args.filepath }
        }
      ]);
    }
  }
}