/**
 * Arguments for GetFileContentsTool
 */
export interface GetFileContentsArgs {
  /** Path to get the content from (relative to vault root) */
  filepath: string;
  
  /** Format to retrieve: content (default), metadata, frontmatter, plain, html */
  format?: 'content' | 'metadata' | 'frontmatter' | 'plain' | 'html';
}