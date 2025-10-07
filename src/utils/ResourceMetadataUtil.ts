import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { FileMetadata } from '../types/obsidian.js';
import { OBSIDIAN_DEFAULTS, CACHE_DEFAULTS } from '../constants.js';
import { LRUCache } from './Cache.js';

/**
 * Metadata attached to MCP resources (MCP1 & MCP2)
 *
 * This metadata enables cache optimization and resource management
 * by providing size and modification time without additional API calls.
 *
 * Included in the optional `_meta` field of resource responses.
 * Returns null if metadata cannot be fetched (network issues, auth failures, etc.)
 */
export interface ResourceMetadata {
  /** File size in bytes for precise calculations */
  size: number;
  /** Human-readable file size (e.g., "1.5 KB", "2.3 MB") */
  sizeFormatted: string;
  /** Last modified timestamp in ISO 8601 format (UTC) for cache validation */
  lastModified: string;
}

/**
 * Utility for fetching and formatting resource metadata (MCP1 & MCP2)
 *
 * Provides efficient metadata operations with graceful degradation:
 * - Fetches file size and modification timestamps
 * - Formats data for MCP resource responses
 * - Supports batch operations with concurrency control
 * - Returns default values if metadata fetch fails
 * - Caches metadata with 2-minute TTL to reduce API calls
 *
 * @example
 * ```typescript
 * // Single file metadata
 * const metadata = await ResourceMetadataUtil.fetchMetadata(client, 'note.md');
 * console.log(metadata.sizeFormatted); // "2.50 KB"
 *
 * // Batch metadata fetching
 * const metadataMap = await ResourceMetadataUtil.batchFetchMetadata(
 *   client,
 *   ['note1.md', 'note2.md', 'note3.md']
 * );
 *
 * // Cache invalidation after write operations
 * ResourceMetadataUtil.invalidateCache('note.md');
 * ```
 */
export class ResourceMetadataUtil {
  /**
   * LRU cache for metadata with 2-minute TTL
   * Stores up to 500 file metadata entries
   */
  private static metadataCache = new LRUCache<string, ResourceMetadata>({
    maxSize: 500,  // Store up to 500 file metadata entries
    ttl: CACHE_DEFAULTS.NOTE_TTL  // 2 minutes TTL
  });

  /**
   * Fetch metadata for a file path with caching
   * @param client ObsidianClient instance
   * @param filepath Path to the file in the vault
   * @returns Resource metadata with size and lastModified, or null if fetch fails
   */
  static async fetchMetadata(
    client: ObsidianClient,
    filepath: string
  ): Promise<ResourceMetadata | null> {
    // Check cache first
    const cached = this.metadataCache.get(filepath);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const metadata = await this.fetchMetadataFromApi(client, filepath);

    // Store in cache if successful
    if (metadata) {
      this.metadataCache.set(filepath, metadata);
    }

    return metadata;
  }

  /**
   * Fetch metadata from API (extracted from fetchMetadata for caching)
   * @param client ObsidianClient instance
   * @param filepath Path to the file in the vault
   * @returns Resource metadata with size and lastModified, or null if fetch fails
   */
  private static async fetchMetadataFromApi(
    client: ObsidianClient,
    filepath: string
  ): Promise<ResourceMetadata | null> {
    try {
      // Fetch file metadata without loading content
      const response = await client.getFileContents(filepath, 'metadata');

      // Handle the response - it should be a FileMetadata object
      if (typeof response === 'object' && 'stat' in response) {
        const metadata = response as FileMetadata;
        const size = metadata.stat.size;
        const mtime = metadata.stat.mtime;

        return {
          size,
          sizeFormatted: this.formatSize(size),
          lastModified: this.formatTimestamp(mtime)
        };
      }

      // Fallback if metadata format is unexpected
      throw new Error('Invalid metadata response format');
    } catch (error) {
      // Log the actual error for debugging
      console.warn(`Failed to fetch metadata for ${filepath}:`, error);
      // Return null to indicate metadata unavailable
      return null;
    }
  }

  /**
   * Invalidate cache entry for a specific file
   * Call this after write, delete, or move operations
   * @param filepath Path to the file to invalidate
   */
  static invalidateCache(filepath: string): void {
    this.metadataCache.delete(filepath);
  }

  /**
   * Clear entire metadata cache
   * Useful for testing or when vault state changes significantly
   */
  static clearCache(): void {
    this.metadataCache.clear();
  }

  /**
   * Format file size in human-readable form
   * @param bytes File size in bytes
   * @returns Formatted size string (e.g., "1.5 KB", "2.3 MB")
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Limit to 2 decimal places for clarity
    const value = bytes / Math.pow(k, i);
    const formatted = i === 0 ? value.toString() : value.toFixed(2);

    return `${formatted} ${units[i]}`;
  }

  /**
   * Format timestamp as ISO 8601 string in UTC
   * @param timestamp Unix timestamp in milliseconds
   * @returns ISO 8601 formatted date string
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  /**
   * Batch fetch metadata for multiple files
   * @param client ObsidianClient instance
   * @param filepaths Array of file paths
   * @returns Map of filepath to metadata (null if fetch failed)
   */
  static async batchFetchMetadata(
    client: ObsidianClient,
    filepaths: string[]
  ): Promise<Map<string, ResourceMetadata | null>> {
    const metadataMap = new Map<string, ResourceMetadata | null>();

    // Fetch metadata in parallel with concurrency limit
    const BATCH_SIZE = OBSIDIAN_DEFAULTS.BATCH_SIZE;
    for (let i = 0; i < filepaths.length; i += BATCH_SIZE) {
      const batch = filepaths.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (filepath) => {
          const metadata = await this.fetchMetadata(client, filepath);
          return { filepath, metadata };
        })
      );

      results.forEach(({ filepath, metadata }) => {
        metadataMap.set(filepath, metadata);
      });
    }

    return metadataMap;
  }
}
