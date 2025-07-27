/**
 * Arguments for the RenameTag tool
 */
export interface RenameTagArgs extends Record<string, unknown> {
  /**
   * The current tag name to rename (with or without # prefix)
   */
  oldTagName: string;
  /**
   * The new tag name (with or without # prefix)
   */
  newTagName: string;
}
