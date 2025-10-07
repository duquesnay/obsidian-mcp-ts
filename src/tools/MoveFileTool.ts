import { MoveFileArgs } from './types/MoveFileArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { validateRequiredArgs, FILE_PATH_SCHEMA } from '../utils/validation.js';

export class MoveFileTool extends BaseTool<MoveFileArgs> {
  name = 'obsidian_move_file';
  description = 'Move Obsidian vault notes between folders.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['move', 'file', 'rename', 'relocate', 'note'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sourcePath: {
        ...FILE_PATH_SCHEMA,
        description: 'Current path of the file to move (relative to vault root).'
      },
      destinationPath: {
        ...FILE_PATH_SCHEMA,
        description: 'Destination path for the file (relative to vault root). Can be in a different directory and/or have a different filename.'
      }
    },
    required: ['sourcePath', 'destinationPath']
  };

  async executeTyped(args: MoveFileArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['sourcePath', 'destinationPath']);
      
      // Validate both paths
      PathValidationUtil.validate(args.sourcePath, 'sourcePath', { type: PathValidationType.FILE });
      PathValidationUtil.validate(args.destinationPath, 'destinationPath', { type: PathValidationType.FILE });
      
      const client = this.getClient();
      await client.moveFile(args.sourcePath, args.destinationPath);
      
      return this.formatResponse({ 
        success: true, 
        message: `File moved from ${args.sourcePath} to ${args.destinationPath}` 
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}