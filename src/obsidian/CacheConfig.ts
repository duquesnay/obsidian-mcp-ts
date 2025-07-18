/**
 * Configuration for ObsidianClient caching
 */

export interface CacheConfig {
  enabled?: boolean;
  maxSize?: number;
  ttl?: number; // milliseconds
  endpoints?: {
    listFilesInVault?: boolean;
    listFilesInDir?: boolean;
    checkPathExists?: boolean;
    getAllTags?: boolean;
    getPeriodicNote?: boolean;
    getRecentPeriodicNotes?: boolean;
  };
}

export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  enabled: true,
  maxSize: 100,
  ttl: 60000, // 1 minute
  endpoints: {
    listFilesInVault: true,
    listFilesInDir: true,
    checkPathExists: true,
    getAllTags: true,
    getPeriodicNote: true,
    getRecentPeriodicNotes: true
  }
};