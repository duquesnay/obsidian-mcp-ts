import { CreateDirectoryArgs } from './types/CreateDirectoryArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType, PathValidationError } from '../utils/PathValidationUtil.js';
import { DIR_PATH_SCHEMA } from '../utils/validation.js';

export class CreateDirectoryTool extends BaseTool<CreateDirectoryArgs> {
  name = 'obsidian_create_directory';
  description = 'Create folders in Obsidian vault. Supports nested creation.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['create', 'directory', 'folder', 'mkdir', 'new'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directoryPath: DIR_PATH_SCHEMA,
      createParents: {
        type: 'boolean',
        description: 'Whether to create parent directories if they do not exist (default: true).',
        default: true
      }
    },
    required: ['directoryPath']
  };

  async executeTyped(args: CreateDirectoryArgs): Promise<ToolResponse> {
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

      // Notify that directory was created
      this.notifyDirectoryOperation('create', cleanPath, {
        createParents: args.createParents !== false,
        parentsCreated: result.parentsCreated || false
      });

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