/**
 * Shared pagination system for Obsidian MCP resources
 * 
 * Provides standardized pagination parameter parsing, metadata generation,
 * and data slicing across all paginated resources.
 */

export interface PaginationParams {
  style: 'offset' | 'page' | 'token' | 'none';
  limit: number;
  offset: number;
  page?: number;
  token?: string;
}

export interface PaginationMetadata {
  totalItems: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  nextOffset?: number;
  previousOffset?: number;
  currentPage: number;
  totalPages: number;
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  tokenType?: string;
}

export class PaginationSystem {
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 1000;

  /**
   * Parse pagination parameters from URI query string
   */
  static parseParameters(uri: string, options: PaginationOptions = {}): PaginationParams {
    const { 
      defaultLimit = PaginationSystem.DEFAULT_LIMIT,
      maxLimit = PaginationSystem.MAX_LIMIT,
      tokenType
    } = options;

    const url = new URL(uri, 'vault://');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const pageParam = url.searchParams.get('page');
    const tokenParam = url.searchParams.get('token');

    // Parse and validate limit
    const limit = limitParam 
      ? Math.min(parseInt(limitParam, 10), maxLimit)
      : defaultLimit;

    // Handle continuation token
    if (tokenParam && tokenType) {
      try {
        const decoded = JSON.parse(atob(tokenParam));
        if (decoded.type === tokenType) {
          return {
            style: 'token',
            limit,
            offset: decoded.offset || 0,
            token: tokenParam
          };
        }
      } catch (e) {
        // Invalid token, fall through to other parameters
      }
    }

    // Handle page-based pagination
    if (pageParam && !offsetParam) {
      const page = Math.max(1, parseInt(pageParam, 10));
      return {
        style: 'page',
        limit,
        offset: (page - 1) * limit,
        page
      };
    }

    // Handle offset-based pagination
    if (offsetParam || limitParam) {
      const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;
      return {
        style: 'offset',
        limit,
        offset
      };
    }

    // No pagination requested
    return {
      style: 'none',
      limit: defaultLimit,
      offset: 0
    };
  }

  /**
   * Generate standardized pagination metadata
   */
  static generateMetadata(params: PaginationParams, totalItems: number): PaginationMetadata {
    const { limit, offset } = params;
    const hasMore = offset + limit < totalItems;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalItems / limit);

    const metadata: PaginationMetadata = {
      totalItems,
      hasMore,
      limit,
      offset,
      currentPage,
      totalPages
    };

    // Add navigation offsets
    if (hasMore) {
      metadata.nextOffset = offset + limit;
    }

    if (offset > 0) {
      metadata.previousOffset = Math.max(0, offset - limit);
    }

    return metadata;
  }

  /**
   * Apply pagination to data array
   */
  static applyPagination<T>(data: T[], params: PaginationParams): T[] {
    const { limit, offset } = params;
    return data.slice(offset, offset + limit);
  }

  /**
   * Generate continuation token for stateful pagination
   */
  static generateContinuationToken(type: string, query: string, offset: number): string {
    const tokenData = { type, query, offset };
    return btoa(JSON.stringify(tokenData));
  }

  /**
   * Determine if pagination is requested based on parameters
   */
  static isPaginationRequested(params: PaginationParams): boolean {
    return params.style !== 'none';
  }

  /**
   * Create a paginated response structure
   */
  static createPaginatedResponse<T>(
    data: T[],
    params: PaginationParams,
    totalItems: number,
    additionalMetadata?: Record<string, any>
  ) {
    const paginatedData = PaginationSystem.applyPagination(data, params);
    const pagination = PaginationSystem.generateMetadata(params, totalItems);

    return {
      data: paginatedData,
      pagination: {
        ...pagination,
        ...additionalMetadata
      }
    };
  }
}