import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../../types/errors.js';
import { validatePath } from '../../utils/pathValidator.js';
import { OBSIDIAN_DEFAULTS } from '../../constants.js';
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
      timeout: OBSIDIAN_DEFAULTS.TIMEOUT_MS,
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
      return response.data.tags || [];
    });
  }

  async getFilesByTag(tagName: string): Promise<string[]> {
    const encodedTag = encodeURIComponent(tagName);
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/tags/${encodedTag}`);
      return response.data.files || [];
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

  async manageFileTags(
    filePath: string,
    operation: 'add' | 'remove',
    tags: string[],
    location: 'frontmatter' | 'inline' | 'both' = 'frontmatter'
  ): Promise<{
    tagsModified: number;
    message?: string;
  }> {
    validatePath(filePath, 'filePath');
    const encodedPath = encodeURIComponent(filePath);
    return this.safeCall(async () => {
      const response = await this.axiosInstance.patch(`/vault/${encodedPath}`, tags, {
        headers: {
          'Content-Type': 'application/json',
          'Target-Type': 'tag',
          'Operation': operation,
          'Tag-Location': location
        }
      });
      const result = response.data;
      return {
        tagsModified: result.tagsModified || tags.length,
        message: result.message
      };
    });
  }
}