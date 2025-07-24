import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { ListFilesInDirArgs } from './types/ListFilesInDirArgs.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA } from '../utils/validation.js';

export class ListFilesInDirTool extends BaseTool<ListFilesInDirArgs> {
  name = 'obsidian_list_files_in_dir';
  description = 'List notes and folders in a specific Obsidian vault directory (vault-only - NOT general filesystem access).';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['list', 'files', 'directory', 'folder', 'browse', 'pagination'],
    version: '1.1.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      dirpath: {
        type: 'string',
        description: 'Path to list files from (relative to your vault root). Note that empty directories will not be returned.'
      },
      limit: {
        ...PAGINATION_SCHEMA.limit,
        description: `Maximum number of files to return (default: all, max: ${OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT})`,
        maximum: OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT
      },
      offset: PAGINATION_SCHEMA.offset
    },
    required: ['dirpath']
  };

  async executeTyped(args: ListFilesInDirArgs): Promise<ToolResponse> {
    try {
      if (!args.dirpath) {
        throw new Error('dirpath argument missing in arguments');
      }
      
      // Validate the directory path
      PathValidationUtil.validate(args.dirpath, 'dirpath', { type: PathValidationType.DIRECTORY });
      
      const client = this.getClient();
      
      try {
        const files = await client.listFilesInDir(args.dirpath);
        
        // Handle pagination
        const totalCount = files.length;
        const isPaginated = args.limit !== undefined || args.offset !== undefined;
        
        if (isPaginated) {
          const limit = Math.min(args.limit || totalCount, OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT);
          const offset = args.offset || 0;
          
          const paginatedFiles = files.slice(offset, offset + limit);
          const hasMore = offset + limit < totalCount;
          
          return this.formatResponse({
            files: paginatedFiles,
            totalCount,
            hasMore,
            limit,
            offset,
            nextOffset: hasMore ? offset + limit : undefined,
            message: `Showing ${paginatedFiles.length} of ${totalCount} files in ${args.dirpath}`
          });
        }
        
        // Non-paginated response
        return this.formatResponse(files);
      } catch (error: unknown) {
        // If we get a 404 error, check if it's an empty directory
        if (error.response?.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
          // Check if the path exists and is a directory
          const pathInfo = await client.checkPathExists(args.dirpath);
          
          if (pathInfo.exists && pathInfo.type === 'directory') {
            // It's an empty directory, return empty array
            return this.formatResponse([]);
          }
        }
        
        // Re-throw the error if it's not an empty directory case
        throw error;
      }
    } catch (error: unknown) {
      // Use the new handleHttpError method with custom handlers
      if (error.response?.status) {
        return this.handleHttpError(error, {
          404: {
            message: 'Directory not found',
            suggestion: 'Make sure the directory path exists in your vault. Use obsidian_list_files_in_vault to browse available directories',
            example: { dirpath: 'existing-folder' }
          }
        });
      }
      
      return this.handleError(error);
    }
  }
}