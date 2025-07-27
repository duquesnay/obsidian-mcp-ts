/**
 * Arguments for the DeleteDirectory tool
 */
export interface DeleteDirectoryArgs extends Record<string, unknown> {
  /**
   * Path of the directory to delete (relative to vault root)
   */
  directoryPath: string;
  /**
   * Whether to delete directory and all its contents recursively (default: false)
   */
  recursive?: boolean;
  /**
   * Permanently delete directory instead of moving to trash (default: false)
   */
  permanent?: boolean;
}
