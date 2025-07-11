import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class CheckPathExistsTool extends BaseTool {
  name = 'obsidian_check_path_exists';
  description = 'Check if a file or directory exists in the vault and determine its type.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Path to check for existence (relative to vault root).'
      }
    },
    required: ['path']
  };

  async executeTyped(args: { path: string }): Promise<any> {
    try {
      if (!args.path) {
        throw new Error('path argument missing in arguments');
      }
      
      // Validate the path
      validatePath(args.path, 'path');
      
      const client = this.getClient();
      const result = await client.checkPathExists(args.path);
      
      return this.formatResponse({
        path: args.path,
        exists: result.exists,
        type: result.type, // 'file', 'directory', or null
        message: result.exists 
          ? `Path exists as ${result.type}: ${args.path}`
          : `Path does not exist: ${args.path}`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}