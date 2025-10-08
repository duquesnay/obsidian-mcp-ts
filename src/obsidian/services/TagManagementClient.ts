import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../../types/errors.js';
import { validatePath } from '../../utils/pathValidator.js';
import { OBSIDIAN_DEFAULTS, TIMEOUTS } from '../../constants.js';
import type { ITagManagementClient } from '../interfaces/ITagManagementClient.js';
import type { ObsidianClientConfig } from '../ObsidianClient.js';

/**
 * Client for tag management operations in Obsidian vault.
 * Handles all tag-related operations following Single Responsibility Principle.
 */
export class TagManagementClient implements ITagManagementClient {
  private axiosInstance: AxiosInstance;

  constructor(config: ObsidianClientConfig) {
    const protocol = config.protocol || 'https';
    const host = config.host || OBSIDIAN_DEFAULTS.HOST;
    const port = config.port || OBSIDIAN_DEFAULTS.PORT;
    const verifySsl = config.verifySsl ?? true;

    this.axiosInstance = axios.create({
      baseURL: `${protocol}://${host}:${port}`,
      timeout: TIMEOUTS.DEFAULT_REQUEST,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: verifySsl
      })
    });
  }

  private async safeCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ errorCode?: number; message?: string }>;

        // Preserve detailed error information
        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          const code = errorData.errorCode || axiosError.response.status || -1;
          const message = errorData.message || axiosError.message || '<unknown>';
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Error ${code}: ${message}`, code);
        }

        // Network-level errors
        if (axiosError.code) {
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Network error (${axiosError.code}): ${axiosError.message}`);
        }

        // Generic axios error
        const contextInfo = this.getErrorContext(axiosError);
        throw new ObsidianError(`${contextInfo}Request failed: ${axiosError.message}`);
      }
      throw error;
    }
  }

  private getErrorContext(axiosError: AxiosError): string {
    const method = axiosError.config?.method?.toUpperCase() || 'REQUEST';
    const url = axiosError.config?.url || 'unknown endpoint';
    const status = axiosError.response?.status;

    let context = `${method} ${url} - `;

    if (status) {
      if (status === 401) {
        context += 'Authentication failed (check API key) - ';
      } else if (status === 403) {
        context += 'Access forbidden (check permissions) - ';
      } else if (status === 404) {
        context += 'Resource not found - ';
      } else if (status >= 500) {
        context += 'Server error (Obsidian plugin may be unavailable) - ';
      } else if (status >= 400) {
        context += 'Client error - ';
      }
    }

    return context;
  }

  async getAllTags(): Promise<Array<{ name: string; count: number }>> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get('/tags');
      // API returns tags with 'tag' property, but we need 'name' for consistency
      const tags = response.data.tags || [];
      return tags.map((t: any) => ({
        name: t.tag || t.name,
        count: t.count
      }));
    });
  }

  async getFilesByTag(tagName: string): Promise<string[]> {
    const encodedTag = encodeURIComponent(tagName);
    return this.safeCall(async () => {
      try {
        const response = await this.axiosInstance.get(`/tags/${encodedTag}`);
        const files = response.data.files || [];
        // If files are objects with path property, extract the paths
        return files.map((f: any) => typeof f === 'string' ? f : f.path || f.name || f);
      } catch (error: any) {
        // API returns 404 for non-existent tags, return empty array instead
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    });
  }

  async renameTag(oldTagName: string, newTagName: string): Promise<{
    filesUpdated: number;
    message?: string;
  }> {
    const encodedOldTag = encodeURIComponent(oldTagName);
    return this.safeCall(async () => {
      const response = await this.axiosInstance.patch(`/tags/${encodedOldTag}`, newTagName, {
        headers: {
          'Content-Type': 'text/plain',
          'Operation': 'rename'
        }
      });
      const result = response.data;
      return {
        filesUpdated: result.filesUpdated || 0,
        message: result.message
      };
    });
  }

  /**
   * Adds or removes tags from a specific file using batch operations.
   *
   * API v4.1.0+ supports batch tag operations via JSON body format:
   * - Single API call for multiple tags (10x-100x faster than sequential)
   * - Best-effort semantics with per-tag results
   * - Automatic deduplication (skips existing/missing tags)
   *
   * @param filePath - Path to the file relative to vault root
   * @param operation - Whether to add or remove the tags
   * @param tags - Array of tag names to add or remove (without # prefix)
   * @param location - Where to modify tags: frontmatter (default), inline, or both
   * @returns Object with count of tags modified, summary, and per-tag results
   *
   * @example
   * // Add multiple tags in one call
   * await client.manageFileTags('note.md', 'add', ['project', 'urgent'], 'frontmatter');
   * // Response: { tagsModified: 2, summary: { requested: 2, succeeded: 2, ... }, results: [...] }
   */
  async manageFileTags(
    filePath: string,
    operation: 'add' | 'remove',
    tags: string[],
    location: 'frontmatter' | 'inline' | 'both' = 'frontmatter'
  ): Promise<{
    tagsModified: number;
    message?: string;
    summary?: {
      requested: number;
      succeeded: number;
      skipped: number;
      failed: number;
    };
    results?: Array<{
      tag: string;
      status: 'success' | 'skipped' | 'failed';
      message: string;
    }>;
  }> {
    validatePath(filePath, 'filePath');
    const encodedPath = encodeURIComponent(filePath);
    return this.safeCall(async () => {
      // Use API v4.1.0+ batch format with JSON body
      const response = await this.axiosInstance.patch(
        `/vault/${encodedPath}`,
        { tags }, // Batch format: {tags: ["tag1", "tag2", ...]}
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': operation,
            'Location': location
          }
        }
      );

      const result = response.data;

      // API v4.1.0+ returns detailed summary and per-tag results
      return {
        tagsModified: result.summary?.succeeded || tags.length,
        message: result.message || `Successfully ${operation === 'add' ? 'added' : 'removed'} ${result.summary?.succeeded || tags.length} tag(s)`,
        summary: result.summary,
        results: result.results
      };
    });
  }
}