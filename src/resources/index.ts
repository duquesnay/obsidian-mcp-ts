/**
 * MCP Resources for Obsidian
 * 
 * This module provides read-only access to Obsidian vault data through the 
 * Model Context Protocol (MCP) resources system. Resources are cached for 
 * performance and provide a standardized way for AI assistants to access 
 * vault information.
 * 
 * Available resources:
 * - Static: vault://tags, vault://stats, vault://recent, vault://structure
 * - Dynamic: vault://note/{path}, vault://folder/{path}, vault://daily/{date},
 *            vault://tag/{tagname}, vault://search/{query}
 * 
 * @see {@link https://github.com/yourusername/obsidian-mcp-ts/blob/main/docs/RESOURCES.md}
 * @module resources
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListResourceTemplatesRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { ResourceRegistry } from './ResourceRegistry.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { 
  createCachedTagsHandler, 
  createCachedStatsHandler, 
  createCachedRecentHandler, 
  createCachedNoteHandler, 
  createCachedFolderHandler, 
  createCachedDailyNoteHandler, 
  createCachedTagNotesHandler, 
  createCachedVaultStructureHandler,
  createCachedSearchHandler,
  getAllCacheStats,
  clearAllCaches,
  resetAllCacheStats
} from './cachedHandlers.js';
import { createTagsHandler, createStatsHandler, createRecentHandler, createNoteHandler, createFolderHandler, createDailyNoteHandler, createTagNotesHandler, createVaultStructureHandler, createSearchHandler } from './handlers.js';

// Extend Server type to include obsidianClient for testing
interface ServerWithClient extends Server {
  obsidianClient?: ObsidianClient;
  resourceRegistry?: ResourceRegistry;
}

/**
 * Register cached resources for improved performance
 * Uses intelligent caching with resource-specific TTLs
 */
export async function registerResources(server: ServerWithClient): Promise<void> {
  // Create resource registry (or use provided one for testing)
  const registry = server.resourceRegistry || new ResourceRegistry();
  
  // Register static resources with caching
  registry.registerResource({
    uri: 'vault://tags',
    name: 'Vault Tags',
    description: 'All tags in the vault with usage counts (cached 5min). Returns summary with top tags and usage stats by default. Use ?mode=full for complete tag list.',
    mimeType: 'application/json'
  }, createCachedTagsHandler());
  
  registry.registerResource({
    uri: 'vault://stats',
    name: 'Vault Statistics',
    description: 'File and note counts for the vault (cached 5min)',
    mimeType: 'application/json'
  }, createCachedStatsHandler());
  
  registry.registerResource({
    uri: 'vault://recent',
    name: 'Recent Changes',
    description: 'Recently modified notes in the vault (cached 30s)',
    mimeType: 'application/json'
  }, createCachedRecentHandler());
  
  registry.registerResource({
    uri: 'vault://structure',
    name: 'Vault Structure',
    description: 'Complete hierarchical structure of the vault with folders and files (cached 5min)',
    mimeType: 'application/json'
  }, createCachedVaultStructureHandler());
  
  // Register dynamic resources with caching
  registry.registerResource({
    uri: 'vault://note/{path}',
    name: 'Note',
    description: 'Individual note by path (cached 2min per note) - e.g., vault://note/Daily/2024-01-01.md',
    mimeType: 'text/markdown'
  }, createCachedNoteHandler());
  
  registry.registerResource({
    uri: 'vault://folder/{path}',
    name: 'Folder',
    description: 'Browse folder contents (cached 2min per folder) - e.g., vault://folder/Projects. Returns summary by default, use ?mode=full for complete listings.',
    mimeType: 'application/json'
  }, createCachedFolderHandler());
  
  registry.registerResource({
    uri: 'vault://daily/{date}',
    name: 'Daily Note',
    description: 'Access daily notes by date (cached 2min per date) - e.g., vault://daily/2024-01-15 or vault://daily/today',
    mimeType: 'text/markdown'
  }, createCachedDailyNoteHandler());
  
  registry.registerResource({
    uri: 'vault://tag/{tagname}',
    name: 'Notes by Tag',
    description: 'Find all notes with a specific tag (cached 2min per tag) - e.g., vault://tag/project or vault://tag/meeting',
    mimeType: 'application/json'
  }, createCachedTagNotesHandler());
  
  registry.registerResource({
    uri: 'vault://search/{query}',
    name: 'Search Results',
    description: 'Search vault for content (cached 1min per query) - e.g., vault://search/meeting%20notes or vault://search/TODO',
    mimeType: 'application/json'
  }, createCachedSearchHandler());
  
  // Register resource templates for discovery
  registry.registerResourceTemplate({
    name: 'Note',
    uriTemplate: 'vault://note/{path}',
    description: 'Individual note by path - e.g., vault://note/Daily/2024-01-01.md or vault://note/Projects/myproject.md. The path parameter can include nested folders and must include the .md extension.',
    mimeType: 'text/markdown'
  });
  
  registry.registerResourceTemplate({
    name: 'Folder',
    uriTemplate: 'vault://folder/{path}',
    description: 'Browse folder contents - e.g., vault://folder/Projects or vault://folder/Daily. Returns summary with file counts and folder lists by default. Use ?mode=full for complete file listings.',
    mimeType: 'application/json'
  });
  
  registry.registerResourceTemplate({
    name: 'Daily Note',
    uriTemplate: 'vault://daily/{date}',
    description: 'Access daily notes by date - e.g., vault://daily/2024-01-15, vault://daily/today, or vault://daily/yesterday. Supports ISO date format (YYYY-MM-DD) and relative date keywords.',
    mimeType: 'text/markdown'
  });
  
  registry.registerResourceTemplate({
    name: 'Notes by Tag',
    uriTemplate: 'vault://tag/{tagname}',
    description: 'Find all notes with a specific tag - e.g., vault://tag/project, vault://tag/meeting, or vault://tag/todo. Returns list of notes containing the specified tag.',
    mimeType: 'application/json'
  });
  
  registry.registerResourceTemplate({
    name: 'Search Results',
    uriTemplate: 'vault://search/{query}',
    description: 'Search vault for content - e.g., vault://search/meeting%20notes, vault://search/TODO, or vault://search/project%20roadmap. Returns search results with context snippets. Use URL encoding for queries with spaces.',
    mimeType: 'application/json'
  });
  
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
      ResourceErrorHandler.handleNotFound('Resource', uri);
    }
    
    // Call the handler with the URI and server context
    return await handler(uri, server);
  });

  // Set up ListResourceTemplatesRequestSchema handler
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return { resourceTemplates: registry.listResourceTemplates() };
  });
}

