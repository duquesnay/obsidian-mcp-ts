import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';

/**
 * Response modes for vault://tags resource
 * 
 * - summary: Default mode. Returns metadata about tag usage patterns with top tags (optimal for conversations)
 * - full: Returns complete tag list (backward compatibility mode)
 * 
 * Usage:
 * - vault://tags (defaults to summary)
 * - vault://tags?mode=summary
 * - vault://tags?mode=full
 */
type TagsResponseMode = 'summary' | 'full';

const TAGS_RESPONSE_MODES: Record<string, TagsResponseMode> = {
  SUMMARY: 'summary',
  FULL: 'full'
} as const;

interface TagsSummaryResponse {
  mode: 'summary';
  totalTags: number;
  topTags: Array<{ name: string; count: number }>;
  usageStats: {
    totalUsages: number;
    averageUsage: number;
    medianUsage: number;
  };
  message: string;
}

interface TagsFullResponse {
  mode: 'full';
  tags: Array<{ name: string; count: number }>;
  totalTags: number;
  pagination?: {
    totalItems: number;
    hasMore: boolean;
    limit: number;
    offset: number;
    nextOffset?: number;
    usageStats?: {
      totalUsages: number;
      averageUsage: number;
      medianUsage: number;
    };
  };
}

type TagsResponse = TagsSummaryResponse | TagsFullResponse;

export class TagsHandler extends BaseResourceHandler {
  private static readonly DEFAULT_LIMIT = 100; // Default limit for tag pagination
  
  async handleRequest(uri: string, server?: any): Promise<TagsResponse> {
    // Parse query parameters for mode and pagination
    const url = new URL(uri, 'vault://');
    const modeParam = url.searchParams.get('mode') || TAGS_RESPONSE_MODES.SUMMARY;
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    
    // Validate and set mode (default to summary for invalid modes)
    const validModes: TagsResponseMode[] = Object.values(TAGS_RESPONSE_MODES);
    const mode: TagsResponseMode = validModes.includes(modeParam as TagsResponseMode) 
      ? (modeParam as TagsResponseMode) 
      : TAGS_RESPONSE_MODES.SUMMARY;
    
    // Parse pagination parameters
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT) : TagsHandler.DEFAULT_LIMIT;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const isPaginationRequested = limitParam !== null || offsetParam !== null;
    
    const client = this.getObsidianClient(server);
    
    try {
      const tags = await client.getAllTags();
      
      if (mode === TAGS_RESPONSE_MODES.FULL) {
        return this.buildFullModeResponse(tags, limit, offset, isPaginationRequested);
      }
      
      // Return summary mode (default)
      if (tags.length === 0) {
        return {
          mode: 'summary',
          totalTags: 0,
          topTags: [],
          usageStats: {
            totalUsages: 0,
            averageUsage: 0,
            medianUsage: 0
          },
          message: 'No tags found in vault'
        };
      }
      
      // Calculate usage statistics
      const totalUsages = tags.reduce((sum, tag) => sum + tag.count, 0);
      const averageUsage = Math.round((totalUsages / tags.length) * 10) / 10;
      
      // Calculate median usage
      const sortedCounts = tags.map(tag => tag.count).sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedCounts.length / 2);
      const medianUsage = sortedCounts.length % 2 === 0
        ? (sortedCounts[medianIndex - 1] + sortedCounts[medianIndex]) / 2
        : sortedCounts[medianIndex];
      
