import type { FileContentResponse, RecentChange } from '../../types/obsidian.js';

/**
 * Interface for file CRUD operations in Obsidian vault.
 */
export interface IFileOperationsClient {
  // List operations
  listFilesInVault(): Promise<string[]>;
  listFilesInDir(dirpath: string): Promise<string[]>;

  // Read operations
  getFileContents(filepath: string, format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'): Promise<FileContentResponse>;
  getBatchFileContents(filepaths: string[]): Promise<string>;

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

  // Batch write operations
  batchCreateFiles(fileOperations: Array<{ filepath: string; content: string }>): Promise<Array<{ filepath: string; success: boolean; error?: string }>>;
  batchUpdateFiles(fileOperations: Array<{ filepath: string; content: string }>): Promise<Array<{ filepath: string; success: boolean; error?: string }>>;
  batchDeleteFiles(filepaths: string[]): Promise<Array<{ filepath: string; success: boolean; error?: string }>>;
  batchCopyFiles(copyOperations: Array<{ sourcePath: string; destinationPath: string; overwrite?: boolean }>): Promise<Array<{ sourcePath: string; destinationPath: string; success: boolean; error?: string }>>;
}
