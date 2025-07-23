import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class MoveFileTool extends BaseTool {
  name = 'obsidian_move_file';
  description = 'Move Obsidian vault notes between folders (vault-only - NOT filesystem moves). Updates all internal links.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['move', 'file', 'rename', 'relocate', 'note'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sourcePath: {
        type: 'string',
        description: 'Current path of the file to move (relative to vault root).'
      },
      destinationPath: {
        type: 'string',
        description: 'Destination path for the file (relative to vault root). Can be in a different directory and/or have a different filename.'
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