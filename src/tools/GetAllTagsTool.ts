import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { GetAllTagsArgs } from './types/GetAllTagsArgs.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA } from '../utils/validation.js';
import { defaultCachedHandlers } from '../resources/CachedConcreteHandlers.js';

export class GetAllTagsTool extends BaseTool<GetAllTagsArgs> {
  name = 'obsidian_get_all_tags';
  description = 'List all unique tags in the vault with usage counts.';
  
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
        ...PAGINATION_SCHEMA.limit,
        description: `Maximum number of tags to return (default: all, max: ${OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT})`,
        maximum: OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT
      },
      offset: PAGINATION_SCHEMA.offset
    },
    required: []
  };

  async executeTyped(args: GetAllTagsArgs): Promise<ToolResponse> {
    try {
      // Check if user wants simple listing (pagination or sorting) vs conversational summary
      const needsFullData = args.sortBy || args.sortOrder || args.limit !== undefined || args.offset !== undefined;
      const resourceMode = needsFullData ? 'full' : 'summary';
      
      if (resourceMode === 'summary') {
        // Use cached resource handler for summary mode
        const resourceData = await defaultCachedHandlers.tags.handleRequest(`vault://tags?mode=${resourceMode}`);
        
        // Return optimized summary for conversational use
        return this.formatResponse({
          mode: 'summary',
          totalTags: resourceData.totalTags,
          topTags: resourceData.topTags,
          usageStats: resourceData.usageStats,
          message: resourceData.message
        });
      }
      
      // For full mode, check if we can use resource-level pagination (when no custom sorting needed)
      const canUseResourcePagination = !args.sortBy || (args.sortBy === 'count' && args.sortOrder !== 'asc');
      
      if (canUseResourcePagination && (args.limit !== undefined || args.offset !== undefined)) {
        // Use resource-level pagination for better performance
        const params = new URLSearchParams({ mode: 'full' });
        if (args.limit !== undefined) params.append('limit', args.limit.toString());
        if (args.offset !== undefined) params.append('offset', args.offset.toString());
        
        const resourceData = await defaultCachedHandlers.tags.handleRequest(`vault://tags?${params.toString()}`);
        
        return this.formatResponse({
          mode: 'full',
          tags: resourceData.tags,
          totalTags: resourceData.totalTags,
          hasMore: resourceData.pagination?.hasMore,
          limit: resourceData.pagination?.limit,
          offset: resourceData.pagination?.offset,
          nextOffset: resourceData.pagination?.nextOffset,
          usageStats: resourceData.pagination?.usageStats,
          message: `Showing ${resourceData.tags.length} of ${resourceData.totalTags} unique tags (sorted by usage frequency)`
        });
      }
      
      // Fall back to tool-level processing for custom sorting
      const resourceData = await defaultCachedHandlers.tags.handleRequest(`vault://tags?mode=${resourceMode}`);
      let tags = resourceData.tags;
      
      // Apply custom sorting if requested
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
      
      // Handle tool-level pagination for custom-sorted results
      const totalTags = tags.length;
      const isPaginated = args.limit !== undefined || args.offset !== undefined;
      
      if (isPaginated) {
        const limit = Math.min(args.limit || totalTags, OBSIDIAN_DEFAULTS.MAX_LIST_LIMIT);
        const offset = args.offset || 0;
        
        const paginatedTags = tags.slice(offset, offset + limit);
        const hasMore = offset + limit < totalTags;
        
        return this.formatResponse({
          mode: 'full',
          tags: paginatedTags,
          totalTags,
          hasMore,
          limit,
          offset,
          nextOffset: hasMore ? offset + limit : undefined,
          message: `Showing ${paginatedTags.length} of ${totalTags} unique tags`
        });
      }
      
      // Non-paginated full response
      return this.formatResponse({
        mode: 'full',
        totalTags: tags.length,
        tags: tags,
        message: `Found ${tags.length} unique tags in the vault`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}