/**
 * Arguments for the CopyDirectory tool
 */
export interface CopyDirectoryArgs {
  /**
   * Path of the directory to copy (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the copied directory (relative to vault root)
   */
  destinationPath: string;
  /**
   * Whether to overwrite existing files in the destination (default: false)
   */
  overwrite?: boolean;
}
