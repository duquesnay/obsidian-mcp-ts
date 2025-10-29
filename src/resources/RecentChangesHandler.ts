import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceMetadataUtil } from '../utils/ResourceMetadataUtil.js';

/**
 * Response modes and pagination for vault://recent resource
 * 
 * Response modes:
 * - preview: Default mode. Returns titles and first 100 characters preview with modification dates
 * - full: Returns complete content with titles and modification dates
 * 
 * Pagination parameters:
 * - limit: Number of items per page (default: 20, max: 1000)
 * - offset: Number of items to skip (default: 0)
 * 
 * Usage:
 * - vault://recent (defaults to preview mode, limit=20, offset=0)
 * - vault://recent?mode=preview&limit=10
 * - vault://recent?mode=full&limit=5&offset=10
 * - vault://recent?limit=50&offset=20
 */
type ResponseMode = 'preview' | 'full';

const RESPONSE_MODES: Record<string, ResponseMode> = {
  PREVIEW: 'preview',
  FULL: 'full'
} as const;

interface RecentNote {
  path: string;
  title: string;
  modifiedAt: string;
  preview?: string;
  content?: string;
  _meta?: {
    size: number;
    sizeFormatted: string;
    lastModified: string;
  };
}

interface PaginationInfo {
  totalItems: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  nextOffset?: number;
  previousOffset?: number;
  currentPage: number;
  totalPages: number;
  continuationToken?: string;
}

interface RecentChangesResponse {
  notes: RecentNote[];
  mode: ResponseMode;
  pagination?: PaginationInfo;
}

export class RecentChangesHandler extends BaseResourceHandler {
  private static readonly PREVIEW_LENGTH = 100;
  private static readonly DEFAULT_LIMIT = 20; // Default limit for recent items per page
  private static readonly PAGINATION_BUFFER = 50; // Extra items to fetch for pagination
  private static readonly MIN_FETCH_LIMIT = 100; // Minimum items to fetch from API
  
  async handleRequest(uri: string, server?: any): Promise<RecentChangesResponse> {
    const client = this.getObsidianClient(server);
    
    try {
      // Parse query parameters using shared pagination system
      const paginationParams = this.extractPaginationParameters(uri, { 
        defaultLimit: RecentChangesHandler.DEFAULT_LIMIT 
      });
      
      // Parse response mode
      const url = new URL(uri, 'vault://');
      const modeParam = url.searchParams.get('mode') || RESPONSE_MODES.PREVIEW;
      
      // Validate and set mode (default to preview for invalid modes)
      const validModes: ResponseMode[] = Object.values(RESPONSE_MODES);
      const mode: ResponseMode = validModes.includes(modeParam as ResponseMode) 
        ? (modeParam as ResponseMode) 
        : RESPONSE_MODES.PREVIEW;
      
      // Get recent changes from the client, using a higher limit to ensure we have enough data
      const maxFetchLimit = Math.max(
        paginationParams.limit + paginationParams.offset + RecentChangesHandler.PAGINATION_BUFFER,
        RecentChangesHandler.MIN_FETCH_LIMIT
      );
      const recentChanges = await client.getRecentChanges(undefined, maxFetchLimit);

      // Extract unique file paths for metadata fetching
      // Filter out directories and system files that won't have metadata
      const filePaths = recentChanges
        .map(change => change.path)
        .filter(path => {
          // Skip directories (ending with /)
          if (path.endsWith('/')) return false;
          // Skip system files
          if (path === '.DS_Store' || path.startsWith('.') && path.includes('/')) return false;
          return true;
        });

      // Batch fetch metadata for all files
      const metadataMap = await ResourceMetadataUtil.batchFetchMetadata(client, filePaths);

      // Transform all available data to match expected format
      const allNotes: RecentNote[] = recentChanges.map(change => {
        const note: RecentNote = {
          path: change.path,
          title: this.extractTitle(change.path),
          modifiedAt: new Date(change.mtime).toISOString()
        };

        if (mode === RESPONSE_MODES.PREVIEW) {
          note.preview = this.createPreview(change.content);
        } else if (mode === RESPONSE_MODES.FULL) {
          note.content = change.content;
        }

        // Add metadata if available
        const metadata = metadataMap.get(change.path);
        if (metadata) {
          note._meta = metadata;
        }

        return note;
      });
      
      // Use shared pagination system
      const paginatedData = this.applyPagination(allNotes, paginationParams);
      const paginationMetadata = this.generatePaginationMetadata(paginationParams, allNotes.length);
      
      // Build response with standardized pagination
      const response: RecentChangesResponse = {
        notes: paginatedData,
        mode
      };
      
      // Add pagination metadata if requested or needed
      const isPaginationRequested = this.isPaginationRequested(paginationParams);
      if (isPaginationRequested || allNotes.length > RecentChangesHandler.DEFAULT_LIMIT) {
        response.pagination = {
          ...paginationMetadata,
          totalItems: paginationMetadata.totalItems,
          // Add continuation token for last item in current page
          continuationToken: paginatedData.length > 0 
            ? new Date(paginatedData[paginatedData.length - 1].modifiedAt).getTime().toString()
            : undefined
        };
      }
      
      return response;
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Recent notes');
    }
  }
  
  private extractTitle(path: string): string {
    const fileName = path.split('/').pop() || path;
    return fileName.replace(/\.md$/, '');
  }
  
  private createPreview(content: string | undefined): string {
    if (!content) return '';
    
    if (content.length <= RecentChangesHandler.PREVIEW_LENGTH) {
      return content;
    }
    
    return content.substring(0, RecentChangesHandler.PREVIEW_LENGTH) + '...';
  }
}