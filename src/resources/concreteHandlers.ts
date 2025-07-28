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

export class FolderHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const path = this.extractPath(uri, 'vault://folder/');
    const client = this.getObsidianClient(server);
    
    try {
      const items = await client.listFilesInDir(path);
      return {
        path: path,
        items: items
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Folder', path);
    }
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