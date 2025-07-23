import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export async function registerResources(server: Server): Promise<void> {
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
        }
      ] 
    };
  });

  // Register ReadResource handler for vault://tags and vault://stats
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
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
    
    throw new Error(`Resource not found: ${uri}`);
  });
}