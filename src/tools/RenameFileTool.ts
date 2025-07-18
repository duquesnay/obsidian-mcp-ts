import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class RenameFileTool extends BaseTool {
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
        type: 'string',
        description: 'Current path of the file to rename (relative to vault root).'
      },
      newPath: {
        type: 'string',
        description: 'New path for the file (relative to vault root). Must be in the same directory as the old path.'
      }
    },
    required: ['oldPath', 'newPath']
  };

  async executeTyped(args: { oldPath: string; newPath: string }): Promise<ToolResponse> {
    try {
      if (!args.oldPath) {
        throw new Error('oldPath argument missing in arguments');
      }
      if (!args.newPath) {
        throw new Error('newPath argument missing in arguments');
      }
      
      // Validate both paths
      validatePath(args.oldPath, 'oldPath');
      validatePath(args.newPath, 'newPath');
      
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