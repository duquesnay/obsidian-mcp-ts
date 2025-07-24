import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { ListFilesArgs } from './types/ListFilesArgs.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';

export class ListFilesInVaultTool extends BaseTool<ListFilesArgs> {
  name = 'obsidian_list_files_in_vault';
  description = 'List all notes and folders in your Obsidian vault root (NOT filesystem access - Obsidian vault files only).';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['list', 'files', 'vault', 'browse', 'directory', 'pagination'],
    version: '1.1.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'integer',
        description: `Maximum number of files to return (default: ${OBSIDIAN_DEFAULTS.DEFAULT_LIST_LIMIT}, max: ${OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT})`,
        minimum: 1,
        maximum: OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT
      },
      offset: {
        type: 'integer',
        description: 'Number of files to skip for pagination (default: 0)',
        minimum: 0
      }
    },
    required: []
  };

  async executeTyped(args: ListFilesArgs): Promise<ToolResponse> {
    try {
      // Validate pagination parameters
      if (args.limit !== undefined && args.limit < 1) {
        return this.handleSimplifiedError(
          new Error('Invalid pagination parameters'),
          'limit must be a positive integer',
          { limit: 1000, offset: 0 }
        );
      }
      
      if (args.offset !== undefined && args.offset < 0) {
        return this.handleSimplifiedError(
          new Error('Invalid pagination parameters'),
          'offset must be non-negative',
          { limit: 1000, offset: 0 }
        );
      }
      
      const client = this.getClient();
      const files = await client.listFilesInVault();
      
      // Handle pagination
      const totalCount = files.length;
      const limit = Math.min(args.limit || totalCount, OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT);
      const offset = args.offset || 0;
      
      // Apply pagination
      const paginatedFiles = files.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;
      
      // Structure the response based on whether pagination is used
      const response = args.limit !== undefined || args.offset !== undefined
        ? {
            files: paginatedFiles,
            totalCount,
            hasMore,
            limit,
            offset,
            nextOffset: hasMore ? offset + limit : undefined
          }
        : {
            files,
            count: files.length
          };
      
      return this.formatResponse(response);
    } catch (error: unknown) {
      // Use the new handleHttpError method with custom handlers
      if (error.response?.status) {
        return this.handleHttpError(error, {
          500: 'Server error. The Obsidian REST API may be experiencing issues'
        });
      }
      
      if (error.message?.includes('vault') || error.message?.includes('connection')) {
        return this.handleSimplifiedError(
          error,
          'Cannot connect to Obsidian vault. Ensure Obsidian is running and the Local REST API plugin is active'
        );
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(error);
    }
  }
}