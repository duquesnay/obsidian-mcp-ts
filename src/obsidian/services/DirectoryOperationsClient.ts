import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../../types/errors.js';
import { validatePath } from '../../utils/pathValidator.js';
import { OBSIDIAN_DEFAULTS, TIMEOUTS, BATCH_PROCESSOR } from '../../constants.js';
import { OptimizedBatchProcessor } from '../../utils/OptimizedBatchProcessor.js';
import type { IDirectoryOperationsClient } from '../interfaces/IDirectoryOperationsClient.js';
import type { ObsidianClientConfig } from '../ObsidianClient.js';

/**
 * Client for directory operations in Obsidian vault.
 * Handles creating, deleting, moving, and copying directories.
 */
export class DirectoryOperationsClient implements IDirectoryOperationsClient {
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

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          const code = errorData.errorCode || axiosError.response.status || -1;
          const message = errorData.message || axiosError.message || '<unknown>';
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Error ${code}: ${message}`, code);
        }

        if (axiosError.code) {
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Network error (${axiosError.code}): ${axiosError.message}`);
        }

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

  async createDirectory(directoryPath: string, createParents: boolean = true): Promise<{
    created: boolean;
    message?: string;
    parentsCreated?: boolean;
  }> {
    validatePath(directoryPath, 'directoryPath');
    const encodedPath = encodeURIComponent(directoryPath);

    return this.safeCall(async () => {
      try {
        const response = await this.axiosInstance.post(`/vault/${encodedPath}`, '', {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'create',
            'Target-Type': 'directory',
            'Create-Parents': createParents.toString()
          }
        });

        const result = response.data;
        return {
          created: true,
          message: result.message || `Directory created: ${directoryPath}`,
          parentsCreated: result.parentsCreated || false
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          throw new ObsidianError(
            'Directory creation requires an updated Obsidian REST API plugin that supports directory operations.',
            400
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 409) {
          throw new ObsidianError(
            `Directory already exists: ${directoryPath}`,
            409
          );
        } else {
          throw error;
        }
      }
    });
  }

  async deleteDirectory(directoryPath: string, recursive: boolean = false, permanent: boolean = false): Promise<{
    deleted: boolean;
    message?: string;
    filesDeleted?: number;
  }> {
    validatePath(directoryPath, 'directoryPath');
    const encodedPath = encodeURIComponent(directoryPath);

    return this.safeCall(async () => {
      try {
        const headers: Record<string, string> = {
          'Target-Type': 'directory',
          'Recursive': recursive.toString()
        };

        if (permanent) {
          headers['Permanent'] = 'true';
        }

        const response = await this.axiosInstance.delete(`/vault/${encodedPath}`, { headers });

        const result = response.data;
        return {
          deleted: true,
          message: result.message || `Directory deleted: ${directoryPath}`,
          filesDeleted: result.filesDeleted || 0
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          throw new ObsidianError(
            'Directory deletion requires an updated Obsidian REST API plugin that supports directory operations.',
            400
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new ObsidianError(
            `Directory not found: ${directoryPath}`,
            404
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 409) {
          throw new ObsidianError(
            `Directory not empty: ${directoryPath}. Use recursive=true to delete non-empty directories.`,
            409
          );
        } else {
          throw error;
        }
      }
    });
  }

  async moveDirectory(sourcePath: string, destinationPath: string): Promise<{
    movedFiles: string[];
    failedFiles: string[];
    success?: boolean;
    message?: string;
    oldPath?: string;
    newPath?: string;
    filesMovedCount?: number;
  }> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');
    const encodedPath = sourcePath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    return this.safeCall(async () => {
      try {
        const response = await this.axiosInstance.patch(`/vault/${encodedPath}`, destinationPath, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'move',
            'Target-Type': 'directory',
            'Target': 'path'
          },
          timeout: TIMEOUTS.DIRECTORY_OPERATIONS
        });

        const result = response.data;
        return {
          movedFiles: [],
          failedFiles: [],
          success: true,
          message: result.message || `Directory moved from ${sourcePath} to ${destinationPath}`,
          oldPath: result.oldPath || sourcePath,
          newPath: result.newPath || destinationPath,
          filesMovedCount: result.filesMovedCount || 0
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new ObsidianError(
            `Directory not found: ${sourcePath}`,
            404
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 409) {
          throw new ObsidianError(
            `Directory already exists: ${destinationPath}`,
            409
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 400) {
          throw new ObsidianError(
            'Invalid directory move operation. Check that both paths are valid.',
            400
          );
        } else {
          throw error;
        }
      }
    });
  }

  async copyDirectory(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<{
    filesCopied: number;
    failedFiles: string[];
    message?: string;
  }> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');
    const encodedDestPath = encodeURIComponent(destinationPath);

    return this.safeCall(async () => {
      try {
        const response = await this.axiosInstance.post(`/vault/${encodedDestPath}`, sourcePath, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'copy',
            'Target-Type': 'directory',
            'Overwrite': overwrite.toString()
          },
          timeout: TIMEOUTS.DIRECTORY_OPERATIONS
        });

        const result = response.data;
        return {
          filesCopied: result.filesCopied || 0,
          failedFiles: result.failedFiles || [],
          message: result.message || `Directory copied from ${sourcePath} to ${destinationPath}`
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          throw new ObsidianError(
            'Directory copy operation requires an updated Obsidian REST API plugin that supports directory operations.',
            400
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new ObsidianError(
            `Source directory not found: ${sourcePath}`,
            404
          );
        } else if (axios.isAxiosError(error) && error.response?.status === 409) {
          throw new ObsidianError(
            `Destination already exists: ${destinationPath}. Use overwrite=true to replace existing files.`,
            409
          );
        } else {
          throw error;
        }
      }
    });
  }

  /**
   * Copy directory with streaming support for large directories
   * Uses streaming mode when directory has many files for memory efficiency
   */
  async copyDirectoryStream(
    sourcePath: string, 
    destinationPath: string, 
    options?: {
      overwrite?: boolean;
      onProgress?: (completed: number, total: number) => void;
      useStreaming?: boolean;
    }
  ): Promise<{
    filesCopied: number;
    failedFiles: string[];
    message?: string;
    streamingUsed?: boolean;
  }> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');

    return this.safeCall(async () => {
      // First, get the list of files to copy
      const listResponse = await this.axiosInstance.get(`/vault/${sourcePath}/`);
      const files = listResponse.data.files || [];
      
      // Determine if we should use streaming
      const useStreaming = options?.useStreaming ?? (files.length > 100);
      
      if (!useStreaming) {
        // Use regular copy for smaller directories
        return this.copyDirectory(sourcePath, destinationPath, options?.overwrite);
      }
      
      // Use streaming approach for large directories
      const filesCopied: string[] = [];
      const failedFiles: string[] = [];
      
      const processor = new OptimizedBatchProcessor({
        maxConcurrency: OBSIDIAN_DEFAULTS.BATCH_SIZE,
        retryAttempts: BATCH_PROCESSOR.DEFAULT_RETRY_ATTEMPTS,
        retryDelay: BATCH_PROCESSOR.DEFAULT_RETRY_DELAY_MS,
        onProgress: options?.onProgress
      });
      
      // Process each file copy operation
      for await (const result of processor.processStream(files, async (file: string) => {
        const sourceFile = `${sourcePath}/${file}`;
        const destFile = `${destinationPath}/${file}`;
        
        try {
          // Get file content
          const contentResponse = await this.axiosInstance.get(`/vault/${sourceFile}`);
          
          // Create destination file
          await this.axiosInstance.put(`/vault/${destFile}`, contentResponse.data, {
            headers: { 'Content-Type': 'text/markdown' }
          });
          
          return { success: true, file };
        } catch (error) {
          return { success: false, file, error };
        }
      })) {
        if (result.error || !result.result?.success) {
          failedFiles.push(result.item);
        } else {
          filesCopied.push(result.item);
        }
      }
      
      return {
        filesCopied: filesCopied.length,
        failedFiles,
        message: `Directory copied from ${sourcePath} to ${destinationPath} using streaming mode`,
        streamingUsed: true
      };
    });
  }
}