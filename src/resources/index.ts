import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export async function registerResources(server: Server): Promise<void> {
  // Register ListResources handler that returns empty array
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });
}