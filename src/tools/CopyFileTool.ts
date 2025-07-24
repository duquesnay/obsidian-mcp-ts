import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { FILE_PATH_SCHEMA, BOOLEAN_FLAG_SCHEMA } from '../utils/validation.js';
import { CopyFileArgs } from './types/CopyFileArgs.js';

export class CopyFileTool extends BaseTool<CopyFileArgs> {
  name = 'obsidian_copy_file';
  description = 'Copy Obsidian vault notes to new location (vault-only - NOT filesystem copying). Creates duplicate with content.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['copy', 'file', 'duplicate', 'clone', 'note'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sourcePath: {
        ...FILE_PATH_SCHEMA,
        description: 'Path of the file to copy (relative to vault root).'
      },
      destinationPath: {
        ...FILE_PATH_SCHEMA,
        description: 'Destination path for the copied file (relative to vault root).'
      },
      overwrite: {
        ...BOOLEAN_FLAG_SCHEMA,
        description: 'Whether to overwrite the destination file if it already exists (default: false).'
      }
    },
    required: ['sourcePath', 'destinationPath']
  };

  async executeTyped(args: CopyFileArgs): Promise<ToolResponse> {
    try {
      if (!args.sourcePath) {
        throw new Error('sourcePath argument missing in arguments');
      }
      if (!args.destinationPath) {
        throw new Error('destinationPath argument missing in arguments');
      }
      
      // Validate both paths
      PathValidationUtil.validate(args.sourcePath, 'sourcePath', { type: PathValidationType.FILE });
      PathValidationUtil.validate(args.destinationPath, 'destinationPath', { type: PathValidationType.FILE });
      
      // Prevent copying a file to itself
      if (args.sourcePath === args.destinationPath) {
        throw new Error('Cannot copy a file to itself');
      }
      
      const client = this.getClient();
      await client.copyFile(args.sourcePath, args.destinationPath, args.overwrite || false);
      
      return this.formatResponse({ 
        success: true, 
        message: `File copied from ${args.sourcePath} to ${args.destinationPath}`,
        sourcePath: args.sourcePath,
        destinationPath: args.destinationPath
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}