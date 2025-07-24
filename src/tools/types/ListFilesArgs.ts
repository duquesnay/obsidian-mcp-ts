/**
 * Arguments for list file operations with pagination support
 */
export interface ListFilesArgs {
  /** Maximum number of files to return */
  limit?: number;
  
  /** Number of files to skip (for pagination) */
  offset?: number;
}