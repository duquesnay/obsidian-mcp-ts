/**
 * Arguments for the GetFilesByTag tool
 */
export interface GetFilesByTagArgs extends Record<string, unknown> {
  /**
   * The tag name to search for (with or without # prefix)
   */
  tagName: string;
}