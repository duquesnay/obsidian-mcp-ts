import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../types/errors.js';
import { validatePath, validatePaths } from '../utils/pathValidator.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { BatchProcessor } from '../utils/BatchProcessor.js';
import type {
  FileContentResponse,
  FileMetadata,
  SimpleSearchResponse,
  ComplexSearchResponse,
  PeriodicNoteData,
  RecentChange,
  AdvancedSearchFilters,
  AdvancedSearchOptions,
  AdvancedSearchResponse,
  PatchContentHeaders,
  PaginatedSearchResponse,
  SearchResult
} from '../types/obsidian.js';

export interface ObsidianClientConfig {
  apiKey: string;
  protocol?: string;
  host?: string;
  port?: number;
  verifySsl?: boolean;
}

// @Todo break apart, file is too long according to conventions?
export class ObsidianClient {
  private apiKey: string;
  private protocol: string;
  private host: string;
  private port: number;
  private verifySsl: boolean;
  private axiosInstance: AxiosInstance;

  /**
   * Creates a new ObsidianClient instance for interacting with the Obsidian REST API.
   *
   * @param config - Configuration options for the client
   * @param config.apiKey - The API key for authentication with the Obsidian REST API plugin
   * @param config.protocol - The protocol to use (default: 'https')
   * @param config.host - The host address where Obsidian is running (default: '127.0.0.1')
   * @param config.port - The port number for the REST API (default: 27124)
   * @param config.verifySsl - Whether to verify SSL certificates (default: true)
   * @example
   * const client = new ObsidianClient({
   *   apiKey: 'your-api-key-here',
   *   host: '127.0.0.1',
   *   port: 27124
   * });
   */
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

