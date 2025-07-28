import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';

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
}

interface PaginationInfo {
  totalNotes: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  nextOffset?: number;
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
      // Parse query parameters
      const url = new URL(uri, 'vault://');
      const modeParam = url.searchParams.get('mode') || RESPONSE_MODES.PREVIEW;
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      
      // Validate and set mode (default to preview for invalid modes)
      const validModes: ResponseMode[] = Object.values(RESPONSE_MODES);
      const mode: ResponseMode = validModes.includes(modeParam as ResponseMode) 
        ? (modeParam as ResponseMode) 
        : RESPONSE_MODES.PREVIEW;
      
      // Parse pagination parameters
      const limit = limitParam ? parseInt(limitParam, 10) : RecentChangesHandler.DEFAULT_LIMIT;
      const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
      
      // Get recent changes from the client, using a higher limit to ensure we have enough data
      // TODO: In a real implementation, we would need to get more data from the API
      const maxFetchLimit = Math.max(
        limit + offset + RecentChangesHandler.PAGINATION_BUFFER, 
        RecentChangesHandler.MIN_FETCH_LIMIT
      );
      const recentChanges = await client.getRecentChanges(undefined, maxFetchLimit);
      
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
        
        return note;
      });
      
      // Apply pagination and build response
      return this.buildPaginatedResponse(allNotes, mode, limit, offset, limitParam, offsetParam);
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Recent notes');
    }
  }
  
  private buildPaginatedResponse(
    allNotes: RecentNote[], 
    mode: ResponseMode, 
    limit: number, 
    offset: number,
    limitParam: string | null,
    offsetParam: string | null
  ): RecentChangesResponse {
    // Apply pagination
    const totalNotes = allNotes.length;
    const paginatedNotes = allNotes.slice(offset, offset + limit);
    const hasMore = offset + limit < totalNotes;
    
    // Check if pagination is requested or needed
    const isPaginationRequested = limitParam !== null || offsetParam !== null;
    const needsPagination = isPaginationRequested || totalNotes > RecentChangesHandler.DEFAULT_LIMIT;
    
    // Build response
    const response: RecentChangesResponse = { notes: paginatedNotes, mode };
    
    if (needsPagination && (hasMore || offset > 0)) {
      response.pagination = {
        totalNotes,
        hasMore,
        limit,
        offset,
        nextOffset: hasMore ? offset + limit : undefined,
        continuationToken: hasMore && paginatedNotes.length > 0 
          ? new Date(paginatedNotes[paginatedNotes.length - 1].modifiedAt).getTime().toString()
          : undefined
      };
    }
    
    return response;
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