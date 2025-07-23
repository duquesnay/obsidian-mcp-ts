import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export async function registerResources(server: Server): Promise<void> {
  // Register ListResources handler with hardcoded tags resource
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { 
      resources: [
        {
          uri: 'vault://tags',
          name: 'Vault Tags',
          description: 'All tags in the vault with usage counts',
          mimeType: 'application/json'
        }
      ] 
    };
  });
}