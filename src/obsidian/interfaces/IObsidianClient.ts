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
  PaginatedSearchResponse,
  SearchResult
} from '../../types/obsidian.js';
import type { JsonLogicQuery } from '../../types/jsonlogic.js';
import type { IPeriodicNotesClient } from './IPeriodicNotesClient.js';

/**
 * Interface for Obsidian client operations.
 * This allows for dependency injection and easier testing.
 */
export interface IObsidianClient {
  // File Operations
  listFilesInVault(): Promise<string[]>;
  listFilesInDir(dirpath: string): Promise<string[]>;
  getFileContents(filepath: string, format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html'): Promise<FileContentResponse>;
  getBatchFileContents(filepaths: string[]): Promise<string>;
  createFile(filepath: string, content: string): Promise<void>;
  updateFile(filepath: string, content: string): Promise<void>;
  deleteFile(filepath: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  moveFile(sourcePath: string, destinationPath: string): Promise<void>;
  copyFile(sourcePath: string, destinationPath: string, overwrite?: boolean): Promise<void>;
  checkPathExists(path: string): Promise<{ exists: boolean; type: 'file' | 'directory' | null }>;
  
  // Directory Operations
  createDirectory(directoryPath: string, createParents?: boolean): Promise<{
    created: boolean,
    message?: string,
    parentsCreated?: boolean
  }>;
  deleteDirectory(directoryPath: string, recursive?: boolean, permanent?: boolean): Promise<{
    deleted: boolean,
    message?: string,
    filesDeleted?: number
  }>;
  moveDirectory(sourcePath: string, destinationPath: string): Promise<{
    movedFiles: string[],
    failedFiles: string[],
    success?: boolean,
    message?: string,
    oldPath?: string,
    newPath?: string,
    filesMovedCount?: number
  }>;
  copyDirectory(sourcePath: string, destinationPath: string, overwrite?: boolean): Promise<{
    filesCopied: number,
    failedFiles: string[],
    message?: string
  }>;
  
  // Search Operations
  search(query: string, contextLength?: number, limit?: number, offset?: number): Promise<PaginatedSearchResponse | SimpleSearchResponse>;
  complexSearch(query: JsonLogicQuery): Promise<ComplexSearchResponse>;
  advancedSearch(
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
  }>;
  
  // Tag Management Operations
  getAllTags(): Promise<Array<{ name: string; count: number }>>;
  getFilesByTag(tagName: string): Promise<string[]>;
  renameTag(oldTagName: string, newTagName: string): Promise<{
    filesUpdated: number;
    message?: string;
  }>;
  manageFileTags(
    filePath: string,
    operation: 'add' | 'remove',
    tags: string[],
    location?: 'frontmatter' | 'inline' | 'both'
  ): Promise<{
    tagsModified: number;
    message?: string;
  }>;
  
  // Periodic Notes Operations
  getRecentChanges(
    directory?: string,
    limit?: number,
    offset?: number,
    contentLength?: number
  ): Promise<RecentChange[]>;
  
  // Content Editing Operations
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
  appendContent(filepath: string, content: string, createIfNotExists?: boolean): Promise<void>;
  
  // Method to get PeriodicNotesClient
  getPeriodicNotesClient(): IPeriodicNotesClient;
}