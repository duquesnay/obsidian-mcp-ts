import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { ListFilesInDirArgs } from './types/ListFilesInDirArgs.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA, DIR_PATH_SCHEMA } from '../utils/validation.js';
import { hasHttpResponse, getErrorMessage } from '../utils/errorTypeGuards.js';
import { defaultCachedHandlers } from '../resources/CachedConcreteHandlers.js';

export class ListFilesInDirTool extends BaseTool<ListFilesInDirArgs> {
  name = 'obsidian_list_files_in_dir';
  description = 'List notes and folders in a vault directory. Supports pagination.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['list', 'files', 'directory', 'folder', 'browse', 'pagination'],
    version: '1.1.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      dirpath: {
        ...DIR_PATH_SCHEMA,
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
      
      // Build the resource URI with pagination parameters if needed
      const isPaginationRequested = args.limit !== undefined || args.offset !== undefined;
      let resourceUri = `vault://folder/${args.dirpath}`;

      if (isPaginationRequested) {
        const params = new URLSearchParams();
        if (args.limit !== undefined) {
          params.set('limit', args.limit.toString());
        }
        if (args.offset !== undefined) {
          params.set('offset', args.offset.toString());
        }
        // Force full mode when pagination is requested to get file listings
        params.set('mode', 'full');
        resourceUri += `?${params.toString()}`;
      }

      // Use cached resource handler
      const resourceData = await defaultCachedHandlers.folder.handleRequest(resourceUri);

      // Handle different response modes from the resource
      if (resourceData.mode === 'summary') {
        // Summary mode response handling
        const result = {
          path: resourceData.path,
          mode: resourceData.mode,
          fileCount: resourceData.fileCount,
          folders: resourceData.folders,
          message: resourceData.message
        };

        // If resource returned pagination info (paginated summary mode)
        if (resourceData.pagination) {
          return this.formatResponse({
            ...result,
            files: resourceData.files,
            totalCount: resourceData.pagination.totalItems,
            hasMore: resourceData.pagination.hasMore,
            limit: resourceData.pagination.limit,
            offset: resourceData.pagination.offset,
            nextOffset: resourceData.pagination.nextOffset
          });
        }

        // Handle non-paginated summary mode with client-side pagination fallback
        if (isPaginationRequested) {
          return this.formatResponse({
            ...result,
            totalCount: resourceData.fileCount,
            hasMore: false,
            limit: args.limit || resourceData.fileCount,
            offset: args.offset || 0,
            nextOffset: undefined
          });
        }

        return this.formatResponse(result);
      } else {
        // Full mode response handling
        const files = resourceData.items;

        // If resource returned pagination info, use it
        if (resourceData.pagination) {
          return this.formatResponse({
            files: files,
            totalCount: resourceData.pagination.totalItems,
            hasMore: resourceData.pagination.hasMore,
            limit: resourceData.pagination.limit,
            offset: resourceData.pagination.offset,
            nextOffset: resourceData.pagination.nextOffset,
            message: `Showing ${files.length} of ${resourceData.pagination.totalItems} files in ${args.dirpath}`
          });
        }

        // Fallback to client-side pagination (backward compatibility)
        const totalCount = files.length;

        if (isPaginationRequested) {
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
      }
    } catch (error: unknown) {
      // Use the new handleHttpError method with custom handlers
      if (hasHttpResponse(error) && error.response?.status) {
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