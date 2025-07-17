/**
 * Type definitions for Obsidian API responses
 */

// File metadata returned by the API
export interface FileMetadata {
  path: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
}

// Search result structure
export interface SearchResult {
  path: string;
  matches?: number;
  content?: string;
}

// Simple search response
export interface SimpleSearchResponse {
  files?: string[];
  matches?: SearchResult[];
  [key: string]: unknown; // Allow additional fields
}

// Paginated search response
export interface PaginatedSearchResponse {
  results: SearchResult[];
  totalResults: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

// Complex search response (JsonLogic)
export interface ComplexSearchResponse {
  matches?: string[];
  results?: unknown[];
  [key: string]: unknown; // Allow additional fields
}

// Periodic note data
export interface PeriodicNoteData {
  path: string;
  exists: boolean;
  content?: string;
  [key: string]: unknown; // Allow additional fields
}

// Recent changes entry
export interface RecentChange {
  path: string;
  mtime: number;
  content?: string;
  [key: string]: unknown;
}

// Advanced search filters
export interface AdvancedSearchFilters {
  content?: {
    query?: string;
    regex?: string;
    caseSensitive?: boolean;
  };
  file?: {
    path?: {
      pattern?: string;
      regex?: string;
    };
    extension?: string[];
    created?: {
      before?: string;
      after?: string;
    };
    modified?: {
      before?: string;
      after?: string;
    };
    size?: {
      min?: number;
      max?: number;
    };
  };
  frontmatter?: Record<string, {
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'not_exists';
    value?: unknown;
  }>;
  tags?: {
    include?: string[];
    exclude?: string[];
    mode?: 'all' | 'any';
  };
}

// Advanced search options
export interface AdvancedSearchOptions {
  limit?: number;
  offset?: number;
  includeContent?: boolean;
  contextLength?: number;
  sort?: {
    field: 'name' | 'modified' | 'created' | 'size' | 'relevance';
    direction: 'asc' | 'desc';
  };
}

// Advanced search response
export interface AdvancedSearchResponse {
  results: Array<{
    path: string;
    score?: number;
    matches?: Array<{
      content: string;
      line: number;
    }>;
    [key: string]: unknown;
  }>;
  total?: number;
}

// Patch content headers
export interface PatchContentHeaders {
  'Content-Type': 'text/markdown' | 'application/json';
  'Target-Type': 'content' | 'frontmatter' | 'property' | 'heading' | 'block';
  'Target': string;
  'Target-Delimiter'?: string;
  'Trim-Target-Whitespace'?: 'true' | 'false';
  'Operation'?: 'append' | 'prepend' | 'replace' | 'remove' | 'add' | 'update';
}

// File content response - can be string or object depending on format
export type FileContentResponse = string | FileMetadata | Record<string, unknown>;