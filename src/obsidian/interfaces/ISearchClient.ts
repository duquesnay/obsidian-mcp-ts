import type {
  SimpleSearchResponse,
  ComplexSearchResponse,
  AdvancedSearchFilters,
  AdvancedSearchOptions,
  PaginatedSearchResponse
} from '../../types/obsidian.js';
import type { JsonLogicQuery } from '../../types/jsonlogic.js';

/**
 * Interface for search operations in Obsidian vault.
 */
export interface ISearchClient {
  search(
    query: string,
    contextLength?: number,
    limit?: number,
    offset?: number
  ): Promise<PaginatedSearchResponse | SimpleSearchResponse>;
  
  complexSearch(query: JsonLogicQuery): Promise<ComplexSearchResponse>;
  
  advancedSearch(
    filters: AdvancedSearchFilters,
    options: AdvancedSearchOptions
  ): Promise<{
    totalResults: number;
    results: Array<{
      path: string;
      score?: number;
      matches?: Array<{
        type: 'content' | 'frontmatter' | 'tag';
        context?: string;
        lineNumber?: number;
        field?: string;
      }>;
      metadata?: {
        size: number;
        created: string;
        modified: string;
        tags?: string[];
      };
      content?: string;
    }>;
    hasMore: boolean;
  }>;
}