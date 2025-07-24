/**
 * Arguments for listing files in directory with pagination support
 */
export interface ListFilesInDirArgs {
  /** Directory path relative to vault root */
  dirpath: string;
  
  /** Maximum number of files to return */
  limit?: number;
  
  /** Number of files to skip (for pagination) */
  offset?: number;
}