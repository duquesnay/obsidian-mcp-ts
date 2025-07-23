import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { ResourceHandler } from './types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';

// Extend Server type to include obsidianClient for testing
interface ServerWithClient {
  obsidianClient?: ObsidianClient;
}

// Helper to get ObsidianClient
function getObsidianClient(server: ServerWithClient): ObsidianClient {
  // For testing, use the provided client
  if (server.obsidianClient) {
    return server.obsidianClient;
  }
  
  // For production, create a new client
  const configLoader = ConfigLoader.getInstance();
  return new ObsidianClient({
    apiKey: configLoader.getApiKey(),
    host: configLoader.getHost(),
    verifySsl: false  // Disable SSL verification for self-signed Obsidian certificates
  });
}

// Helper to format JSON response
function formatJsonResponse(uri: string, data: any): ReadResourceResult {
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2)
    }]
  };
}

// Helper to format text response
function formatTextResponse(uri: string, text: string, mimeType: string = 'text/markdown'): ReadResourceResult {
  return {
    contents: [{
      uri,
      mimeType,
      text
    }]
  };
}

export function createTagsHandler(): ResourceHandler {
  return async (uri: string) => {
    // Return hardcoded tags data
    return formatJsonResponse(uri, {
      tags: [
        { name: '#project', count: 10 },
        { name: '#meeting', count: 5 },
        { name: '#idea', count: 15 }
      ]
    });
  };
}

export function createStatsHandler(): ResourceHandler {
  return async (uri: string) => {
    // Return hardcoded stats data
    return formatJsonResponse(uri, {
      fileCount: 42,
      noteCount: 35
    });
  };
}

export function createRecentHandler(): ResourceHandler {
  return async (uri: string) => {
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
    
    return formatJsonResponse(uri, { notes: recentNotes });
  };
}

export function createNoteHandler(): ResourceHandler {
  return async (uri: string, server?: any) => {
    const path = uri.substring('vault://note/'.length);
    const client = getObsidianClient(server);
    
    try {
      const content = await client.getFileContents(path);
      return formatTextResponse(uri, content);
    } catch (error: any) {
      // Handle 404 specifically for missing notes
      if (error?.response?.status === 404) {
        throw new Error(`Note not found: ${path}`);
      }
      throw error;
    }
  };
}

export function createFolderHandler(): ResourceHandler {
  return async (uri: string, server?: any) => {
    // Extract path after 'vault://folder/', handling edge cases
    let path = '';
    if (uri === 'vault://folder' || uri === 'vault://folder/') {
      // Root folder
      path = '';
    } else {
      path = uri.substring('vault://folder/'.length);
    }
    
    const client = getObsidianClient(server);
    
    try {
      const items = await client.listFilesInDir(path);
      return formatJsonResponse(uri, {
        path: path,
        items: items
      });
    } catch (error: any) {
      // Handle 404 specifically for missing folders
      if (error?.response?.status === 404) {
        throw new Error(`Folder not found: ${path}`);
      }
      throw error;
    }
  };
}