import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ResourceRegistry } from './ResourceRegistry.js';
import { createTagsHandler, createStatsHandler, createRecentHandler, createNoteHandler, createFolderHandler, createDailyNoteHandler } from './handlers.js';

// Extend Server type to include obsidianClient for testing
interface ServerWithClient extends Server {
  obsidianClient?: ObsidianClient;
  resourceRegistry?: ResourceRegistry;
}

export async function registerResources(server: ServerWithClient): Promise<void> {
  // Create resource registry (or use provided one for testing)
  const registry = server.resourceRegistry || new ResourceRegistry();
  
  // Register static resources
  registry.registerResource({
    uri: 'vault://tags',
    name: 'Vault Tags',
    description: 'All tags in the vault with usage counts',
    mimeType: 'application/json'
  }, createTagsHandler());
  
  registry.registerResource({
    uri: 'vault://stats',
    name: 'Vault Statistics',
    description: 'File and note counts for the vault',
    mimeType: 'application/json'
  }, createStatsHandler());
  
  registry.registerResource({
    uri: 'vault://recent',
    name: 'Recent Changes',
    description: 'Recently modified notes in the vault',
    mimeType: 'application/json'
  }, createRecentHandler());
  
  // Register dynamic resources
  registry.registerResource({
    uri: 'vault://note/{path}',
    name: 'Note',
    description: 'Individual note by path (e.g., vault://note/Daily/2024-01-01.md)',
    mimeType: 'text/markdown'
  }, createNoteHandler());
  
  registry.registerResource({
    uri: 'vault://folder/{path}',
    name: 'Folder',
    description: 'Browse folder contents (e.g., vault://folder/Projects)',
    mimeType: 'application/json'
  }, createFolderHandler());
  
  registry.registerResource({
    uri: 'vault://daily/{date}',
    name: 'Daily Note',
    description: 'Access daily notes by date (e.g., vault://daily/2024-01-15 or vault://daily/today)',
    mimeType: 'text/markdown'
  }, createDailyNoteHandler());
  
  // Set up ListResources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: registry.listResources() };
  });

  // Set up ReadResource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    // Look up handler in registry
    const handler = registry.getHandler(uri);
    if (!handler) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    // Call the handler with the URI and server context
    return await handler(uri, server);
  });
}