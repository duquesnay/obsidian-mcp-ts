import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class CheckPathExistsTool extends BaseTool {
  name = 'obsidian_check_path_exists';
  description = 'Check if note or folder exists in Obsidian vault (vault-only - NOT filesystem paths). Returns type info.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['check', 'exists', 'path', 'file', 'directory'],
    version: '1.0.0'
  };
  
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

  async executeTyped(args: { path: string }): Promise<ToolResponse> {
    try {
      if (!args.path) {
        throw new Error('path argument missing in arguments');
      }
      
      // Validate the path (can be either file or directory)
      PathValidationUtil.validate(args.path, 'path', { type: PathValidationType.ANY });
      
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