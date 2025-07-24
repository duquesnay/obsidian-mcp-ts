/**
 * Arguments for the GetRecentChanges tool
 */
export interface GetRecentChangesArgs {
  /**
   * Specific directory to check for recent changes (optional)
   */
  directory?: string;
  /**
   * Maximum number of files to return
   */
  limit?: number;
  /**
   * Number of files to skip
   */
  offset?: number;
  /**
   * Number of characters of content to include for each file
   */
  contentLength?: number;
}
