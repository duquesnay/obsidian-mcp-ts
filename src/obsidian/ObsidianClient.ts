import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../types/errors.js';
import { validatePath, validatePaths } from '../utils/pathValidator.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { BatchProcessor } from '../utils/BatchProcessor.js';

export interface ObsidianClientConfig {
  apiKey: string;
  protocol?: string;
  host?: string;
  port?: number;
  verifySsl?: boolean;
}

export class ObsidianClient {
  private apiKey: string;
  private protocol: string;
  private host: string;
  private port: number;
  private verifySsl: boolean;
  private axiosInstance: AxiosInstance;

  constructor(config: ObsidianClientConfig) {
    this.apiKey = config.apiKey;
    this.protocol = config.protocol || 'https';
    this.host = config.host || OBSIDIAN_DEFAULTS.HOST;
    this.port = config.port || OBSIDIAN_DEFAULTS.PORT;
    this.verifySsl = config.verifySsl ?? true;

    // Create axios instance with custom config
    this.axiosInstance = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: OBSIDIAN_DEFAULTS.TIMEOUT_MS,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: this.verifySsl
      })
    });

    // Set connect timeout
    this.axiosInstance.defaults.timeout = OBSIDIAN_DEFAULTS.TIMEOUT_MS;
  }

  private getBaseUrl(): string {
    return `${this.protocol}://${this.host}:${this.port}`;
  }

  private async safeCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ errorCode?: number; message?: string }>;
        
        // Preserve detailed error information for better debugging
        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          const code = errorData.errorCode || axiosError.response.status || -1;
          const message = errorData.message || axiosError.message || '<unknown>';
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Error ${code}: ${message}`, code);
        }
        
        // Network-level errors (no response received)
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

  async getFileContents(filepath: string, format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'): Promise<any> {
    validatePath(filepath, 'filepath');
    return this.safeCall(async () => {
      const url = format ? `/vault/${filepath}?format=${format}` : `/vault/${filepath}`;
      const response = await this.axiosInstance.get(url);
      return response.data;
    });
  }

  async getBatchFileContents(filepaths: string[]): Promise<string> {
    validatePaths(filepaths, 'filepaths');
    
    // Use BatchProcessor to handle concurrent file reading
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

  async search(query: string, contextLength: number = OBSIDIAN_DEFAULTS.CONTEXT_LENGTH, limit?: number, offset?: number): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/simple/', null, {
        params: {
          query,
          contextLength
        }
      });
      
      // Handle pagination in-memory since the REST API doesn't support it
      const allResults = response.data;
      if (!Array.isArray(allResults)) {
        return allResults;
      }
      
      const totalResults = allResults.length;
      const startIndex = offset || 0;
      const endIndex = limit ? startIndex + limit : totalResults;
      const paginatedResults = allResults.slice(startIndex, endIndex);
      
      return {
        results: paginatedResults,
        totalResults: totalResults,
        hasMore: endIndex < totalResults,
        offset: startIndex,
        limit: limit || totalResults
      };
    });
  }

  async complexSearch(query: any): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/', query);
      return response.data;
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
  ): Promise<any> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);
    
    // Required headers for PATCH operation
    const headers: any = {
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
    // For find/replace operations, the API will replace oldText with newText within the target
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
    
    // Extract just the filename from newPath if it's a full path
    const newFilename = newPath.includes('/') ? newPath.split('/').pop()! : newPath;
    
    return this.safeCall(async () => {
      try {
        // Try using the enhanced API with PATCH
        await this.axiosInstance.patch(`/vault/${encodedPath}`, newFilename, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'rename',
            'Target-Type': 'file',
            'Target': 'name'
          }
        });
      } catch (error) {
        // NEVER fall back to delete operations - this would break backlinks
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
        // Try using the enhanced API with PATCH
        await this.axiosInstance.patch(`/vault/${encodedPath}`, destinationPath, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'move',
            'Target-Type': 'file',
            'Target': 'path'
          }
        });
      } catch (error) {
        // NEVER fall back to delete operations - this would break backlinks
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

  async getPeriodicNote(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<any> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/periodic/${period}/`);
      return response.data;
    });
  }

  async getRecentPeriodicNotes(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    days?: number
  ): Promise<any> {
    // The API doesn't have a direct "recent periodic notes" endpoint
    // For now, just return the current periodic note
    return this.safeCall(async () => {
      const currentNote = await this.getPeriodicNote(period);
      return [currentNote];
    });
  }

  async getRecentChanges(
    directory?: string,
    limit?: number,
    offset?: number,
    contentLength?: number
  ): Promise<any> {
    // The Obsidian REST API doesn't have a direct "recent changes" endpoint
    // Instead, we'll get all files and sort them by modification time
    return this.safeCall(async () => {
      const files = await this.listFilesInVault();
      // For now, just return the file list as we can't get modification times without individual requests
      // This is a limitation of the current API
      const limitedFiles = limit ? files.slice(0, limit) : files;
      return limitedFiles.map((file: string) => ({
        filename: file,
        message: 'Recent changes functionality limited by API - modification times not available'
      }));
    });
  }

  async moveDirectory(sourcePath: string, destinationPath: string): Promise<{ 
    movedFiles: string[], 
    failedFiles: string[], 
    success?: boolean,
    message?: string,
    oldPath?: string,
    newPath?: string,
    filesMovedCount?: number
  }> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');
    // Encode each path segment separately to preserve directory structure
    const encodedPath = sourcePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    
    return this.safeCall(async () => {
      try {
        // Use the new directory move API endpoint with extended timeout for large directories
        const response = await this.axiosInstance.patch(`/vault/${encodedPath}`, destinationPath, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'move',
            'Target-Type': 'directory',
            'Target': 'path'
          },
          timeout: 120000 // 2 minutes for directory operations
        });

        // Return the response in the expected format
        const result = response.data;
        return {
          movedFiles: [], // API handles this internally
          failedFiles: [], // API handles this internally
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

  async copyFile(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<void> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');
    
    return this.safeCall(async () => {
      // First, verify source file exists and read its content
      let content: string;
      try {
        content = await this.getFileContents(sourcePath);
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
          // If file doesn't exist (404), that's what we want for non-overwrite
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
        // First try to read as a file
        await this.getFileContents(path);
        return { exists: true, type: 'file' as const };
      } catch (fileError) {
        try {
          // If file read fails, try to list as directory
          await this.listFilesInDir(path);
          return { exists: true, type: 'directory' as const };
        } catch (dirError) {
          // Neither file nor directory exists
          return { exists: false, type: null };
        }
      }
    });
  }

  async createDirectory(directoryPath: string, createParents: boolean = true): Promise<{ 
    created: boolean,
    message?: string,
    parentsCreated?: boolean
  }> {
    validatePath(directoryPath, 'directoryPath');
    const encodedPath = encodeURIComponent(directoryPath);
    
    return this.safeCall(async () => {
      try {
        // Use the new directory create API endpoint
        const response = await this.axiosInstance.post(`/vault/${encodedPath}`, '', {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'create',
            'Target-Type': 'directory',
            'Create-Parents': createParents.toString()
          }
        });

        // Return the response in the expected format
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
    deleted: boolean,
    message?: string,
    filesDeleted?: number
  }> {
    validatePath(directoryPath, 'directoryPath');
    const encodedPath = encodeURIComponent(directoryPath);
    
    return this.safeCall(async () => {
      try {
        // Use the new directory delete API endpoint
        const headers: Record<string, string> = {
          'Target-Type': 'directory',
          'Recursive': recursive.toString()
        };
        
        // Add Permanent header only if permanent deletion is requested
        if (permanent) {
          headers['Permanent'] = 'true';
        }
        
        const response = await this.axiosInstance.delete(`/vault/${encodedPath}`, { headers });

        // Return the response in the expected format
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

  async copyDirectory(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<{ 
    filesCopied: number,
    failedFiles: string[],
    message?: string
  }> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');
    const encodedDestPath = encodeURIComponent(destinationPath);
    
    return this.safeCall(async () => {
      try {
        // Use the new directory copy API endpoint
        const response = await this.axiosInstance.post(`/vault/${encodedDestPath}`, sourcePath, {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'copy',
            'Target-Type': 'directory',
            'Overwrite': overwrite.toString()
          },
          timeout: 120000 // 2 minutes for directory operations
        });

        // Return the response in the expected format
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

  // Tag Management Methods
  
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

  async advancedSearch(
    filters: any,
    options: any
  ): Promise<{
    totalResults: number;
    results: Array<{
      path: string;
      score?: number;
      matches?: Array<{
        type: 'content' | 'frontmatter' | 'tag';
        context?: string;
        lineNumber?: number;
        field?: string;
      }>;
      metadata?: {
        size: number;
        created: string;
        modified: string;
        tags?: string[];
      };
      content?: string;
    }>;
    hasMore: boolean;
  }> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/advanced', {
        filters,
        options
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout for search operations
      });
      
      const result = response.data;
      return {
        totalResults: result.totalResults || 0,
        results: result.results || [],
        hasMore: result.hasMore || false
      };
    });
  }
}