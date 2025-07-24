import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { DIR_PATH_SCHEMA } from '../utils/validation.js';

export class MoveDirectoryTool extends BaseTool {
  name = 'obsidian_move_directory';
  description = 'Move folders within Obsidian vault (vault-only - NOT filesystem operations). Preserves structure and updates links.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['move', 'directory', 'folder', 'rename', 'relocate'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sourcePath: {
        ...DIR_PATH_SCHEMA,
        description: 'Current path of the directory to move (relative to vault root).'
      },
      destinationPath: {
        ...DIR_PATH_SCHEMA,
        description: 'Destination path for the directory (relative to vault root).'
      }
    },
    required: ['sourcePath', 'destinationPath']
  };

  async executeTyped(args: { sourcePath: string; destinationPath: string }): Promise<ToolResponse> {
    try {
      if (!args.sourcePath) {
        throw new Error('sourcePath argument missing in arguments');
      }
      if (!args.destinationPath) {
        throw new Error('destinationPath argument missing in arguments');
      }
      
      // Validate both paths
      PathValidationUtil.validate(args.sourcePath, 'sourcePath', { type: PathValidationType.DIRECTORY });
      PathValidationUtil.validate(args.destinationPath, 'destinationPath', { type: PathValidationType.DIRECTORY });
      
      // Ensure paths don't end with slash for consistency
      const sourcePath = args.sourcePath.replace(/\/$/, '');
      const destinationPath = args.destinationPath.replace(/\/$/, '');
      
      // Prevent moving a directory into itself
      if (destinationPath.startsWith(sourcePath + '/')) {
        throw new Error('Cannot move a directory into itself');
      }
      
      const client = this.getClient();
      const result = await client.moveDirectory(sourcePath, destinationPath);
      
      return this.formatResponse({ 
        success: result.success || true, 
        message: result.message || `Directory moved from ${sourcePath} to ${destinationPath}`,
        oldPath: result.oldPath,
        newPath: result.newPath,
        filesMovedCount: result.filesMovedCount,
        movedFiles: result.movedFiles || [],
        failedFiles: result.failedFiles || []
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}