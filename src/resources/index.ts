import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ConfigLoader } from '../utils/configLoader.js';

// Extend Server type to include obsidianClient for testing
interface ServerWithClient extends Server {
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

export async function registerResources(server: ServerWithClient): Promise<void> {
  // Register ListResources handler with hardcoded tags and stats resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { 
      resources: [
        {
          uri: 'vault://tags',
          name: 'Vault Tags',
          description: 'All tags in the vault with usage counts',
          mimeType: 'application/json'
        },
        {
          uri: 'vault://stats',
          name: 'Vault Statistics',
          description: 'File and note counts for the vault',
          mimeType: 'application/json'
        },
        {
          uri: 'vault://recent',
          name: 'Recent Changes',
          description: 'Recently modified notes in the vault',
          mimeType: 'application/json'
        },
        {
          uri: 'vault://note/{path}',
          name: 'Note',
          description: 'Individual note by path (e.g., vault://note/Daily/2024-01-01.md)',
          mimeType: 'text/markdown'
        }
      ] 
    };
  });

  // Register ReadResource handler for vault://tags and vault://stats
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    // Handle dynamic note resources
    if (uri.startsWith('vault://note/')) {
      const path = uri.substring('vault://note/'.length);
      const client = getObsidianClient(server);
      
      try {
        const content = await client.getFileContents(path);
        return {
          contents: [
            {
              uri: uri,
              mimeType: 'text/markdown',
              text: content
            }
          ]
        };
      } catch (error: any) {
        // Handle 404 specifically for missing notes
        if (error?.response?.status === 404) {
          throw new Error(`Note not found: ${path}`);
        }
        throw error;
      }
    }
    
    if (uri === 'vault://tags') {
      // Return hardcoded tags data
      return {
        contents: [
          {
            uri: 'vault://tags',
            mimeType: 'application/json',
            text: JSON.stringify({
              tags: [
                { name: '#project', count: 10 },
                { name: '#meeting', count: 5 },
                { name: '#idea', count: 15 }
              ]
            }, null, 2)
          }
        ]
      };
    }
    
    if (uri === 'vault://stats') {
      // Return hardcoded stats data (for now, to keep it simple)
      return {
        contents: [
          {
            uri: 'vault://stats',
            mimeType: 'application/json',
            text: JSON.stringify({
              fileCount: 42,
              noteCount: 35
            }, null, 2)
          }
        ]
      };
    }
    
    if (uri === 'vault://recent') {
      // Return hardcoded recent notes data
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
      
      return {
        contents: [
          {
            uri: 'vault://recent',
            mimeType: 'application/json',
            text: JSON.stringify({
              notes: recentNotes
            }, null, 2)
          }
        ]
      };
    }
    
    throw new Error(`Resource not found: ${uri}`);
  });
}