import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../../types/errors.js';
import { validatePath, validatePaths } from '../../utils/pathValidator.js';
import { OBSIDIAN_DEFAULTS, TIMEOUTS } from '../../constants.js';
import { BatchProcessor } from '../../utils/BatchProcessor.js';
import type { IFileOperationsClient } from '../interfaces/IFileOperationsClient.js';
import type { FileContentResponse, RecentChange } from '../../types/obsidian.js';
import type { ObsidianClientConfig } from '../ObsidianClient.js';

/**
 * Client for file CRUD operations in Obsidian vault.
 * Handles all file-related operations following Single Responsibility Principle.
 */
export class FileOperationsClient implements IFileOperationsClient {
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

  async listFilesInVault(): Promise<string[]> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get('/vault/');
      return response.data.files;
    });
  }

  async listFilesInDir(dirpath: string): Promise<string[]> {
    validatePath(dirpath, 'dirpath');
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/vault/${dirpath}/`);
      return response.data.files;
    });
  }

  async getFileContents(filepath: string, format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'): Promise<FileContentResponse> {
    validatePath(filepath, 'filepath');
    return this.safeCall(async () => {
      const url = format ? `/vault/${filepath}?format=${format}` : `/vault/${filepath}`;
      const response = await this.axiosInstance.get(url);
      return response.data;
    });
  }

  async getBatchFileContents(filepaths: string[]): Promise<string> {
    validatePaths(filepaths, 'filepaths');

    return BatchProcessor.processBatchWithFormat(
      filepaths,
      async (filepath) => await this.getFileContents(filepath),
      (filepath, content) => {
        if (content instanceof Error) {
          return `# ${filepath}\n\nError reading file: ${content.message}\n\n---\n\n`;
        }
        return `# ${filepath}\n\n${content}\n\n---\n\n`;
      }
    );
  }

  async createFile(filepath: string, content: string): Promise<void> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);

    return this.safeCall(async () => {
      await this.axiosInstance.put(`/vault/${encodedPath}`, content, {
        headers: { 'Content-Type': 'text/markdown' }
      });
    });
  }

  async updateFile(filepath: string, content: string): Promise<void> {
    return this.createFile(filepath, content);
  }

  async deleteFile(filepath: string): Promise<void> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);

    return this.safeCall(async () => {
      await this.axiosInstance.delete(`/vault/${encodedPath}`);
    });
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    validatePath(oldPath, 'oldPath');
    validatePath(newPath, 'newPath');
    const encodedPath = encodeURIComponent(oldPath);

    const newFilename = newPath.includes('/') ? newPath.split('/').pop()! : newPath;

    return this.safeCall(async () => {
      try {
        await this.axiosInstance.patch(`/vault/${encodedPath}`, newFilename, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'rename',
            'Target-Type': 'file',
            'Target': 'name'
          }
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          throw new ObsidianError(
            'Rename operation requires the enhanced Obsidian REST API. The standard API does not support preserving backlinks during rename operations.',
            400
          );
        } else {
          throw error;
        }
      }
    });
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');
    const encodedPath = encodeURIComponent(sourcePath);

    return this.safeCall(async () => {
      try {
        await this.axiosInstance.patch(`/vault/${encodedPath}`, destinationPath, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'move',
            'Target-Type': 'file',
            'Target': 'path'
          }
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          throw new ObsidianError(
            'Move operation requires the enhanced Obsidian REST API. The standard API does not support preserving backlinks during move operations.',
            400
          );
        } else {
          throw error;
        }
      }
    });
  }

  async copyFile(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<void> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');

    return this.safeCall(async () => {
      // First, verify source file exists and read its content
      let content: string;
      try {
        const fileContent = await this.getFileContents(sourcePath);
        content = fileContent as string;
      } catch (error) {
        if (error instanceof ObsidianError && error.code === 404) {
          throw new ObsidianError(`Source file not found: ${sourcePath}`, 404);
        }
        throw error;
      }

      // Check if destination exists and handle overwrite logic
      if (!overwrite) {
        try {
          await this.getFileContents(destinationPath);
          throw new ObsidianError(`Destination file already exists: ${destinationPath}. Use overwrite=true to replace it.`, 409);
        } catch (error) {
          // If file doesn't exist (404), that's what we want
          if (!(error instanceof ObsidianError && error.code === 404)) {
            throw error;
          }
        }
      }

      // Create the new file at destination
      await this.createFile(destinationPath, content);
    });
  }

  async checkPathExists(path: string): Promise<{ exists: boolean; type: 'file' | 'directory' | null }> {
    validatePath(path, 'path');

    return this.safeCall(async () => {
      try {
        await this.getFileContents(path);
        return { exists: true, type: 'file' as const };
      } catch (fileError) {
        try {
          await this.listFilesInDir(path);
          return { exists: true, type: 'directory' as const };
        } catch (dirError) {
          return { exists: false, type: null };
        }
      }
    });
  }

  async appendContent(filepath: string, content: string, createIfNotExists: boolean = true): Promise<void> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);

    return this.safeCall(async () => {
      if (createIfNotExists) {
        await this.axiosInstance.post(`/vault/${encodedPath}`, content, {
          headers: {
            'Content-Type': 'text/markdown',
            'If-None-Match': '*'
          }
        });
      } else {
        const currentContent = await this.getFileContents(filepath);
        const newContent = currentContent ? `${currentContent}\n${content}` : content;
        await this.axiosInstance.put(`/vault/${encodedPath}`, newContent, {
          headers: { 'Content-Type': 'text/markdown' }
        });
      }
    });
  }

  async patchContent(
    filepath: string,
    content: string,
    options: {
      heading?: string;
      insertAfter?: boolean;
      insertBefore?: boolean;
      createIfNotExists?: boolean;
      blockRef?: string;
      oldText?: string;
      newText?: string;
      targetType: 'heading' | 'block' | 'frontmatter';
      target: string;
    }
  ): Promise<void> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);

    // Required headers for PATCH operation
    const headers: Record<string, string> = {
      'Target-Type': options.targetType,
      'Target': options.target
    };

    // Determine operation based on parameters
    if (options.oldText !== undefined && options.newText !== undefined) {
      headers['Operation'] = 'replace';
    } else if (options.insertBefore) {
      headers['Operation'] = 'prepend';
    } else if (options.insertAfter || (!options.insertBefore && !options.oldText)) {
      headers['Operation'] = 'append';
    } else {
      headers['Operation'] = 'append';
    }

    // Content is passed in the body
    let body = content;

    // For frontmatter operations, the content might need to be JSON
    if (options.targetType === 'frontmatter') {
      headers['Content-Type'] = 'application/json';
      // If the content is not already JSON, try to parse it
      try {
        JSON.parse(content);
        body = content; // Already valid JSON
      } catch {
        // If not JSON, wrap as a string value
        body = JSON.stringify(content);
      }
    } else {
      headers['Content-Type'] = 'text/markdown';
    }

    return this.safeCall(async () => {
      const response = await this.axiosInstance.patch(
        `/vault/${encodedPath}`,
        body,
        { headers }
      );
      return response.data;
    });
  }

  /**
   * Retrieves recently changed files in the vault.
   * Note: Current API limitation - returns files without actual modification times.
   *
   * @param directory - Optional directory to filter changes within
   * @param limit - Maximum number of changes to return
   * @param offset - Number of changes to skip (for pagination)
   * @param contentLength - Length of content preview (currently not supported)
   * @returns Array of recent changes (with placeholder modification times due to API limitations)
   * @throws {ObsidianError} If the API request fails
   * @example
   * // Get 10 most recent changes
   * const changes = await client.getRecentChanges(undefined, 10);
   *
   * // Get changes in a specific directory
   * const projectChanges = await client.getRecentChanges('projects', 5);
   */
  async getRecentChanges(
    directory?: string,
    limit?: number,
    offset?: number,
    contentLength?: number
  ): Promise<RecentChange[]> {
    // The Obsidian REST API doesn't have a direct "recent changes" endpoint
    // Instead, we'll get all files and sort them by modification time
    return this.safeCall(async () => {
      const files = await this.listFilesInVault();
      // For now, just return the file list as we can't get modification times without individual requests
      // This is a limitation of the current API
      const limitedFiles = limit ? files.slice(0, limit) : files;
      return limitedFiles.map((file: string) => ({
        path: file,
        mtime: Date.now(), // Placeholder since API doesn't provide modification times
        content: undefined // No content preview available without additional API calls
        // TODO: When the Obsidian API supports it, use contentLength to fetch preview content
      }));
    });
  }
}
