/**
 * Arguments for the GetFileFormatted tool
 */
export interface GetFileFormattedArgs {
  /**
   * Path to file to retrieve (relative to vault root)
   */
  filepath: string;
  /**
   * Format to retrieve: plain (markdown stripped), html (rendered), content (default markdown)
   */
  format: 'plain' | 'html' | 'content';
}
