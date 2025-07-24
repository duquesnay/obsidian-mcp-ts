/**
 * Search filter interface for advanced search
 */
export interface SearchFilter {
  content?: {
    query?: string;
    regex?: string;
    caseSensitive?: boolean;
  };
  frontmatter?: {
    [key: string]: {
      operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'not_exists';
      value?: any;
    };
  };
  file?: {
    path?: {
      pattern?: string;
      regex?: string;
    };
    extension?: string[];
    size?: {
      min?: number;
      max?: number;
    };
    created?: {
      before?: string;
      after?: string;
    };
    modified?: {
      before?: string;
      after?: string;
    };
  };
  tags?: {
    include?: string[];
    exclude?: string[];
    mode?: 'all' | 'any';
  };
}

/**
 * Search options for advanced search
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  sort?: {
    field: 'name' | 'modified' | 'created' | 'size' | 'relevance';
    direction: 'asc' | 'desc';
  };
  includeContent?: boolean;
  contextLength?: number;
}

/**
 * Arguments for the AdvancedSearch tool
 */
export interface AdvancedSearchArgs {
  /**
   * Search filters to apply
   */
  filters: SearchFilter;
  /**
   * Search options
   */
  options?: SearchOptions;
}