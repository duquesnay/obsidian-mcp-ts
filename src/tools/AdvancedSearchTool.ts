import { BaseTool } from './base.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

interface SearchFilter {
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
      after?: string;
      before?: string;
    };
    modified?: {
      after?: string;
      before?: string;
    };
  };
  tags?: {
    include?: string[];
    exclude?: string[];
    mode?: 'all' | 'any';
  };
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  sort?: {
    field: 'name' | 'modified' | 'created' | 'size' | 'relevance';
    direction: 'asc' | 'desc';
  };
  includeContent?: boolean;
  contextLength?: number;
}

export class AdvancedSearchTool extends BaseTool {
  name = 'obsidian_advanced_search';
  description = 'Advanced search in Obsidian vault notes (vault-only - NOT filesystem). Filter by content, metadata, tags.';
  
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
                type: 'array',
                items: { type: 'string' },
                description: 'Tags that must be present'
              },
              exclude: {
                type: 'array',
                items: { type: 'string' },
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
            type: 'number',
            description: 'Maximum number of results to return',
            default: 100,
            minimum: 1,
            maximum: 1000
          },
          offset: {
            type: 'number',
            description: 'Number of results to skip',
            default: 0,
            minimum: 0
          },
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
            type: 'number',
            description: 'Number of characters to include around matches',
            default: 100,
            minimum: 0,
            maximum: 500
          }
        }
      }
    },
    required: ['filters']
  };

  async executeTyped(args: {
    filters: SearchFilter;
    options?: SearchOptions;
  }): Promise<any> {
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