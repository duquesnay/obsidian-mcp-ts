/**
 * Arguments for the CreateDirectory tool
 */
export interface CreateDirectoryArgs {
  /**
   * Path of the directory to create (relative to vault root)
   */
  directoryPath: string;
  /**
   * Whether to create parent directories if they do not exist (default: true)
   */
  createParents?: boolean;
}
