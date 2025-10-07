import { DeleteDirectoryArgs } from './types/DeleteDirectoryArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { validateRequiredArgs, DIR_PATH_SCHEMA, BOOLEAN_FLAG_SCHEMA } from '../utils/validation.js';
import { REGEX_PATTERNS } from '../constants.js';

export class DeleteDirectoryTool extends BaseTool<DeleteDirectoryArgs> {
  name = 'obsidian_delete_directory';
  description = 'Delete folders from Obsidian vault. Supports recursive deletion.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['delete', 'directory', 'folder', 'remove', 'trash'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directoryPath: {
        ...DIR_PATH_SCHEMA,
        description: 'Path of the directory to delete (relative to vault root).'
      },
      recursive: {
        ...BOOLEAN_FLAG_SCHEMA,
        description: 'Whether to delete directory and all its contents recursively (default: false).'
      },
      permanent: {
        ...BOOLEAN_FLAG_SCHEMA,
        description: 'Permanently delete directory instead of moving to trash (default: false).'
      }
    },
    required: ['directoryPath']
  };

  async executeTyped(args: DeleteDirectoryArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['directoryPath']);
      
      // Validate the path
      PathValidationUtil.validate(args.directoryPath, 'directoryPath', { type: PathValidationType.DIRECTORY });
      
      // Clean up the path (remove trailing slashes)
      const cleanPath = args.directoryPath.replace(REGEX_PATTERNS.TRAILING_SLASH, '');
      
      // Safety check - prevent deleting root or critical paths
      if (cleanPath === '' || cleanPath === '.' || cleanPath === '/') {
        throw new Error('Cannot delete root directory or critical paths');
      }
      
      const client = this.getClient();
      const result = await client.deleteDirectory(cleanPath, args.recursive || false, args.permanent || false);
      
      // Notify that directory was deleted
      this.notifyDirectoryOperation('delete', cleanPath, {
        recursive: args.recursive || false,
        permanent: args.permanent || false,
        filesDeleted: result.filesDeleted || 0
      });
      
      return this.formatResponse({ 
        success: true, 
        message: result.message || `Directory ${args.permanent ? 'permanently deleted' : 'moved to trash'}: ${cleanPath}`,
        directoryPath: cleanPath,
        deleted: result.deleted || true,
        filesDeleted: result.filesDeleted || 0,
        recursive: args.recursive || false,
        permanent: args.permanent || false
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}