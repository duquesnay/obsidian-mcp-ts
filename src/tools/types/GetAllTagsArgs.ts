/**
 * Arguments for getting all tags with sorting and pagination
 */
export interface GetAllTagsArgs {
  /** Sort by name or count */
  sortBy?: 'name' | 'count';
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  
  /** Maximum number of tags to return */
  limit?: number;
  
  /** Number of tags to skip (for pagination) */
  offset?: number;
}