import { ResourceHandler } from './types.js';
import { defaultCachedHandlers, createCachedHandlers } from './CachedConcreteHandlers.js';
import { ResourceCacheConfig } from './CachedResourceHandler.js';

/**
 * Cached resource handlers for improved performance
 * 
 * These factory functions create cached versions of handlers with intelligent TTL settings:
 * - Static resources (tags, stats, structure): 5 minutes
 * - Dynamic resources (recent): 30 seconds
 * - Parameterized resources (note, folder, daily, tag): 2 minutes per instance
 */

export function createCachedTagsHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.tags.execute(uri, server);
}

export function createCachedStatsHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.stats.execute(uri, server);
}

export function createCachedRecentHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.recent.execute(uri, server);
}

export function createCachedNoteHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.note.execute(uri, server);
}

export function createCachedFolderHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.folder.execute(uri, server);
}

export function createCachedDailyNoteHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.daily.execute(uri, server);
}

export function createCachedTagNotesHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.tagNotes.execute(uri, server);
}

export function createCachedVaultStructureHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.structure.execute(uri, server);
}

export function createCachedSearchHandler(): ResourceHandler {
  return (uri: string, server?: any) => defaultCachedHandlers.search.execute(uri, server);
}

/**
 * Factory to create all cached handlers with custom configuration
 */
export function createAllCachedHandlers(config?: Partial<ResourceCacheConfig>) {
  const handlers = createCachedHandlers(config);
  
  return {
    tags: (uri: string, server?: any) => handlers.tags.execute(uri, server),
    stats: (uri: string, server?: any) => handlers.stats.execute(uri, server),
    recent: (uri: string, server?: any) => handlers.recent.execute(uri, server),
    note: (uri: string, server?: any) => handlers.note.execute(uri, server),
    folder: (uri: string, server?: any) => handlers.folder.execute(uri, server),
    daily: (uri: string, server?: any) => handlers.daily.execute(uri, server),
    tagNotes: (uri: string, server?: any) => handlers.tagNotes.execute(uri, server),
    structure: (uri: string, server?: any) => handlers.structure.execute(uri, server)
  };
}

/**
 * Get cache statistics for all default handlers
 */
export function getAllCacheStats() {
  return {
    tags: defaultCachedHandlers.tags.getCacheStats(),
    stats: defaultCachedHandlers.stats.getCacheStats(),
    recent: defaultCachedHandlers.recent.getCacheStats(),
    note: defaultCachedHandlers.note.getCacheStats(),
    folder: defaultCachedHandlers.folder.getCacheStats(),
    daily: defaultCachedHandlers.daily.getCacheStats(),
    tagNotes: defaultCachedHandlers.tagNotes.getCacheStats(),
    structure: defaultCachedHandlers.structure.getCacheStats(),
    search: defaultCachedHandlers.search.getCacheStats()
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  defaultCachedHandlers.tags.clearCache();
  defaultCachedHandlers.stats.clearCache();
  defaultCachedHandlers.recent.clearCache();
  defaultCachedHandlers.note.clearCache();
  defaultCachedHandlers.folder.clearCache();
  defaultCachedHandlers.daily.clearCache();
  defaultCachedHandlers.tagNotes.clearCache();
  defaultCachedHandlers.structure.clearCache();
  defaultCachedHandlers.search.clearCache();
}

/**
 * Reset all cache statistics
 */
export function resetAllCacheStats() {
  defaultCachedHandlers.tags.resetCacheStats();
  defaultCachedHandlers.stats.resetCacheStats();
  defaultCachedHandlers.recent.resetCacheStats();
  defaultCachedHandlers.note.resetCacheStats();
  defaultCachedHandlers.folder.resetCacheStats();
  defaultCachedHandlers.daily.resetCacheStats();
  defaultCachedHandlers.tagNotes.resetCacheStats();
  defaultCachedHandlers.structure.resetCacheStats();
  defaultCachedHandlers.search.resetCacheStats();
}