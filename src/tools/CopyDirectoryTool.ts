import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class CopyDirectoryTool extends BaseTool {
  name = 'obsidian_copy_directory';
  description = 'Copy folders within Obsidian vault (vault-only - NOT filesystem operations). Preserves folder structure.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sourcePath: {
        type: 'string',
        description: 'Path of the directory to copy (relative to vault root).'
      },
      destinationPath: {
        type: 'string',
        description: 'Destination path for the copied directory (relative to vault root).'
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to overwrite existing files in the destination (default: false).',
        default: false
      }
    },
    required: ['sourcePath', 'destinationPath']
  };

  async executeTyped(args: { sourcePath: string; destinationPath: string; overwrite?: boolean }): Promise<any> {
    try {
      if (!args.sourcePath) {
        throw new Error('sourcePath argument missing in arguments');
      }
      if (!args.destinationPath) {
        throw new Error('destinationPath argument missing in arguments');
      }
      
      // Validate both paths
      validatePath(args.sourcePath, 'sourcePath');
      validatePath(args.destinationPath, 'destinationPath');
      
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