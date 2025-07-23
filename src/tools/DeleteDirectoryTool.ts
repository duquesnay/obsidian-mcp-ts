import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class DeleteDirectoryTool extends BaseTool {
  name = 'obsidian_delete_directory';
  description = 'Delete folders from Obsidian vault (vault-only - NOT filesystem deletion). Supports recursive deletion.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['delete', 'directory', 'folder', 'remove', 'trash'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directoryPath: {
        type: 'string',
        description: 'Path of the directory to delete (relative to vault root).'
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to delete directory and all its contents recursively (default: false).',
        default: false
      },
      permanent: {
        type: 'boolean',
        description: 'Permanently delete directory instead of moving to trash (default: false).',
        default: false
      }
    },
    required: ['directoryPath']
  };

  async executeTyped(args: { directoryPath: string; recursive?: boolean; permanent?: boolean }): Promise<ToolResponse> {
    try {
      if (!args.directoryPath) {
        throw new Error('directoryPath argument missing in arguments');
      }
      
      // Validate the path
      PathValidationUtil.validate(args.directoryPath, 'directoryPath', { type: PathValidationType.DIRECTORY });
      
      // Clean up the path (remove trailing slashes)
      const cleanPath = args.directoryPath.replace(/\/$/, '');
      
      // Safety check - prevent deleting root or critical paths
      if (cleanPath === '' || cleanPath === '.' || cleanPath === '/') {
        throw new Error('Cannot delete root directory or critical paths');
      }
      
      const client = this.getClient();
      const result = await client.deleteDirectory(cleanPath, args.recursive || false, args.permanent || false);
      
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