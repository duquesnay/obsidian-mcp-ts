/**
 * Arguments for the MoveDirectory tool
 */
export interface MoveDirectoryArgs {
  /**
   * Current path of the directory to move (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the directory (relative to vault root)
   */
  destinationPath: string;
}
