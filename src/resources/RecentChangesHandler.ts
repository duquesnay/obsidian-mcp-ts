import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';

/**
 * Response modes for vault://recent resource
 * 
 * - preview: Default mode. Returns titles and first 100 characters preview with modification dates
 * - full: Returns complete content with titles and modification dates
 * 
 * Usage:
 * - vault://recent (defaults to preview)
 * - vault://recent?mode=preview  
 * - vault://recent?mode=full
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

interface RecentChangesResponse {
  notes: RecentNote[];
  mode: ResponseMode;
}

export class RecentChangesHandler extends BaseResourceHandler {
  private static readonly PREVIEW_LENGTH = 100;
  
  async handleRequest(uri: string, server?: any): Promise<RecentChangesResponse> {
    const client = this.getObsidianClient(server);
    
    try {
      // Parse query parameters for mode
      const url = new URL(uri, 'vault://');
      const modeParam = url.searchParams.get('mode') || RESPONSE_MODES.PREVIEW;
      
      // Validate and set mode (default to preview for invalid modes)
      const validModes: ResponseMode[] = Object.values(RESPONSE_MODES);
      const mode: ResponseMode = validModes.includes(modeParam as ResponseMode) 
        ? (modeParam as ResponseMode) 
        : RESPONSE_MODES.PREVIEW;
      
      // Get recent changes from the client, limiting to 10 files
      const recentChanges = await client.getRecentChanges(undefined, 10);
      
      // Transform to match expected format
      const notes: RecentNote[] = recentChanges.map(change => {
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
      
      return { notes, mode };
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