import { AdvancedSearchArgs, SearchFilter, SearchOptions } from './types/AdvancedSearchArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA, TAGS_ARRAY_SCHEMA, CONTEXT_LENGTH_SCHEMA } from '../utils/validation.js';

export class AdvancedSearchTool extends BaseTool<AdvancedSearchArgs> {
  name = 'obsidian_advanced_search';
  description = 'Advanced search in Obsidian vault notes. Filter by content, metadata, tags.';
  
  metadata: ToolMetadata = {
    category: 'search',
    keywords: ['search', 'advanced', 'filter', 'query', 'find', 'metadata', 'tags'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filters: {
        type: 'object',
        description: 'Search filters to apply',
        properties: {
          content: {
            type: 'object',
            description: 'Content search filters',
            properties: {
              query: {
                type: 'string',
                description: 'Text query to search for'
              },
              regex: {
                type: 'string',
                description: 'Regular expression pattern'
              },
              caseSensitive: {
                type: 'boolean',
                description: 'Whether search is case sensitive',
                default: false
              }
            }
          },
          frontmatter: {
            type: 'object',
            description: 'Frontmatter field filters (key-value pairs with operators)',
            additionalProperties: {
              type: 'object',
              properties: {
                operator: {
                  type: 'string',
                  enum: ['equals', 'contains', 'gt', 'lt', 'gte', 'lte', 'exists', 'not_exists'],
                  description: 'Comparison operator'
                },
                value: {
                  description: 'Value to compare (not needed for exists/not_exists)'
                }
              },
              required: ['operator']
            }
          },
          file: {
            type: 'object',
            description: 'File metadata filters',
            properties: {
              path: {
                type: 'object',
                properties: {
                  pattern: {
                    type: 'string',
                    description: 'Glob pattern for file paths'
                  },
                  regex: {
                    type: 'string',
                    description: 'Regex pattern for file paths'
                  }
                }
              },
              extension: {
                type: 'array',
                items: { type: 'string' },
                description: 'File extensions to include (without dot)'
              },
              size: {
                type: 'object',
                properties: {
                  min: {
                    type: 'number',
                    description: 'Minimum file size in bytes'
                  },
                  max: {
                    type: 'number',
                    description: 'Maximum file size in bytes'
                  }
                }
              },
              created: {
                type: 'object',
                properties: {
                  after: {
                    type: 'string',
                    description: 'ISO date string for files created after'
                  },
                  before: {
                    type: 'string',
                    description: 'ISO date string for files created before'
                  }
                }
              },
              modified: {
                type: 'object',
                properties: {
                  after: {
                    type: 'string',
                    description: 'ISO date string for files modified after'
                  },
                  before: {
                    type: 'string',
                    description: 'ISO date string for files modified before'
                  }
                }
              }
            }
          },
          tags: {
            type: 'object',
            description: 'Tag filters',
            properties: {
              include: {
                ...TAGS_ARRAY_SCHEMA,
                description: 'Tags that must be present'
              },
              exclude: {
                ...TAGS_ARRAY_SCHEMA,
                description: 'Tags that must not be present'
              },
              mode: {
                type: 'string',
                enum: ['all', 'any'],
                description: 'Whether all or any of the included tags must match',
                default: 'all'
              }
            }
          }
        }
      },
      options: {
        type: 'object',
        description: 'Search options',
        properties: {
          limit: {
            ...PAGINATION_SCHEMA.limit,
            default: OBSIDIAN_DEFAULTS.DEFAULT_ADVANCED_SEARCH_LIMIT,
            maximum: OBSIDIAN_DEFAULTS.MAX_ADVANCED_SEARCH_RESULTS
          },
          offset: PAGINATION_SCHEMA.offset,
          sort: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['name', 'modified', 'created', 'size', 'relevance'],
                description: 'Field to sort by',
                default: 'relevance'
              },
              direction: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort direction',
                default: 'desc'
              }
            }
          },
          includeContent: {
            type: 'boolean',
            description: 'Whether to include file content in results',
            default: false
          },
          contextLength: {
            ...CONTEXT_LENGTH_SCHEMA,
            default: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH,
            maximum: OBSIDIAN_DEFAULTS.MAX_CONTEXT_LENGTH
          }
        }
      }
    },
    required: ['filters']
  };

  async executeTyped(args: AdvancedSearchArgs): Promise<ToolResponse> {
    try {
      if (!args.filters) {
        throw new McpError(ErrorCode.InvalidParams, 'filters are required');
      }

      // Validate at least one filter is provided
      const hasFilter = args.filters.content || 
                       args.filters.frontmatter || 
                       args.filters.file || 
                       args.filters.tags;
      
      if (!hasFilter) {
        throw new McpError(ErrorCode.InvalidParams, 'At least one filter must be specified');
      }

      const client = this.getClient();
      const results = await client.advancedSearch(args.filters, args.options || {});
      
      return this.formatResponse({
        success: true,
        totalResults: results.totalResults,
        results: results.results,
        hasMore: results.hasMore
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}