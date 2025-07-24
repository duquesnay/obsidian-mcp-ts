/**
 * Arguments for the CopyFile tool
 */
export interface CopyFileArgs {
  /**
   * Path of the file to copy (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the copied file (relative to vault root)
   */
  destinationPath: string;
  /**
   * Whether to overwrite the destination file if it already exists (default: false)
   */
  overwrite?: boolean;
}
