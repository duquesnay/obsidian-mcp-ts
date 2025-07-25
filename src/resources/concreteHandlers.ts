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

export class RecentHandler extends BaseResourceHandler {
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
      
      return { notes };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Recent notes');
    }
  }
}

export class NoteHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const path = this.extractPath(uri, 'vault://note/');
    const client = this.getObsidianClient(server);
    
    try {
      return await client.getFileContents(path);
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