import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { ObsidianError } from '../../types/errors.js';
import { OBSIDIAN_DEFAULTS, TIMEOUTS } from '../../constants.js';
import type { ISearchClient } from '../interfaces/ISearchClient.js';
import type {
  SimpleSearchResponse,
  ComplexSearchResponse,
  AdvancedSearchFilters,
  AdvancedSearchOptions,
  PaginatedSearchResponse
} from '../../types/obsidian.js';
import type { JsonLogicQuery } from '../../types/jsonlogic.js';
import type { ObsidianClientConfig } from '../ObsidianClient.js';

/**
 * Client for search operations in Obsidian vault.
 * Handles simple, complex, and advanced search functionality.
 */
export class SearchClient implements ISearchClient {
  private axiosInstance: AxiosInstance;

  constructor(config: ObsidianClientConfig) {
    const protocol = config.protocol || 'https';
    const host = config.host || OBSIDIAN_DEFAULTS.HOST;
    const port = config.port || OBSIDIAN_DEFAULTS.PORT;
    const verifySsl = config.verifySsl ?? true;

    this.axiosInstance = axios.create({
      baseURL: `${protocol}://${host}:${port}`,
      timeout: TIMEOUTS.DEFAULT_REQUEST,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: verifySsl
      })
    });
  }

  private async safeCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ errorCode?: number; message?: string }>;

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          const code = errorData.errorCode || axiosError.response.status || -1;
          const message = errorData.message || axiosError.message || '<unknown>';
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Error ${code}: ${message}`, code);
        }

        if (axiosError.code) {
          const contextInfo = this.getErrorContext(axiosError);
          throw new ObsidianError(`${contextInfo}Network error (${axiosError.code}): ${axiosError.message}`);
        }

        const contextInfo = this.getErrorContext(axiosError);
        throw new ObsidianError(`${contextInfo}Request failed: ${axiosError.message}`);
      }
      throw error;
    }
  }

  private getErrorContext(axiosError: AxiosError): string {
    const method = axiosError.config?.method?.toUpperCase() || 'REQUEST';
    const url = axiosError.config?.url || 'unknown endpoint';
    const status = axiosError.response?.status;

    let context = `${method} ${url} - `;

    if (status) {
      if (status === 401) {
        context += 'Authentication failed (check API key) - ';
      } else if (status === 403) {
        context += 'Access forbidden (check permissions) - ';
      } else if (status === 404) {
        context += 'Resource not found - ';
      } else if (status >= 500) {
        context += 'Server error (Obsidian plugin may be unavailable) - ';
      } else if (status >= 400) {
        context += 'Client error - ';
      }
    }

    return context;
  }

  async search(
    query: string,
    contextLength: number = OBSIDIAN_DEFAULTS.CONTEXT_LENGTH,
    limit?: number,
    offset?: number
  ): Promise<PaginatedSearchResponse | SimpleSearchResponse> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/simple/', null, {
        params: {
          query,
          contextLength
        }
      });

      // Handle pagination in-memory since the REST API doesn't support it
      const allResults = response.data;
      if (!Array.isArray(allResults)) {
        return allResults;
      }

      const totalResults = allResults.length;
      const startIndex = offset || 0;
      const endIndex = limit ? startIndex + limit : totalResults;
      const paginatedResults = allResults.slice(startIndex, endIndex);

      return {
        results: paginatedResults,
        totalResults: totalResults,
        hasMore: endIndex < totalResults,
        offset: startIndex,
        limit: limit || totalResults
      };
    });
  }

  async complexSearch(query: JsonLogicQuery): Promise<ComplexSearchResponse> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/', query);
      return response.data;
    });
  }

  async advancedSearch(
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
  }> {
    return this.safeCall(async () => {
      const response = await this.axiosInstance.post('/search/advanced', {
        filters,
        options
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUTS.SEARCH_OPERATIONS
      });

      const result = response.data;
      return {
        totalResults: result.totalResults || 0,
        results: result.results || [],
        hasMore: result.hasMore || false
      };
    });
  }
}