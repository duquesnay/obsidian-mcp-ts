/**
 * Interface for directory operations in Obsidian vault.
 */
export interface IDirectoryOperationsClient {
  createDirectory(directoryPath: string, createParents?: boolean): Promise<{
    created: boolean;
    message?: string;
    parentsCreated?: boolean;
  }>;
  
  deleteDirectory(directoryPath: string, recursive?: boolean, permanent?: boolean): Promise<{
    deleted: boolean;
    message?: string;
    filesDeleted?: number;
  }>;
  
  moveDirectory(sourcePath: string, destinationPath: string): Promise<{
    movedFiles: string[];
    failedFiles: string[];
    success?: boolean;
    message?: string;
    oldPath?: string;
    newPath?: string;
    filesMovedCount?: number;
  }>;
  
  copyDirectory(sourcePath: string, destinationPath: string, overwrite?: boolean): Promise<{
    filesCopied: number;
    failedFiles: string[];
    message?: string;
  }>;

  copyDirectoryStream(
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
  }>;
}