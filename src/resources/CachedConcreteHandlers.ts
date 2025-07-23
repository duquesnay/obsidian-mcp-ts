import { CachedResourceHandler } from './CachedResourceHandler.js';
import { CACHE_DEFAULTS } from '../constants.js';

interface FolderStructure {
  files: string[];
  folders: { [key: string]: FolderStructure };
}

interface VaultStructureResponse {
  structure: FolderStructure;
  totalFiles: number;
  totalFolders: number;
}

/**
 * Cached Tags Handler - uses stable TTL for tags that don't change frequently
 */
export class CachedTagsHandler extends CachedResourceHandler {
  private lastWasFallback = false;
  
  constructor() {
    super(CACHE_DEFAULTS.MAX_SIZE, CACHE_DEFAULTS.STABLE_TTL);
  }
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    const client = this.getObsidianClient(server);
    
    try {
      const tags = await client.getAllTags();
      this.lastWasFallback = false;
      return { tags };
    } catch (error: any) {
      // If the API call fails, return an empty array as fallback
      console.error('Failed to fetch tags:', error);
      this.lastWasFallback = true;
      return { tags: [] };
    }
  }
  
  protected shouldCache(result: any, uri: string): boolean {
    // Don't cache fallback responses (empty arrays due to errors)
    return !this.lastWasFallback;
  }
}

/**
 * Cached Stats Handler - uses stable TTL for vault statistics
 */
export class CachedStatsHandler extends CachedResourceHandler {
  private lastWasFallback = false;
  
  constructor() {
    super(CACHE_DEFAULTS.MAX_SIZE, CACHE_DEFAULTS.STABLE_TTL);
  }
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    const client = this.getObsidianClient(server);
    
    try {
      const files = await client.listFilesInVault();
      const fileCount = files.length;
      // Count .md files as notes
      const noteCount = files.filter(file => file.endsWith('.md')).length;
      
      this.lastWasFallback = false;
      return {
        fileCount,
        noteCount
      };
    } catch (error: any) {
      console.error('Failed to fetch vault statistics:', error);
      this.lastWasFallback = true;
      return {
        fileCount: 0,
        noteCount: 0
      };
    }
  }
  
  protected shouldCache(result: any, uri: string): boolean {
    // Don't cache fallback responses (zero counts due to errors)
    return !this.lastWasFallback;
  }
}

/**
 * Cached Recent Handler - uses fast TTL for frequently changing recent files
 */
export class CachedRecentHandler extends CachedResourceHandler {
  private lastWasFallback = false;
  
  constructor() {
    super(CACHE_DEFAULTS.MAX_SIZE, CACHE_DEFAULTS.FAST_TTL);
  }
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    const client = this.getObsidianClient(server);
    
    try {
      // Use the getRecentChanges method, limiting to 10 files
      const recentChanges = await client.getRecentChanges(undefined, 10);
      
      // Transform to match expected format
      // Note: Actual modification times are not available from the API
      const notes = recentChanges.map(change => ({
        path: change.path,
        modifiedAt: new Date(change.mtime).toISOString()
      }));
      
      this.lastWasFallback = false;
      return { notes };
    } catch (error: any) {
      console.error('Failed to fetch recent changes:', error);
      this.lastWasFallback = true;
      return { notes: [] };
    }
  }
  
  protected shouldCache(result: any, uri: string): boolean {
    // Don't cache fallback responses (empty arrays due to errors)
    return !this.lastWasFallback;
  }
}

/**
 * Cached Note Handler - uses note TTL for individual note caching
 */
export class CachedNoteHandler extends CachedResourceHandler {
  constructor() {
    super(CACHE_DEFAULTS.MAX_SIZE, CACHE_DEFAULTS.NOTE_TTL);
  }
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    const path = this.extractPath(uri, 'vault://note/');
    const client = this.getObsidianClient(server);
    
    try {
      return await client.getFileContents(path);
    } catch (error: any) {
      this.handleError(error, 'Note', path);
    }
  }
}

/**
 * Cached Folder Handler - uses stable TTL for folder listings
 */
export class CachedFolderHandler extends CachedResourceHandler {
  constructor() {
    super(CACHE_DEFAULTS.MAX_SIZE, CACHE_DEFAULTS.STABLE_TTL);
  }
  
  async handleRequest(uri: string, server?: any): Promise<any> {
    const path = this.extractPath(uri, 'vault://folder/');
    const client = this.getObsidianClient(server);
    
    try {
      const items = await client.listFilesInDir(path);
      return {
        path: path,
        items: items
      };
    } catch (error: any) {
      this.handleError(error, 'Folder', path);
    }
  }
}