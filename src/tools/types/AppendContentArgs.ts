/**
 * Arguments for AppendContentTool
 */
export interface AppendContentArgs {
  /** Path of the file to append to (relative to vault root) */
  filepath: string;
  
  /** The content to append to the file */
  content: string;
  
  /** Create the file if it doesn't exist (default: true) */
  createIfNotExists?: boolean;
}