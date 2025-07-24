/**
 * Arguments for the ManageFileTags tool
 */
export interface ManageFileTagsArgs {
  /**
   * Path to the file to modify (relative to vault root)
   */
  filePath: string;
  /**
   * Whether to add or remove tags
   */
  operation: 'add' | 'remove';
  /**
   * Array of tags to add or remove (with or without # prefix)
   */
  tags: string[];
  /**
   * Where to add/remove tags (default: frontmatter)
   */
  location?: 'frontmatter' | 'inline' | 'both';
}
