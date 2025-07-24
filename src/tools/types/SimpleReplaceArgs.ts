/**
 * Arguments for the SimpleReplace tool
 */
export interface SimpleReplaceArgs {
  /**
   * Path to the file (relative to vault root)
   */
  filepath: string;
  /**
   * Text to find (exact match)
   */
  find: string;
  /**
   * Text to replace with
   */
  replace: string;
}