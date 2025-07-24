/**
 * Interface for tag management operations in Obsidian vault.
 */
export interface ITagManagementClient {
  /**
   * Retrieves all unique tags in the vault with their usage counts.
   * Includes both inline tags (#tag) and frontmatter tags.
   */
  getAllTags(): Promise<Array<{ name: string; count: number }>>;

  /**
   * Retrieves all files that contain a specific tag.
   * Searches both inline tags (#tag) and frontmatter tags.
   */
  getFilesByTag(tagName: string): Promise<string[]>;

  /**
   * Renames a tag across the entire vault.
   * Updates both inline tags (#tag) and frontmatter tags in all files.
   */
  renameTag(oldTagName: string, newTagName: string): Promise<{
    filesUpdated: number;
    message?: string;
  }>;

  /**
   * Adds or removes tags from a specific file.
   * Can modify both inline tags and frontmatter tags.
   */
  manageFileTags(
    filePath: string,
    operation: 'add' | 'remove',
    tags: string[],
    location?: 'frontmatter' | 'inline' | 'both'
  ): Promise<{
    tagsModified: number;
    message?: string;
  }>;
}