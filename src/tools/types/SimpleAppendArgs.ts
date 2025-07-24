/**
 * Arguments for the SimpleAppend tool
 */
export interface SimpleAppendArgs {
  /**
   * Path to the file (relative to vault root)
   */
  filepath: string;
  /**
   * Text to append to the end of the file
   */
  content: string;
  /**
   * Create the file if it doesn't exist (default: false)
   */
  create_file_if_missing?: boolean;
}