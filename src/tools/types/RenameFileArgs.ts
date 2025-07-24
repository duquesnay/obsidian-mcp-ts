/**
 * Arguments for the RenameFile tool
 */
export interface RenameFileArgs {
  /**
   * Current path of the file to rename (relative to vault root)
   */
  oldPath: string;
  /**
   * New path for the file (relative to vault root). Must be in the same directory as the old path.
   */
  newPath: string;
}
