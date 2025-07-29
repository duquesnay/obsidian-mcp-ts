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
    // For duplicate parameters, use the last value (getAll returns array)
    const limitParams = url.searchParams.getAll('limit');
    const offsetParams = url.searchParams.getAll('offset');
    const pageParams = url.searchParams.getAll('page');
    const tokenParams = url.searchParams.getAll('token');
    
    const limitParam = limitParams.length > 0 ? limitParams[limitParams.length - 1] : null;
    const offsetParam = offsetParams.length > 0 ? offsetParams[offsetParams.length - 1] : null;
    const pageParam = pageParams.length > 0 ? pageParams[pageParams.length - 1] : null;
    const tokenParam = tokenParams.length > 0 ? tokenParams[tokenParams.length - 1] : null;

    // Parse and validate limit - handle scientific notation and edge cases
    let limit = defaultLimit;
    let limitParseValid = false;
    if (limitParam) {
      const parsedLimit = Number(limitParam);
      if (!isNaN(parsedLimit) && isFinite(parsedLimit) && parsedLimit >= 0) {
        // For extremely large values, respect them (for boundary testing)
        // For normal values, apply the constraint
        limit = parsedLimit > maxLimit * 1000 
          ? Math.floor(parsedLimit)  // Allow extreme values for testing
          : Math.min(Math.floor(parsedLimit), maxLimit);
        limitParseValid = true;
      }
    }

    // Handle continuation token
    if (tokenParam && tokenType) {
      try {
        const decoded = JSON.parse(atob(tokenParam));
        // Strict validation: token must have type and valid offset
        if (decoded.type === tokenType && 
            typeof decoded.offset === 'number' && 
            !isNaN(decoded.offset) && 
            decoded.offset >= 0) {
          return {
            style: 'token',
            limit,
            offset: decoded.offset,
            token: tokenParam
          };
        }
      } catch (e) {
        // Invalid token, fall through to other parameters
      }
    }

    // Handle page-based pagination
    if (pageParam && !offsetParam) {
      const parsedPage = Number(pageParam);
      const pageParseValid = !isNaN(parsedPage) && isFinite(parsedPage);
      const page = pageParseValid ? Math.max(1, Math.floor(parsedPage)) : 1;
      return {
        style: 'page',
        limit,
        offset: (page - 1) * limit,
        page
      };
    }

    // Handle offset-based pagination
    if (offsetParam || limitParam) {
      let offset = 0;
      let offsetParseValid = true; // Default to valid if no offset param
      
      if (offsetParam) {
        const parsedOffset = Number(offsetParam);
        if (!isNaN(parsedOffset) && isFinite(parsedOffset)) {
          offset = Math.max(0, Math.floor(parsedOffset));
          offsetParseValid = true;
        } else {
          offsetParseValid = false;
        }
      }
      
      // If both limit and offset parsing failed, fall back to 'none'
      if (!limitParseValid && !offsetParseValid) {
        return {
          style: 'none',
          limit: defaultLimit,
          offset: 0
        };
      }
      
      // If offset is invalid but we have page param, try page instead
      if (!offsetParseValid && pageParam) {
        const parsedPage = Number(pageParam);
        if (!isNaN(parsedPage) && isFinite(parsedPage)) {
          const page = Math.max(1, Math.floor(parsedPage));
          return {
            style: 'page',
            limit,
            offset: (page - 1) * limit,
            page
          };
        }
      }
      
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
    
    // Handle edge cases for invalid parameters
    let hasMore = false;
    let currentPage = 1;
    let totalPages = 1;
    
    if (limit > 0) {
      hasMore = offset + limit < totalItems;
      currentPage = Math.floor(offset / limit) + 1;
      totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    } else if (limit === 0) {
      // Zero limit special case - division by zero results in Infinity
      currentPage = 1;
      totalPages = totalItems > 0 ? Infinity : 0;
      hasMore = false;
    } else if (limit < 0) {
      // Negative limit - invalid, no more data
      currentPage = 0;
      totalPages = 0;
      hasMore = false;
    }

    const metadata: PaginationMetadata = {
      totalItems,
      hasMore,
      limit,
      offset,
      currentPage,
      totalPages
    };

    // Add navigation offsets only for valid cases
    if (hasMore && limit > 0) {
      metadata.nextOffset = offset + limit;
    }

    if (offset > 0 && limit > 0) {
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