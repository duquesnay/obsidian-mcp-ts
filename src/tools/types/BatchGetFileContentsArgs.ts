/**
 * Arguments for the BatchGetFileContents tool
 */
export interface BatchGetFileContentsArgs extends Record<string, unknown> {
  /**
   * Array of paths to get contents from (relative to vault root)
   */
  filepaths: string[];
  /**
   * Page number (0-based) for pagination. Optional.
   */
  page?: number;
  /**
   * Number of files per page. Defaults to 10. Optional.
   */
  pageSize?: number;
}