  /**
   * Lists all files in the Obsidian vault.
   *
   * @returns An array of file paths relative to the vault root
   * @throws {ObsidianError} If the API request fails or authentication is invalid
   * @example
   * const files = await client.listFilesInVault();
   * // Returns: ['notes/daily/2024-01-01.md', 'projects/todo.md', ...]
   */
  async listFilesInVault(): Promise<string[]> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get('/vault/');
      return response.data.files;
    });
  }

  /**
   * Lists all files in a specific directory within the vault.
   *
   * @param dirpath - The directory path relative to the vault root
   * @returns An array of file paths within the specified directory
   * @throws {ObsidianError} If the directory doesn't exist or the API request fails
   * @example
   * const files = await client.listFilesInDir('projects/work');
   * // Returns: ['projects/work/meeting-notes.md', 'projects/work/tasks.md', ...]
   */
  async listFilesInDir(dirpath: string): Promise<string[]> {
    validatePath(dirpath, 'dirpath');
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/vault/${dirpath}/`);
      return response.data.files;
    });
  }

  /**
   * Retrieves file contents from the Obsidian vault in various formats.
   *
   * @param filepath - Path to the file relative to the vault root
   * @param format - The format to retrieve the file in:
   *   - 'content' (default): Returns the raw markdown content as string
   *   - 'metadata': Returns file metadata (size, dates, etc.) without content
   *   - 'frontmatter': Returns only the YAML frontmatter as an object
   *   - 'plain': Returns plain text with markdown formatting stripped
   *   - 'html': Returns the rendered HTML version of the markdown
   * @returns The file content in the requested format (string for content/plain/html, object for metadata/frontmatter)
   * @throws {ObsidianError} If the file doesn't exist or the API request fails
   * @example
   * // Get raw markdown content
   * const content = await client.getFileContents('notes/example.md');
   *
   * // Get file metadata
   * const metadata = await client.getFileContents('notes/example.md', 'metadata');
   *
   * // Get rendered HTML
   * const html = await client.getFileContents('notes/example.md', 'html');
   */
  async getFileContents(filepath: string, format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'): Promise<FileContentResponse> {
    validatePath(filepath, 'filepath');
    return this.safeCall(async () => {
      const url = format ? `/vault/${filepath}?format=${format}` : `/vault/${filepath}`;
      const response = await this.axiosInstance.get(url);
      return response.data;
    });
  }

  /**
   * Retrieves contents of multiple files in a single batch operation.
   * Results are concatenated with file headers and separators.
   *
   * @param filepaths - Array of file paths relative to the vault root
   * @returns A concatenated string with all file contents, including headers and error messages for failed files
   * @throws {ObsidianError} If the filepaths array is invalid
   * @example
   * const contents = await client.getBatchFileContents([
   *   'notes/file1.md',
   *   'notes/file2.md'
   * ]);
   * // Returns:
   * // # notes/file1.md
   * //
   * // File 1 content here...
   * //
   * // ---
   * //
   * // # notes/file2.md
   * //
   * // File 2 content here...
   * //
   * // ---
   */
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
        // Content is always a string when no format is specified
        return `# ${filepath}\n\n${content}\n\n---\n\n`;
      }
    );
  }

  /**
   * Performs a simple text search across all files in the vault.
   * Implements client-side pagination since the REST API doesn't support it natively.
   *
   * @param query - The search query string
   * @param contextLength - Number of characters to include around each match for context (default: 100)
   * @param limit - Maximum number of results to return (for pagination)
   * @param offset - Number of results to skip (for pagination)
   * @returns Search results with pagination information if limit/offset are provided
   * @throws {ObsidianError} If the API request fails
   * @example
   * // Simple search
   * const results = await client.search('TODO', 50);
   *
   * // Search with pagination
   * const page1 = await client.search('project', 100, 10, 0);
   * const page2 = await client.search('project', 100, 10, 10);
   */
  async search(query: string, contextLength: number = OBSIDIAN_DEFAULTS.CONTEXT_LENGTH, limit?: number, offset?: number): Promise<PaginatedSearchResponse | SimpleSearchResponse> {
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

  /**
   * Performs a complex search using JsonLogic query syntax.
   * Allows for advanced filtering and logical operations.
   *
   * @param query - A JsonLogic query object for complex search conditions
   * @returns Complex search results matching the query
   * @throws {ObsidianError} If the query is invalid or the API request fails
   * @example
   * // Search for files containing both "project" AND "deadline"
   * const results = await client.complexSearch({
   *   "and": [
   *     { "contains": ["content", "project"] },
   *     { "contains": ["content", "deadline"] }
   *   ]
   * });
   *
   * // Search for files modified in the last 7 days
   * const recentFiles = await client.complexSearch({
   *   ">": ["mtime", Date.now() - 7 * 24 * 60 * 60 * 1000]
   * });
   */
  async complexSearch(query: any): Promise<ComplexSearchResponse> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/', query);
      return response.data;
    });
  }

  /**
   * Patches content in a file at specific locations (headings, blocks, or frontmatter).
   * Supports append, prepend, and replace operations within targeted sections.
   *
   * @param filepath - Path to the file to patch relative to the vault root
   * @param content - The content to insert or use for replacement
   * @param options - Options controlling where and how to patch the content
   * @param options.targetType - Type of target: 'heading', 'block', or 'frontmatter'
   * @param options.target - The target identifier (heading name, block ID, or frontmatter field)
   * @param options.insertAfter - Insert content after the target (default for append)
   * @param options.insertBefore - Insert content before the target
   * @param options.oldText - Text to find and replace (used with newText)
   * @param options.newText - Replacement text (used with oldText)
   * @param options.createIfNotExists - Create the file if it doesn't exist
   * @returns Promise that resolves when the patch is complete
   * @throws {ObsidianError} If the file doesn't exist, target isn't found, or the API request fails
   * @example
   * // Append text after a heading
   * await client.patchContent('notes/todo.md', '- New task', {
   *   targetType: 'heading',
   *   target: 'Tasks',
   *   insertAfter: true
   * });
   *
   * // Replace text within a heading section
   * await client.patchContent('notes/todo.md', '', {
   *   targetType: 'heading',
   *   target: 'Completed',
   *   oldText: '- [ ] Old task',
   *   newText: '- [x] Old task'
   * });
   *
   * // Update frontmatter field
   * await client.patchContent('notes/todo.md', '"in-progress"', {
   *   targetType: 'frontmatter',
   *   target: 'status'
   * });
   */
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
    const headers: Partial<PatchContentHeaders> = {
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

  /**
   * Appends content to the end of an existing file.
   * Can optionally create the file if it doesn't exist.
   *
   * @param filepath - Path to the file relative to the vault root
   * @param content - The content to append to the file
   * @param createIfNotExists - Whether to create the file if it doesn't exist (default: true)
   * @returns Promise that resolves when the append is complete
   * @throws {ObsidianError} If the file doesn't exist (when createIfNotExists is false) or the API request fails
   * @example
   * // Append to existing file
   * await client.appendContent('notes/daily.md', '\n## New Section\nContent here...');
   *
   * // Append and create file if needed
   * await client.appendContent('notes/new-file.md', '# My New File\nContent...', true);
   */
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

  /**
   * Creates a new file with the specified content.
   * Will overwrite if the file already exists.
   *
   * @param filepath - Path where the file should be created relative to the vault root
   * @param content - The content to write to the new file
   * @returns Promise that resolves when the file is created
   * @throws {ObsidianError} If the file path is invalid or the API request fails
   * @example
   * await client.createFile('notes/meeting-2024-01-01.md', '# Meeting Notes\n\n- Topic 1\n- Topic 2');
   */
  async createFile(filepath: string, content: string): Promise<void> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);

    return this.safeCall(async () => {
      await this.axiosInstance.put(`/vault/${encodedPath}`, content, {
        headers: { 'Content-Type': 'text/markdown' }
      });
    });
  }

  /**
   * Updates an existing file with new content.
   * This is an alias for createFile as the REST API uses PUT for both operations.
   *
   * @param filepath - Path to the file to update relative to the vault root
   * @param content - The new content to write to the file
   * @returns Promise that resolves when the file is updated
   * @throws {ObsidianError} If the file path is invalid or the API request fails
   * @example
   * await client.updateFile('notes/todo.md', '# Updated Todo List\n\n- [ ] New task');
   */
  async updateFile(filepath: string, content: string): Promise<void> {
    return this.createFile(filepath, content);
  }

  /**
   * Deletes a file from the vault.
   * The file is moved to the system trash by default (not permanently deleted).
   *
   * @param filepath - Path to the file to delete relative to the vault root
   * @returns Promise that resolves when the file is deleted
   * @throws {ObsidianError} If the file doesn't exist or the API request fails
   * @example
   * await client.deleteFile('notes/old-note.md');
   */
  async deleteFile(filepath: string): Promise<void> {
    validatePath(filepath, 'filepath');
    const encodedPath = encodeURIComponent(filepath);

    return this.safeCall(async () => {
      await this.axiosInstance.delete(`/vault/${encodedPath}`);
    });
  }

  /**
   * Renames a file within the same directory.
   * Preserves all backlinks to the file when using the enhanced REST API.
   *
   * @param oldPath - Current path of the file relative to the vault root
   * @param newPath - New path for the file (must be in the same directory)
   * @returns Promise that resolves when the file is renamed
   * @throws {ObsidianError} If the file doesn't exist, new name conflicts, or using standard API (which doesn't support safe rename)
   * @example
   * // Rename within same directory
   * await client.renameFile('notes/old-name.md', 'notes/new-name.md');
   *
   * // Or just provide the new filename
   * await client.renameFile('notes/old-name.md', 'new-name.md');
   */
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

  /**
   * Moves a file to a different location within the vault.
   * Preserves all backlinks to the file when using the enhanced REST API.
   *
   * @param sourcePath - Current path of the file relative to the vault root
   * @param destinationPath - New path where the file should be moved
   * @returns Promise that resolves when the file is moved
   * @throws {ObsidianError} If the source doesn't exist, destination conflicts, or using standard API (which doesn't support safe move)
   * @example
   * // Move to a different directory
   * await client.moveFile('notes/old-location.md', 'archive/old-location.md');
   *
   * // Move and rename
   * await client.moveFile('drafts/temp.md', 'notes/final-version.md');
   */
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

  /**
   * Retrieves the current periodic note for the specified period.
   * Periodic notes are special notes created automatically based on date patterns.
   *
   * @param period - The type of periodic note to retrieve ('daily', 'weekly', 'monthly', 'quarterly', or 'yearly')
   * @returns The periodic note data including path and content
   * @throws {ObsidianError} If the periodic note doesn't exist or the API request fails
   * @example
   * // Get today's daily note
   * const dailyNote = await client.getPeriodicNote('daily');
   *
   * // Get this week's weekly note
   * const weeklyNote = await client.getPeriodicNote('weekly');
   */
  async getPeriodicNote(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<PeriodicNoteData> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/periodic/${period}/`);
      return response.data;
    });
  }

  /**
   * Retrieves recent periodic notes for the specified period type.
   * Note: Current API limitation - only returns the current periodic note.
   *
   * @param period - The type of periodic notes to retrieve
   * @param days - Number of days to look back (currently not used due to API limitations)
   * @returns Array of periodic note data (currently only contains the current note)
   * @throws {ObsidianError} If the API request fails
   * @example
   * const recentDailies = await client.getRecentPeriodicNotes('daily', 7);
   */
  async getRecentPeriodicNotes(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    days?: number
  ): Promise<PeriodicNoteData[]> {
    // The API doesn't have a direct "recent periodic notes" endpoint
    // For now, just return the current periodic note
    return this.safeCall(async () => {
      const currentNote = await this.getPeriodicNote(period);
      return [currentNote];
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

  /**
   * Moves an entire directory to a new location within the vault.
   * Preserves all file contents and updates internal links automatically.
   *
   * @param sourcePath - Current path of the directory relative to the vault root
   * @param destinationPath - New path where the directory should be moved
   * @returns Result object containing move statistics and success status
   * @throws {ObsidianError} If the source doesn't exist, destination conflicts, or the API request fails
   * @example
   * // Move a directory
   * const result = await client.moveDirectory('projects/old-project', 'archive/old-project');
   * console.log(`Moved ${result.filesMovedCount} files`);
   */
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

  /**
   * Copies a file to a new location within the vault.
   * Creates a duplicate of the file with all its content.
   *
   * @param sourcePath - Path of the file to copy relative to the vault root
   * @param destinationPath - Path where the copy should be created
   * @param overwrite - Whether to overwrite if the destination already exists (default: false)
   * @returns Promise that resolves when the file is copied
   * @throws {ObsidianError} If the source doesn't exist, destination conflicts (when overwrite is false), or the API request fails
   * @example
   * // Copy a file
   * await client.copyFile('notes/original.md', 'backup/original-copy.md');
   *
   * // Copy with overwrite
   * await client.copyFile('templates/daily.md', 'notes/today.md', true);
   */
  async copyFile(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<void> {
    validatePath(sourcePath, 'sourcePath');
    validatePath(destinationPath, 'destinationPath');

    return this.safeCall(async () => {
      // First, verify source file exists and read its content
      let content: string;
      try {
        // getFileContents without format parameter returns string
        const fileContent = await this.getFileContents(sourcePath);
        // Type assertion is safe here because we're not passing a format parameter
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

  /**
   * Checks if a path exists in the vault and determines its type.
   * Useful for validation before performing operations.
   *
   * @param path - Path to check relative to the vault root
   * @returns Object indicating if the path exists and whether it's a file or directory
   * @throws {ObsidianError} If the API request fails (not for non-existent paths)
   * @example
   * const result = await client.checkPathExists('notes/example.md');
   * if (result.exists) {
   *   console.log(`Path is a ${result.type}`);
   * } else {
   *   console.log('Path does not exist');
   * }
   */
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

  /**
   * Creates a new directory in the vault.
   * Can optionally create parent directories if they don't exist.
   *
   * @param directoryPath - Path of the directory to create relative to the vault root
   * @param createParents - Whether to create parent directories if they don't exist (default: true)
   * @returns Result object indicating success and whether parent directories were created
   * @throws {ObsidianError} If the directory already exists or the API request fails
   * @example
   * // Create a single directory
   * await client.createDirectory('projects/new-project');
   *
   * // Create nested directories
   * const result = await client.createDirectory('archive/2024/january', true);
   * if (result.parentsCreated) {
   *   console.log('Parent directories were also created');
   * }
   */
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

  /**
   * Deletes a directory from the vault.
   * Can optionally delete all contents recursively and/or permanently.
   *
   * @param directoryPath - Path of the directory to delete relative to the vault root
   * @param recursive - Whether to delete all contents within the directory (default: false)
   * @param permanent - Whether to permanently delete instead of moving to trash (default: false)
   * @returns Result object with deletion statistics
   * @throws {ObsidianError} If the directory doesn't exist, is not empty (when recursive is false), or the API request fails
   * @example
   * // Delete empty directory
   * await client.deleteDirectory('temp/empty-folder');
   *
   * // Delete directory and all contents
   * const result = await client.deleteDirectory('old-project', true);
   * console.log(`Deleted ${result.filesDeleted} files`);
   *
   * // Permanently delete (bypass trash)
   * await client.deleteDirectory('sensitive-data', true, true);
   */
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

  /**
   * Copies an entire directory to a new location within the vault.
   * Preserves directory structure and all file contents.
   *
   * @param sourcePath - Path of the directory to copy relative to the vault root
   * @param destinationPath - Path where the copy should be created
   * @param overwrite - Whether to overwrite existing files in the destination (default: false)
   * @returns Result object with copy statistics and any failed files
   * @throws {ObsidianError} If the source doesn't exist, destination conflicts (when overwrite is false), or the API request fails
   * @example
   * // Copy a directory
   * const result = await client.copyDirectory('templates', 'backup/templates-2024');
   * console.log(`Copied ${result.filesCopied} files`);
   *
   * // Copy with overwrite
   * await client.copyDirectory('current-project', 'archive/project-v2', true);
   */
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

  /**
   * Retrieves all unique tags used across the vault with their usage counts.
   * Includes both inline tags (#tag) and frontmatter tags.
   *
   * @returns Array of tag objects with name and count properties
   * @throws {ObsidianError} If the API request fails
   * @example
   * const tags = await client.getAllTags();
   * tags.forEach(tag => {
   *   console.log(`${tag.name}: used ${tag.count} times`);
   * });
   */
  async getAllTags(): Promise<Array<{ name: string; count: number }>> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.get('/tags');
      return response.data.tags || [];
    });
  }

  /**
   * Retrieves all files that contain a specific tag.
   * Searches both inline tags (#tag) and frontmatter tags.
   *
   * @param tagName - The tag name to search for (with or without # prefix)
   * @returns Array of file paths that contain the specified tag
   * @throws {ObsidianError} If the tag doesn't exist or the API request fails
   * @example
   * // Get all files tagged with #project
   * const projectFiles = await client.getFilesByTag('project');
   *
   * // Works with or without # prefix
   * const todoFiles = await client.getFilesByTag('#todo');
   */
  async getFilesByTag(tagName: string): Promise<string[]> {
    const encodedTag = encodeURIComponent(tagName);

    return this.safeCall(async () => {
      const response = await this.axiosInstance.get(`/tags/${encodedTag}`);
      return response.data.files || [];
    });
  }

  /**
   * Renames a tag across the entire vault.
   * Updates both inline tags (#tag) and frontmatter tags in all files.
   *
   * @param oldTagName - The current tag name to rename (with or without # prefix)
   * @param newTagName - The new tag name (with or without # prefix)
   * @returns Result object with count of files updated
   * @throws {ObsidianError} If the old tag doesn't exist or the API request fails
   * @example
   * // Rename a tag
   * const result = await client.renameTag('wip', 'in-progress');
   * console.log(`Updated tag in ${result.filesUpdated} files`);
   */
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
   * Adds or removes tags from a specific file.
   * Can modify tags in frontmatter, inline, or both locations.
   *
   * @param filePath - Path to the file to modify relative to the vault root
   * @param operation - Whether to 'add' or 'remove' the specified tags
   * @param tags - Array of tag names to add or remove (with or without # prefix)
   * @param location - Where to modify tags: 'frontmatter' (default), 'inline', or 'both'
   * @returns Result object with count of tags modified
   * @throws {ObsidianError} If the file doesn't exist or the API request fails
   * @example
   * // Add tags to frontmatter
   * await client.manageFileTags('notes/project.md', 'add', ['important', 'urgent']);
   *
   * // Remove inline tags
   * await client.manageFileTags('notes/done.md', 'remove', ['todo', 'wip'], 'inline');
   *
   * // Add tags to both frontmatter and inline
   * await client.manageFileTags('notes/doc.md', 'add', ['reviewed'], 'both');
   */
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

  /**
   * Performs an advanced search with multiple filter criteria.
   * Supports filtering by content, metadata, tags, and file properties.
   *
   * @param filters - Search filters including content queries, tags, frontmatter fields, and file properties
   * @param options - Search options including pagination, sorting, and result formatting
   * @returns Search results with metadata, match contexts, and pagination information
   * @throws {ObsidianError} If the search query is invalid or the API request fails
   * @example
   * // Search with multiple filters
   * const results = await client.advancedSearch({
   *   content: { query: 'project deadline' },
   *   tags: { include: ['important'], exclude: ['archived'] },
   *   file: {
   *     modified: { after: '2024-01-01' },
   *     extension: ['md']
   *   }
   * }, {
   *   limit: 20,
   *   includeContent: true,
   *   sort: { field: 'modified', direction: 'desc' }
   * });
   * 
   * // Search in frontmatter fields
   * const drafts = await client.advancedSearch({
   *   frontmatter: {
   *     status: { operator: 'equals', value: 'draft' },
   *     priority: { operator: 'gt', value: 5 }
   *   }
   * }, {
   *   limit: 10
   * });
   */
  async advancedSearch(
    filters: AdvancedSearchFilters,
    options: AdvancedSearchOptions
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
