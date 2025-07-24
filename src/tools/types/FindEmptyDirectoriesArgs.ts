/**
 * Arguments for the FindEmptyDirectories tool
 */
export interface FindEmptyDirectoriesArgs {
  /**
   * Path to search within (relative to vault root). Leave empty to search entire vault.
   */
  searchPath?: string;
  /**
   * Whether to consider directories with only hidden files (like .DS_Store) as empty
   */
  includeHiddenFiles?: boolean;
}
