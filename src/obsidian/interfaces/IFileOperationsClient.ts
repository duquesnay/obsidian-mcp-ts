import type { FileContentResponse } from '../../types/obsidian.js';

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
}