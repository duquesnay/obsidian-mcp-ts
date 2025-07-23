import { CachedResourceHandler, ResourceCacheConfig } from './CachedResourceHandler.js';
import { TagsHandler, StatsHandler, RecentHandler, NoteHandler, FolderHandler } from './concreteHandlers.js';
import { VaultStructureHandler } from './VaultStructureHandler.js';
import { DailyNoteHandler } from './DailyNoteHandler.js';
import { TagNotesHandler } from './TagNotesHandler.js';
import { SearchHandler } from './SearchHandler.js';
import { CACHE_DEFAULTS } from '../constants.js';

/**
 * Pre-configured cached versions of concrete handlers
 * 
 * These classes provide ready-to-use cached implementations with appropriate TTL settings:
 * - Static resources (tags, stats, structure): 5 minutes
 * - Dynamic resources (recent): 30 seconds
 * - Parameterized resources (note, folder, daily, tag): 2 minutes
 */

/**
 * Cached version of TagsHandler with 5-minute TTL
 */
export class CachedTagsHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new TagsHandler(), config);
  }
}

/**
 * Cached version of StatsHandler with 5-minute TTL
 */
export class CachedStatsHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new StatsHandler(), config);
  }
}

/**
 * Cached version of RecentHandler with 30-second TTL
 */
export class CachedRecentHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new RecentHandler(), config);
  }
}

/**
 * Cached version of NoteHandler with 2-minute TTL per note
 */
export class CachedNoteHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new NoteHandler(), config);
  }
}

/**
 * Cached version of FolderHandler with 2-minute TTL per folder
 */
export class CachedFolderHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new FolderHandler(), config);
  }
}

/**
 * Cached version of VaultStructureHandler with 5-minute TTL
 */
export class CachedVaultStructureHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new VaultStructureHandler(), config);
  }
}

/**
 * Cached version of DailyNoteHandler with 2-minute TTL per date
 */
export class CachedDailyNoteHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new DailyNoteHandler(), config);
  }
}

/**
 * Cached version of TagNotesHandler with 2-minute TTL per tag
 */
export class CachedTagNotesHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new TagNotesHandler(), config);
  }
}

/**
 * Cached version of SearchHandler with 1-minute TTL per query
 */
export class CachedSearchHandler extends CachedResourceHandler {
  constructor(config?: ResourceCacheConfig) {
    super(new SearchHandler(), config);
  }
}

/**
 * Factory function to create cached handlers with custom configuration
 */
export function createCachedHandlers(config?: Partial<ResourceCacheConfig>) {
  const fullConfig: ResourceCacheConfig = {
    maxSize: config?.maxSize ?? CACHE_DEFAULTS.MAX_SIZE,
    defaultTtl: config?.defaultTtl ?? CACHE_DEFAULTS.STABLE_TTL,
    resourceTtls: {
      // Static resources - longer TTL
      'vault://tags': CACHE_DEFAULTS.STABLE_TTL,
      'vault://stats': CACHE_DEFAULTS.STABLE_TTL,
      'vault://structure': CACHE_DEFAULTS.STABLE_TTL,
      
      // Dynamic resources - shorter TTL
      'vault://recent': CACHE_DEFAULTS.FAST_TTL,
      
      // Merge any custom TTLs
      ...config?.resourceTtls
    }
  };

  return {
    tags: new CachedTagsHandler(fullConfig),
    stats: new CachedStatsHandler(fullConfig),
    recent: new CachedRecentHandler(fullConfig),
    note: new CachedNoteHandler(fullConfig),
    folder: new CachedFolderHandler(fullConfig),
    structure: new CachedVaultStructureHandler(fullConfig),
    daily: new CachedDailyNoteHandler(fullConfig),
    tagNotes: new CachedTagNotesHandler(fullConfig),
    search: new CachedSearchHandler(fullConfig)
  };
}

/**
 * Default cached handlers with standard configuration
 */
export const defaultCachedHandlers = createCachedHandlers();