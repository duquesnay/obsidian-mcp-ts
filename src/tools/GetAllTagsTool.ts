import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { GetAllTagsArgs } from './types/GetAllTagsArgs.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';

export class GetAllTagsTool extends BaseTool<GetAllTagsArgs> {
  name = 'obsidian_get_all_tags';
  description = 'List all unique tags in the vault with their usage counts. Includes both inline tags (#tag) and frontmatter tags.';
  
  metadata: ToolMetadata = {
    category: 'tags',
    keywords: ['tags', 'list', 'categories', 'labels', 'taxonomy', 'sort', 'pagination'],
    version: '1.1.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sortBy: {
        type: 'string',
        enum: ['name', 'count'],
        description: 'Sort tags by name or usage count'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order (default: asc for name, desc for count)'
      },
      limit: {
        type: 'integer',
        description: `Maximum number of tags to return (default: all tags, max: ${OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT})`,
        minimum: 1,
        maximum: OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT
      },
      offset: {
        type: 'integer',
        description: 'Number of tags to skip for pagination (default: 0)',
        minimum: 0
      }
    },
    required: []
  };

  async executeTyped(args: GetAllTagsArgs): Promise<ToolResponse> {
    try {
      const client = this.getClient();
      let tags = await client.getAllTags();
      
      // Apply sorting if requested
      if (args.sortBy) {
        const sortOrder = args.sortOrder || (args.sortBy === 'count' ? 'desc' : 'asc');
        tags = [...tags].sort((a, b) => {
          if (args.sortBy === 'name') {
            return sortOrder === 'asc' 
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          } else {
            return sortOrder === 'asc'
              ? a.count - b.count
              : b.count - a.count;
          }
        });
      }
      
      // Handle pagination
      const totalTags = tags.length;
      const isPaginated = args.limit !== undefined || args.offset !== undefined;
      
      if (isPaginated) {
        const limit = Math.min(args.limit || totalTags, OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT);
        const offset = args.offset || 0;
        
        const paginatedTags = tags.slice(offset, offset + limit);
        const hasMore = offset + limit < totalTags;
        
        return this.formatResponse({
          tags: paginatedTags,
          totalTags,
          hasMore,
          limit,
          offset,
          nextOffset: hasMore ? offset + limit : undefined,
          message: `Showing ${paginatedTags.length} of ${totalTags} unique tags`
        });
      }
      
      // Non-paginated response
      return this.formatResponse({
        totalTags: tags.length,
        tags: tags,
        message: `Found ${tags.length} unique tags in the vault`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}