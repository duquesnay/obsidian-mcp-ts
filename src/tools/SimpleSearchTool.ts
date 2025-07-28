import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { SimpleSearchArgs } from './types/SimpleSearchArgs.js';
import { validateRequiredArgs, PAGINATION_SCHEMA } from '../utils/validation.js';
import { defaultCachedHandlers } from '../resources/CachedConcreteHandlers.js';

export class SimpleSearchTool extends BaseTool<SimpleSearchArgs> {
  name = 'obsidian_simple_search';
  description = 'Search text in Obsidian vault notes (vault-only - NOT filesystem search). Returns paginated results with 100-character context snippets by default (preview mode). Uses vault://search/{query} resource internally with 1-minute caching for optimal performance.';
  
  metadata: ToolMetadata = {
    category: 'search',
    keywords: ['search', 'find', 'query', 'text', 'content'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      contextLength: {
        type: 'integer',
        description: 'Number of characters to include around each match.',
        default: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
      },
      limit: {
        ...PAGINATION_SCHEMA.limit,
        default: OBSIDIAN_DEFAULTS.DEFAULT_SEARCH_LIMIT,
        maximum: OBSIDIAN_DEFAULTS.MAX_SEARCH_RESULTS
      },
      offset: PAGINATION_SCHEMA.offset
    },
    required: ['query']
  };

  async executeTyped(args: SimpleSearchArgs): Promise<ToolResponse> {
    try {
      // Use centralized validation
      try {
        validateRequiredArgs(args, ['query']);
      } catch (error) {
        return this.handleSimplifiedError(
          error,
          'Provide query parameter to specify what text to search for',
          {
            query: 'search text',
            limit: 50,
            contextLength: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
          }
        );
      }
      
      const limit = Math.min(args.limit || OBSIDIAN_DEFAULTS.DEFAULT_SEARCH_LIMIT, OBSIDIAN_DEFAULTS.MAX_SEARCH_RESULTS);
      const offset = args.offset || 0;
      
      // Build resource URI with mode parameter based on contextLength
      let resourceUri = `vault://search/${encodeURIComponent(args.query)}`;
      
      // Determine mode based on contextLength parameter
      if (args.contextLength !== undefined && args.contextLength > OBSIDIAN_DEFAULTS.CONTEXT_LENGTH) {
        // If contextLength is greater than default, use full mode
        resourceUri += '?mode=full';
      } else {
        // Use preview mode (default behavior)
        resourceUri += '?mode=preview';
      }
      
      // Use cached resource handler instead of direct client call for better performance
      const resourceData = await defaultCachedHandlers.search.handleRequest(resourceUri);
      
      // The resource now supports contextLength via mode parameter
      // Local pagination is still handled here for limit/offset
      const results = {
        results: resourceData.results,
        totalResults: resourceData.totalResults,
        hasMore: resourceData.hasMore
      };
      
      return this.formatResponse(results);
    } catch (error: unknown) {
      // Use the new handleHttpError method with custom handlers
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status) {
        return this.handleHttpError(error, {
          500: 'Search service error. The Obsidian REST API may be experiencing issues'
        });
      }
      
      // Handle search-specific errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('index') || errorMessage.includes('search')) {
        return this.handleSimplifiedError(
          error,
          'Search service may be unavailable. Try browsing files directly or check Obsidian plugin status'
        );
      }
      
      // Fallback to basic error handling
      return this.handleSimplifiedError(error);
    }
  }
}