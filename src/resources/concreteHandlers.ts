import { BaseResourceHandler } from './BaseResourceHandler.js';

export class TagsHandler extends BaseResourceHandler {
  async handleRequest(uri: string): Promise<any> {
    // Return hardcoded tags data
    return {
      tags: [
        { name: '#project', count: 10 },
        { name: '#meeting', count: 5 },
        { name: '#idea', count: 15 }
      ]
    };
  }
}

export class StatsHandler extends BaseResourceHandler {
  async handleRequest(uri: string): Promise<any> {
    // Return hardcoded stats data
    return {
      fileCount: 42,
      noteCount: 35
    };
  }
}

export class RecentHandler extends BaseResourceHandler {
  async handleRequest(uri: string): Promise<any> {
    const now = new Date();
    const recentNotes = [
      {
        path: 'Daily Notes/2025-01-23.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString() // 5 minutes ago
      },
      {
        path: 'Projects/MCP Resources.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString() // 30 minutes ago
      },
      {
        path: 'Meeting Notes/Team Standup.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString() // 1 hour ago
      },
      {
        path: 'Ideas/New Feature Proposal.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
      },
      {
        path: 'Research/TypeScript Patterns.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString() // 3 hours ago
      },
      {
        path: 'Daily Notes/2025-01-22.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
      },
      {
        path: 'Projects/Quality Improvements.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString() // 2 days ago
      },
      {
        path: 'Reference/API Documentation.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days ago
      },
      {
        path: 'Archive/Old Project Notes.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7).toISOString() // 1 week ago
      },
      {
        path: 'Templates/Meeting Template.md',
        modifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14).toISOString() // 2 weeks ago
      }
    ];
    
    return { notes: recentNotes };
  }
}

export class NoteHandler extends BaseResourceHandler {
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
    } catch (error: any) {
      this.handleError(error, 'Folder', path);
    }
  }
}