import { ObsidianClient } from '../obsidian/ObsidianClient.js';
import { FileMetadata } from '../types/obsidian.js';

/**
 * Metadata attached to MCP resources (MCP1 & MCP2)
 *
 * This metadata enables cache optimization and resource management
 * by providing size and modification time without additional API calls.
 *
 * Included in the optional `_meta` field of resource responses.
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
 * ```
 */
export class ResourceMetadataUtil {
  /**
   * Fetch metadata for a file path
   * @param client ObsidianClient instance
   * @param filepath Path to the file in the vault
   * @returns Resource metadata with size and lastModified
   */
  static async fetchMetadata(
    client: ObsidianClient,
    filepath: string
  ): Promise<ResourceMetadata> {
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
      // If we can't fetch metadata, return default values
      // This ensures resources still work even if metadata fetch fails
      return {
        size: 0,
        sizeFormatted: '0 B',
        lastModified: new Date().toISOString()
      };
    }
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
   * @returns Map of filepath to metadata
   */
  static async batchFetchMetadata(
    client: ObsidianClient,
    filepaths: string[]
  ): Promise<Map<string, ResourceMetadata>> {
    const metadataMap = new Map<string, ResourceMetadata>();

    // Fetch metadata in parallel with concurrency limit
    const BATCH_SIZE = 5;
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
