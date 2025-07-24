/**
 * Arguments for the QueryStructure tool
 */
export interface QueryStructureArgs {
  /**
   * Path to the file (relative to vault root)
   */
  filepath: string;
  /**
   * Query configuration for structure analysis
   */
  query: {
    /**
     * What to query from the document
     */
    type: 'headings' | 'blocks' | 'all';
    /**
     * Optional filter for the query
     */
    filter?: {
      /**
       * Filter headings containing this text
       */
      text?: string;
      /**
       * Filter headings of specific level (1-6)
       */
      level?: number;
      /**
       * Minimum heading level to include
       */
      min_level?: number;
      /**
       * Maximum heading level to include
       */
      max_level?: number;
      /**
       * Filter headings whose path contains these elements
       */
      path_contains?: string[];
    };
    /**
     * Include content preview for each section
     */
    include_content_preview?: boolean;
  };
}