      // Get top 5 tags by usage count
      const topTags = [...tags]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      return {
        mode: 'summary',
        totalTags: tags.length,
        topTags: topTags,
        usageStats: {
          totalUsages,
          averageUsage,
          medianUsage
        },
        message: 'Use ?mode=full for complete tag list'
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Tags');
    }
  }
  
  private buildFullModeResponse(tags: Array<{ name: string; count: number }>, limit: number, offset: number, isPaginationRequested: boolean): TagsFullResponse {
    // Sort tags by usage frequency (descending) for better UX
    const sortedTags = [...tags].sort((a, b) => b.count - a.count);
    
    if (!isPaginationRequested) {
      // Return all tags without pagination (backward compatibility)
      return {
        mode: 'full',
        tags: sortedTags,
        totalTags: tags.length
      };
    }
    
    // Apply pagination
    const totalItems = tags.length;
    const paginatedTags = sortedTags.slice(offset, offset + limit);
    const hasMore = offset + limit < totalItems;
    
    // Calculate usage statistics for pagination metadata
    const totalUsages = tags.reduce((sum, tag) => sum + tag.count, 0);
    const averageUsage = totalUsages / tags.length;
    
    // Calculate median usage
    const sortedCounts = tags.map(tag => tag.count).sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedCounts.length / 2);
    const medianUsage = sortedCounts.length % 2 === 0
      ? (sortedCounts[medianIndex - 1] + sortedCounts[medianIndex]) / 2
      : sortedCounts[medianIndex];
    
    return {
      mode: 'full',
      tags: paginatedTags,
      totalTags: tags.length,
      pagination: {
        totalItems,
        hasMore,
        limit,
        offset,
        nextOffset: hasMore ? offset + limit : undefined,
        usageStats: {
          totalUsages,
          averageUsage: Math.round(averageUsage * 10) / 10,
          medianUsage
        }
      }
    };
  }
}

export class StatsHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const client = this.getObsidianClient(server);
    
    try {
      const files = await client.listFilesInVault();
      const fileCount = files.length;
      // Count .md files as notes
      const noteCount = files.filter(file => file.endsWith('.md')).length;
      
      return {
        fileCount,
        noteCount
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Vault statistics');
    }
  }
}

// RecentHandler moved to RecentChangesHandler.ts for better organization
export { RecentChangesHandler as RecentHandler } from './RecentChangesHandler.js';

export class NoteHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    // Parse query parameters for mode first
    const url = new URL(uri, 'vault://');
    const modeParam = url.searchParams.get('mode') || 'preview';
    
    // Extract path without query parameters
    const uriWithoutQuery = uri.split('?')[0];
    const path = this.extractPath(uriWithoutQuery, 'vault://note/');
    const client = this.getObsidianClient(server);
    
    // Validate mode parameter (default to preview for invalid modes)
    const validModes = ['preview', 'full'];
    const mode = validModes.includes(modeParam) ? modeParam : 'preview';
    
    try {
      const content = await client.getFileContents(path);
      
      if (mode === 'full') {
        // Return full content as markdown text (backward compatibility)
        return content;
      } else {
        // Return preview mode as JSON with frontmatter, preview, and statistics
        const { NoteContentProcessor } = await import('../utils/NoteContentProcessor.js');
        return NoteContentProcessor.processForPreview(content as string);
      }
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Note', path);
    }
  }
}

/**
 * Response modes for vault://folder/{path} resource
 * 
 * - summary: Default mode. Returns file/folder counts and metadata without content listings (optimal performance)
 * - full: Returns complete file listings (backward compatibility mode)
 * 
 * Usage:
 * - vault://folder/path (defaults to summary)
 * - vault://folder/path?mode=summary
 * - vault://folder/path?mode=full
 */
type FolderResponseMode = 'summary' | 'full';

const FOLDER_RESPONSE_MODES: Record<string, FolderResponseMode> = {
  SUMMARY: 'summary',
  FULL: 'full'
} as const;

interface PaginationInfo {
  totalItems: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  nextOffset?: number;
}

interface FolderSummaryResponse {
  path: string;
  mode: 'summary';
  fileCount: number;
  files: string[];  // Empty in summary mode unless pagination requested
  folders: string[];
  message: string;
  pagination?: PaginationInfo;
}

interface FolderFullResponse {
  path: string;
  mode: 'full';
  items: string[];
  pagination?: PaginationInfo;
}

type FolderResponse = FolderSummaryResponse | FolderFullResponse;

export class FolderHandler extends BaseResourceHandler {
  private static readonly DEFAULT_LIMIT = 50; // Default limit for folder pagination
  
  async handleRequest(uri: string, server?: any): Promise<FolderResponse> {
    // Parse query parameters for mode and pagination
    const url = new URL(uri, 'vault://');
    const modeParam = url.searchParams.get('mode') || FOLDER_RESPONSE_MODES.SUMMARY;
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    
    // Extract path without query parameters
    const uriWithoutQuery = uri.split('?')[0];
    const path = this.extractPath(uriWithoutQuery, 'vault://folder/');
    const client = this.getObsidianClient(server);
    
    // Validate and set mode (default to summary for invalid modes)
    const validModes: FolderResponseMode[] = Object.values(FOLDER_RESPONSE_MODES);
    const mode: FolderResponseMode = validModes.includes(modeParam as FolderResponseMode) 
      ? (modeParam as FolderResponseMode) 
      : FOLDER_RESPONSE_MODES.SUMMARY;
    
    // Parse pagination parameters
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT) : FolderHandler.DEFAULT_LIMIT;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const isPaginationRequested = limitParam !== null || offsetParam !== null;
    
