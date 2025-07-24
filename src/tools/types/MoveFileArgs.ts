/**
 * Arguments for the MoveFile tool
 */
export interface MoveFileArgs {
  /**
   * Current path of the file to move (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the file (relative to vault root).
   * Can be in a different directory and/or have a different filename.
   */
  destinationPath: string;
}
