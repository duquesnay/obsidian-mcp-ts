import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType, PathValidationError } from '../utils/PathValidationUtil.js';

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

  async executeTyped(args: { directoryPath: string; createParents?: boolean }): Promise<ToolResponse> {
    try {
      // Validate and normalize the directory path
      try {
        PathValidationUtil.validate(args.directoryPath, 'directoryPath', { 
          type: PathValidationType.DIRECTORY 
        });
      } catch (error) {
        if (error instanceof PathValidationError) {
          return this.handleSimplifiedError(
            error,
            'Provide a valid directory path. Directory paths should be relative to the vault root',
            {
              directoryPath: 'projects/new-folder',
              createParents: true
            }
          );
        }
        throw error;
      }
      
      // Normalize the path (removes trailing slashes)
      const cleanPath = PathValidationUtil.normalize(args.directoryPath, PathValidationType.DIRECTORY);
      
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