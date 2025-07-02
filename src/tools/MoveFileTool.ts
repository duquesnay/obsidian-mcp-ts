import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class MoveFileTool extends BaseTool {
  name = 'obsidian_move_file';
  description = 'Move a file to a different location (can move between directories, rename in place, or both) while preserving history and updating links (requires updated REST API plugin).';
  
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

  async execute(args: { sourcePath: string; destinationPath: string }): Promise<any> {
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