    try {
      const items = await client.listFilesInDir(path);
      
      if (mode === FOLDER_RESPONSE_MODES.FULL) {
        // Return full mode with pagination support
        return this.buildFullModeResponse(path, items, limit, offset, isPaginationRequested);
      }
      
      // Return summary mode with conditional pagination
      return this.buildSummaryModeResponse(path, items, limit, offset, isPaginationRequested);
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Folder', path);
    }
  }
  
  private buildFullModeResponse(path: string, items: string[], limit: number, offset: number, isPaginationRequested: boolean): FolderFullResponse {
    if (!isPaginationRequested) {
      // Return all items without pagination (backward compatibility)
      return {
        path: path,
        mode: 'full',
        items: items
      };
    }
    
    // Apply pagination
    const totalItems = items.length;
    const paginatedItems = items.slice(offset, offset + limit);
    const hasMore = offset + limit < totalItems;
    
    return {
      path: path,
      mode: 'full',
      items: paginatedItems,
      pagination: {
        totalItems,
        hasMore,
        limit,
        offset,
        nextOffset: hasMore ? offset + limit : undefined
      }
    };
  }
  
  private buildSummaryModeResponse(path: string, items: string[], limit: number, offset: number, isPaginationRequested: boolean): FolderSummaryResponse {
    const { fileCount, folders } = this.analyzeFolderStructure(items, path);
    
    if (!isPaginationRequested) {
      // Return standard summary without file listings (optimal performance)
      return {
        path: path,
        mode: 'summary',
        fileCount: fileCount,
        files: [], // Empty in summary mode
        folders: folders,
        message: 'Use ?mode=full for complete file listings'
      };
    }
    
    // Pagination requested - return paginated file listings in summary mode
    const paginatedItems = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;
    
    return {
      path: path,
      mode: 'summary',
      fileCount: fileCount,
      files: paginatedItems,
      folders: folders,
      message: `Showing ${paginatedItems.length} of ${items.length} files`,
      pagination: {
        totalItems: items.length,
        hasMore,
        limit,
        offset,
        nextOffset: hasMore ? offset + limit : undefined
      }
    };
  }
  
  private analyzeFolderStructure(items: string[], basePath: string): { fileCount: number; folders: string[] } {
    const folders = new Set<string>();
    let fileCount = 0;
    
    // Normalize base path for comparison
    const normalizedBasePath = basePath === '' ? '' : `${basePath}/`;
    
    for (const item of items) {
      let relativePath: string;
      
      // Check if the item is a full path that starts with the base path
      if (normalizedBasePath !== '' && item.startsWith(normalizedBasePath)) {
        relativePath = item.substring(normalizedBasePath.length);
      } else if (normalizedBasePath === '' || !item.includes('/')) {
        // For root folder or simple filenames (like in some tests)
        relativePath = item;
      } else {
        // Skip items that don't belong to this folder
        continue;
      }
      
      // If there's a slash in the relative path, it's in a subdirectory
      const slashIndex = relativePath.indexOf('/');
      if (slashIndex === -1) {
        // Direct file in this folder
        fileCount++;
      } else {
        // File in a subdirectory, record the folder name
        const folderName = relativePath.substring(0, slashIndex);
        folders.add(folderName);
      }
    }
    
    return {
      fileCount,
      folders: Array.from(folders).sort()
    };
  }
}

export class NotesHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const client = this.getObsidianClient(server);
    
    try {
      // Get all files in the vault
      const files = await client.listFilesInVault();
      
      // Filter to only markdown files (notes)
      const notes = files
        .filter(file => file.endsWith('.md'))
        .map(path => ({
          path,
          name: path.split('/').pop()?.replace('.md', '') || path
        }));
      
      return {
        count: notes.length,
        notes
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Notes list');
    }
  }
}