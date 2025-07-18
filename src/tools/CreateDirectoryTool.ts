import { BaseTool, ToolMetadata } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class CreateDirectoryTool extends BaseTool {
  name = 'obsidian_create_directory';
  description = 'Create folders in Obsidian vault (vault-only - NOT filesystem directories). Supports nested creation.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['create', 'directory', 'folder', 'mkdir', 'new'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directoryPath: {
        type: 'string',
        description: 'Path of the directory to create (relative to vault root).'
      },
      createParents: {
        type: 'boolean',
        description: 'Whether to create parent directories if they do not exist (default: true).',
        default: true
      }
    },
    required: ['directoryPath']
  };

  async executeTyped(args: { directoryPath: string; createParents?: boolean }): Promise<any> {
    try {
      if (!args.directoryPath) {
        throw new Error('directoryPath argument missing in arguments');
      }
      
      // Validate the path
      validatePath(args.directoryPath, 'directoryPath');
      
      // Clean up the path (remove trailing slashes)
      const cleanPath = args.directoryPath.replace(/\/$/, '');
      
      const client = this.getClient();
      const result = await client.createDirectory(cleanPath, args.createParents !== false);
      
      return this.formatResponse({ 
        success: true, 
        message: result.message || `Directory created: ${cleanPath}`,
        directoryPath: cleanPath,
        created: result.created || true,
        parentsCreated: result.parentsCreated || false
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}