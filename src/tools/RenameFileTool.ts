import { RenameFileArgs } from './types/RenameFileArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { FILE_PATH_SCHEMA } from '../utils/validation.js';

export class RenameFileTool extends BaseTool<RenameFileArgs> {
  name = 'obsidian_rename_file';
  description = 'Rename an Obsidian vault note within same directory (vault-only - NOT filesystem). Updates all links automatically.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['rename', 'file', 'change', 'name', 'note'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      oldPath: {
        ...FILE_PATH_SCHEMA,
        description: 'Current path of the file to rename (relative to vault root).'
      },
      newPath: {
        ...FILE_PATH_SCHEMA,
        description: 'New path for the file (relative to vault root). Must be in the same directory as the old path.'
      }
    },
    required: ['oldPath', 'newPath']
  };

  async executeTyped(args: RenameFileArgs): Promise<ToolResponse> {
    try {
      if (!args.oldPath) {
        throw new Error('oldPath argument missing in arguments');
      }
      if (!args.newPath) {
        throw new Error('newPath argument missing in arguments');
      }
      
      // Validate both paths
      PathValidationUtil.validate(args.oldPath, 'oldPath', { type: PathValidationType.FILE });
      PathValidationUtil.validate(args.newPath, 'newPath', { type: PathValidationType.FILE });
      
      const client = this.getClient();
      await client.renameFile(args.oldPath, args.newPath);
      
      return this.formatResponse({ 
        success: true, 
        message: `File renamed from ${args.oldPath} to ${args.newPath}` 
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}