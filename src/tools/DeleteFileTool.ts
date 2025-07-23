import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { DeleteFileArgs } from './types/DeleteFileArgs.js';

export class DeleteFileTool extends BaseTool<DeleteFileArgs> {
  name = 'obsidian_delete_file';
  description = 'Delete a note or folder from your Obsidian vault (vault-only operation - NOT filesystem deletion).';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['delete', 'file', 'remove', 'trash', 'note'],
    version: '1.0.0'
  };
  
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

  async executeTyped(args: DeleteFileArgs): Promise<ToolResponse> {
    try {
      // Enhanced input validation with recovery
      if (!args.filepath) {
        return this.handleSimplifiedError(
          new Error('Missing required parameters'),
          'Provide filepath parameter to specify which file or directory to delete. Use obsidian_list_files_in_vault to browse available files first',
          {
            filepath: 'notes/file-to-delete.md'
          }
        );
      }
      
      // Validate the filepath (works with both files and directories)
      PathValidationUtil.validate(args.filepath, 'filepath', { type: PathValidationType.ANY });
      
      const client = this.getClient();
      await client.deleteFile(args.filepath);
      
      return this.formatResponse({ success: true, message: 'File deleted successfully' });
    } catch (error: any) {
      // Use the new handleHttpError method with custom handlers
      if (error.response?.status) {
        return this.handleHttpError(error, {
          404: {
            message: 'File not found',
            suggestion: 'The file may have already been deleted or the path is incorrect. Use obsidian_list_files_in_vault to verify file existence',
            example: { filepath: 'existing-file.md' }
          }
        });
      }
      
      // Handle file lock errors
      if (error.message?.includes('in use') || error.message?.includes('locked')) {
        return this.handleSimplifiedError(
          error,
          'File is currently in use or locked. Close the file in Obsidian and try again. Wait for the file to be released and retry the operation',
          {
            filepath: args.filepath
          }
        );
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(
        error,
        'Alternative options: Browse files in your vault (tool: obsidian_list_files_in_vault), Get file content before deletion (tool: obsidian_get_file_contents)',
        { filepath: args.filepath }
      );
    }
  }
}