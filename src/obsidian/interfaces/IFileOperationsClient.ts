import type { FileContentResponse, RecentChange } from '../../types/obsidian.js';

/**
 * Options for batch operations with progress tracking
 */
export interface BatchOperationOptions {
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Interface for file CRUD operations in Obsidian vault.
 */
export interface IFileOperationsClient {
  // List operations
  listFilesInVault(): Promise<string[]>;
  listFilesInDir(dirpath: string): Promise<string[]>;

  // Read operations
  getFileContents(filepath: string, format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'): Promise<FileContentResponse>;
  getBatchFileContents(filepaths: string[], options?: BatchOperationOptions): Promise<string>;

  // Write operations
  createFile(filepath: string, content: string): Promise<void>;
  updateFile(filepath: string, content: string): Promise<void>;

  // Delete operations
  deleteFile(filepath: string): Promise<void>;

  // Move/rename operations
  renameFile(oldPath: string, newPath: string): Promise<void>;
  moveFile(sourcePath: string, destinationPath: string): Promise<void>;

  // Copy operations
  copyFile(sourcePath: string, destinationPath: string, overwrite?: boolean): Promise<void>;

  // Utility operations
  checkPathExists(path: string): Promise<{ exists: boolean; type: 'file' | 'directory' | null }>;

  // Append operations
  appendContent(filepath: string, content: string, createIfNotExists?: boolean): Promise<void>;

  // Patch operations
  patchContent(
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
  ): Promise<void>;

  // Recent changes operations
  getRecentChanges(
    directory?: string,
    limit?: number,
    offset?: number,
    contentLength?: number
  ): Promise<RecentChange[]>;

  // Batch operations
  batchCreateFiles(fileOperations: Array<{ filepath: string; content: string }>, options?: BatchOperationOptions): Promise<Array<{ filepath: string; success: boolean; error?: string }>>;
  batchUpdateFiles(fileOperations: Array<{ filepath: string; content: string }>, options?: BatchOperationOptions): Promise<Array<{ filepath: string; success: boolean; error?: string }>>;
  batchDeleteFiles(filepaths: string[], options?: BatchOperationOptions): Promise<Array<{ filepath: string; success: boolean; error?: string }>>;
  batchCopyFiles(copyOperations: Array<{ sourcePath: string; destinationPath: string; overwrite?: boolean }>, options?: BatchOperationOptions): Promise<Array<{ sourcePath: string; destinationPath: string; success: boolean; error?: string }>>;

  // Streaming batch operations for memory-efficient processing
  streamBatchFileContents(filepaths: string[], options?: BatchOperationOptions): AsyncGenerator<{ filepath: string; content?: string; error?: string }, void, unknown>;
  streamBatchCreateFiles(fileOperations: Array<{ filepath: string; content: string }>, options?: BatchOperationOptions): AsyncGenerator<{ filepath: string; success: boolean; error?: string }, void, unknown>;
  streamBatchDeleteFiles(filepaths: string[], options?: BatchOperationOptions): AsyncGenerator<{ filepath: string; success: boolean; error?: string }, void, unknown>;
}
