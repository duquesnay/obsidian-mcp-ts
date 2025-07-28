import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { ListFilesArgs } from './types/ListFilesArgs.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA, validatePaginationParams } from '../utils/validation.js';
import { defaultCachedHandlers } from '../resources/CachedConcreteHandlers.js';

interface FolderStructure {
  files: string[];
  folders: { [key: string]: FolderStructure };
}

export class ListFilesInVaultTool extends BaseTool<ListFilesArgs> {
  name = 'obsidian_list_files_in_vault';
  description = 'List all notes and folders in your Obsidian vault root (NOT filesystem access - Obsidian vault files only). Uses vault://structure resource internally with 5 minute cache for optimal performance.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['list', 'files', 'vault', 'browse', 'directory', 'pagination'],
    version: '1.2.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      limit: {
        ...PAGINATION_SCHEMA.limit,
        description: `Maximum number of files to return (default: ${OBSIDIAN_DEFAULTS.DEFAULT_LIST_LIMIT}, max: ${OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT})`,
        maximum: OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT
      },
      offset: PAGINATION_SCHEMA.offset
    },
    required: []
  };

  /**
   * Flatten hierarchical folder structure into a flat list of file paths
   */
  private flattenStructure(structure: FolderStructure, basePath: string = ''): string[] {
    const files: string[] = [];
    
    // Add files from current level
    for (const fileName of structure.files) {
      const fullPath = basePath ? `${basePath}/${fileName}` : fileName;
      files.push(fullPath);
    }
    
    // Add files from subfolders recursively
    for (const [folderName, folderStructure] of Object.entries(structure.folders)) {
      // Skip summary indicators
      if (folderName === '...') continue;
      
      const folderPath = basePath ? `${basePath}/${folderName}` : folderName;
      files.push(...this.flattenStructure(folderStructure, folderPath));
    }
    
    return files;
  }

  async executeTyped(args: ListFilesArgs): Promise<ToolResponse> {
    try {
      // Validate pagination parameters
      try {
        validatePaginationParams(args.limit, args.offset);
      } catch (error) {
        return this.handleSimplifiedError(
          error,
          undefined,
          { limit: 1000, offset: 0 }
        );
      }
      
      // Use cached resource handler instead of direct client call for better performance
      const resourceData = await defaultCachedHandlers.structure.handleRequest('vault://structure');
      const files = this.flattenStructure(resourceData.structure);
      
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
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status) {
        return this.handleHttpError(error, {
          500: 'Server error. The Obsidian REST API may be experiencing issues'
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('vault') || errorMessage.includes('connection')) {
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