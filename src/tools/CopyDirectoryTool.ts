import { CopyDirectoryArgs } from './types/CopyDirectoryArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { validateRequiredArgs, DIR_PATH_SCHEMA, BOOLEAN_FLAG_SCHEMA } from '../utils/validation.js';

export class CopyDirectoryTool extends BaseTool<CopyDirectoryArgs> {
  name = 'obsidian_copy_directory';
  description = 'Copy folders within Obsidian vault (vault-only - NOT filesystem operations). Preserves folder structure.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['copy', 'directory', 'folder', 'duplicate', 'clone'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sourcePath: {
        ...DIR_PATH_SCHEMA,
        description: 'Path of the directory to copy (relative to vault root).'
      },
      destinationPath: {
        ...DIR_PATH_SCHEMA,
        description: 'Destination path for the copied directory (relative to vault root).'
      },
      overwrite: {
        ...BOOLEAN_FLAG_SCHEMA,
        description: 'Whether to overwrite existing files in the destination (default: false).'
      }
    },
    required: ['sourcePath', 'destinationPath']
  };

  async executeTyped(args: CopyDirectoryArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['sourcePath', 'destinationPath']);
      
      // Validate both paths
      PathValidationUtil.validate(args.sourcePath, 'sourcePath', { type: PathValidationType.DIRECTORY });
      PathValidationUtil.validate(args.destinationPath, 'destinationPath', { type: PathValidationType.DIRECTORY });
      
      // Ensure paths don't end with slash for consistency
      const sourcePath = args.sourcePath.replace(/\/$/, '');
      const destinationPath = args.destinationPath.replace(/\/$/, '');
      
      // Prevent copying a directory into itself
      if (destinationPath.startsWith(sourcePath + '/')) {
        throw new Error('Cannot copy a directory into itself');
      }
      
      // Prevent copying to the same location
      if (sourcePath === destinationPath) {
        throw new Error('Source and destination paths cannot be the same');
      }
      
      const client = this.getClient();
      const result = await client.copyDirectory(sourcePath, destinationPath, args.overwrite || false);
      
      return this.formatResponse({ 
        success: true, 
        message: result.message || `Directory copied from ${sourcePath} to ${destinationPath}`,
        sourcePath: sourcePath,
        destinationPath: destinationPath,
        filesCopied: result.filesCopied || 0,
        failedFiles: result.failedFiles || []
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}