/**
 * Register uncached resources (for comparison or when caching is not desired)
 */
export async function registerUncachedResources(server: ServerWithClient): Promise<void> {
  // Create resource registry (or use provided one for testing)
  const registry = server.resourceRegistry || new ResourceRegistry();
  
  // Register static resources without caching
  registry.registerResource({
    uri: 'vault://tags',
    name: 'Tags',
    description: 'All tags in the vault with usage counts. Returns summary with top tags and usage stats by default. Use ?mode=full for complete tag list.',
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
  
  registry.registerResource({
    uri: 'vault://structure',
    name: 'Vault Structure',
    description: 'Complete hierarchical structure of the vault with folders and files',
    mimeType: 'application/json'
  }, createVaultStructureHandler());
  
  // Register dynamic resources without caching
  registry.registerResource({
    uri: 'vault://note/{path}',
    name: 'Note',
    description: 'Individual note by path (e.g., vault://note/Daily/2024-01-01.md)',
    mimeType: 'text/markdown'
  }, createNoteHandler());
  
  registry.registerResource({
    uri: 'vault://folder/{path}',
    name: 'Folder',
    description: 'Browse folder contents (e.g., vault://folder/Projects). Returns summary by default, use ?mode=full for complete listings.',
    mimeType: 'application/json'
  }, createFolderHandler());
  
  registry.registerResource({
    uri: 'vault://daily/{date}',
    name: 'Daily Note',
    description: 'Access daily notes by date (e.g., vault://daily/2024-01-15 or vault://daily/today)',
    mimeType: 'text/markdown'
  }, createDailyNoteHandler());
  
  registry.registerResource({
    uri: 'vault://tag/{tagname}',
    name: 'Notes by Tag',
    description: 'Find all notes with a specific tag (e.g., vault://tag/project or vault://tag/meeting)',
    mimeType: 'application/json'
  }, createTagNotesHandler());
  
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
      ResourceErrorHandler.handleNotFound('Resource', uri);
    }
    
    // Call the handler with the URI and server context
    return await handler(uri, server);
  });
}

// Export cache utility functions
export { getAllCacheStats, clearAllCaches, resetAllCacheStats };