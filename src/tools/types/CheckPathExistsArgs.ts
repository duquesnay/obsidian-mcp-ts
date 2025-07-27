/**
 * Arguments for the CheckPathExists tool
 */
export interface CheckPathExistsArgs extends Record<string, unknown> {
  /**
   * Path to check for existence (relative to vault root)
   */
  path: string;
}
