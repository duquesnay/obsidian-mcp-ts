import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';

export class TagsHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const client = this.getObsidianClient(server);
    
    try {
      const tags = await client.getAllTags();
      return { tags };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Tags');
    }
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

interface FolderSummaryResponse {
  path: string;
  mode: 'summary';
  fileCount: number;
  files: string[];  // Empty in summary mode
  folders: string[];
  message: string;
}

interface FolderFullResponse {
  path: string;
  mode: 'full';
  items: string[];
}

type FolderResponse = FolderSummaryResponse | FolderFullResponse;

export class FolderHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<FolderResponse> {
    // Parse query parameters for mode
    const url = new URL(uri, 'vault://');
    const modeParam = url.searchParams.get('mode') || FOLDER_RESPONSE_MODES.SUMMARY;
    
    // Extract path without query parameters
    const uriWithoutQuery = uri.split('?')[0];
    const path = this.extractPath(uriWithoutQuery, 'vault://folder/');
    const client = this.getObsidianClient(server);
    
    // Validate and set mode (default to summary for invalid modes)
    const validModes: FolderResponseMode[] = Object.values(FOLDER_RESPONSE_MODES);
    const mode: FolderResponseMode = validModes.includes(modeParam as FolderResponseMode) 
      ? (modeParam as FolderResponseMode) 
      : FOLDER_RESPONSE_MODES.SUMMARY;
    
    try {
      const items = await client.listFilesInDir(path);
      
      if (mode === FOLDER_RESPONSE_MODES.FULL) {
        // Return full mode (backward compatibility)
        return {
          path: path,
          mode: 'full',
          items: items
        };
      }
      
      // Return summary mode (default)
      const { fileCount, folders } = this.analyzeFolderStructure(items, path);
      
      return {
        path: path,
        mode: 'summary',
        fileCount: fileCount,
        files: [], // Empty in summary mode
        folders: folders,
        message: 'Use ?mode=full for complete file listings'
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Folder', path);
    }
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