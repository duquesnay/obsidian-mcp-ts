import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GetAllTagsTool } from '../../src/tools/GetAllTagsTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { defaultCachedHandlers } from '../../src/resources/CachedConcreteHandlers.js';

describe('GetAllTagsTool', () => {
  let tool: GetAllTagsTool;
  let mockClient: any;
  let originalHandleRequest: any;

  beforeEach(() => {
    tool = new GetAllTagsTool();
    mockClient = {
      getAllTags: vi.fn()
    };
    tool.getClient = vi.fn().mockReturnValue(mockClient);
    
    // Store original handler for later restoration
    originalHandleRequest = defaultCachedHandlers.tags.handleRequest;
  });

  afterEach(() => {
    // Restore original handler
    defaultCachedHandlers.tags.handleRequest = originalHandleRequest;
  });

  describe('Resource-level pagination', () => {
    it('should use resource-level pagination for count-based sorting with default desc order', async () => {
      // Mock resource handler to return paginated response
      const mockResourceResponse = {
        mode: 'full',
        tags: [
          { name: 'work', count: 20 },
          { name: 'project', count: 15 }
        ],
        totalTags: 10,
        pagination: {
          totalItems: 10,
          hasMore: true,
          limit: 2,
          offset: 0,
          nextOffset: 2,
          usageStats: {
            totalUsages: 86,
            averageUsage: 8.6,
            medianUsage: 7.5
          }
        }
      };

      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue(mockResourceResponse);

      // When - request with pagination and count sorting (default desc)
      const result = await tool.executeTyped({ 
        limit: 2, 
        offset: 0,
        sortBy: 'count'
      });

      // Then - should use resource-level pagination
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full&limit=2&offset=0');
      expect(result.text).toContain('Showing 2 of 10 unique tags (sorted by usage frequency)');
    });

    it('should use resource-level pagination when no custom sorting specified', async () => {
      // Mock resource handler
      const mockResourceResponse = {
        mode: 'full',
        tags: [{ name: 'tag1', count: 5 }],
        totalTags: 1,
        pagination: {
          totalItems: 1,
          hasMore: false,
          limit: 10,
          offset: 0,
          nextOffset: undefined
        }
      };

      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue(mockResourceResponse);

      // When - request with only pagination
      const result = await tool.executeTyped({ limit: 10, offset: 0 });

      // Then - should use resource-level pagination
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full&limit=10&offset=0');
    });

    it('should fall back to tool-level processing for custom name sorting', async () => {
      // Mock resource handler to return full tag list
      const mockResourceResponse = {
        mode: 'full',
        tags: [
          { name: 'zebra', count: 5 },
          { name: 'alpha', count: 10 }
        ],
        totalTags: 2
      };

      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue(mockResourceResponse);

      // When - request with name sorting
      const result = await tool.executeTyped({ 
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 10
      });

      // Then - should get full data and apply custom sorting
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full');
      
      const parsedResult = JSON.parse(result.text);
      expect(parsedResult.tags[0].name).toBe('alpha'); // Should be sorted alphabetically
      expect(parsedResult.tags[1].name).toBe('zebra');
    });

    it('should fall back to tool-level processing for count asc sorting', async () => {
      // Mock resource handler
      const mockResourceResponse = {
        mode: 'full',
        tags: [
          { name: 'high', count: 20 },
          { name: 'low', count: 5 }
        ],
        totalTags: 2
      };

      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue(mockResourceResponse);

      // When - request with count asc sorting (not default desc)
      const result = await tool.executeTyped({ 
        sortBy: 'count',
        sortOrder: 'asc',
        limit: 10
      });

      // Then - should get full data and apply custom sorting
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full');
      
      const parsedResult = JSON.parse(result.text);
      expect(parsedResult.tags[0].name).toBe('low'); // Should be sorted by count ascending
      expect(parsedResult.tags[1].name).toBe('high');
    });
  });

  describe('Pagination metadata handling', () => {
    it('should include usage statistics from resource-level pagination', async () => {
      // Mock resource handler with usage stats
      const mockResourceResponse = {
        mode: 'full',
        tags: [{ name: 'tag1', count: 5 }],
        totalTags: 10,
        pagination: {
          totalItems: 10,
          hasMore: true,
          limit: 1,
          offset: 0,
          nextOffset: 1,
          usageStats: {
            totalUsages: 86,
            averageUsage: 8.6,
            medianUsage: 7.5
          }
        }
      };

      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue(mockResourceResponse);

      // When - request with pagination
      const result = await tool.executeTyped({ limit: 1, offset: 0 });

      // Then - should include usage statistics
      const parsedResult = JSON.parse(result.text);
      expect(parsedResult.usageStats).toEqual({
        totalUsages: 86,
        averageUsage: 8.6,
        medianUsage: 7.5
      });
    });
  });

  describe('Tool description', () => {
    it('should have a clear description', () => {
      const tool = new GetAllTagsTool();

      expect(tool.description).toContain('tags');
      expect(tool.description).toContain('vault');
    });
  });

  describe('Large vault optimization', () => {
    it('should handle pagination for large tag lists', async () => {
      // Generate mock data for a large number of tags
      const totalTags = 5000;
      const paginatedTags = Array.from({ length: 100 }, (_, i) => ({
        name: `tag-${i}`,
        count: Math.floor(Math.random() * 100) + 1
      }));
      
      // Mock the cached handler to return paginated results (since we're using resource-level pagination)
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ 
        mode: 'full',
        tags: paginatedTags,
        totalTags: totalTags,
        pagination: {
          hasMore: true,
          limit: 100,
          offset: 0,
          nextOffset: 100,
          usageStats: {}
        }
      });

      // Test with pagination parameters
      const result = await tool.executeTyped({ 
        limit: 100,
        offset: 0 
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.mode).toBe('full');
      expect(data.tags).toHaveLength(100);
      expect(data.totalTags).toBe(totalTags);
      expect(data.hasMore).toBe(true);
      expect(data.nextOffset).toBe(100);
      
      // Verify it used full mode with pagination parameters
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full&limit=100&offset=0');
    });

    it('should return optimized summary when no pagination is requested', async () => {
      const mockSummaryResponse = {
        mode: 'summary',
        totalTags: 3,
        topTags: [
          { name: 'tag1', count: 5 },
          { name: 'tag2', count: 3 },
          { name: 'tag3', count: 1 }
        ],
        usageStats: {
          totalUsages: 9,
          averageUsage: 3,
          medianUsage: 3
        },
        message: 'Use ?mode=full for complete tag list'
      };
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue(mockSummaryResponse);

      const result = await tool.executeTyped({});

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.mode).toBe('summary');
      expect(data.topTags).toEqual(mockSummaryResponse.topTags);
      expect(data.totalTags).toBe(3);
      expect(data.usageStats).toEqual(mockSummaryResponse.usageStats);
      expect(data.message).toBe('Use ?mode=full for complete tag list');
      
      // Verify it used summary mode
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=summary');
    });

    it('should sort tags by count when sortBy parameter is provided', async () => {
      const tags = [
        { name: 'tag1', count: 5 },
        { name: 'tag2', count: 10 },
        { name: 'tag3', count: 1 }
      ];
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ 
        mode: 'full',
        tags: tags,
        totalTags: 3
      });

      const result = await tool.executeTyped({ 
        sortBy: 'count',
        sortOrder: 'desc'
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.mode).toBe('full');
      expect(data.tags[0].count).toBe(10);
      expect(data.tags[1].count).toBe(5);
      expect(data.tags[2].count).toBe(1);
      
      // Verify it used full mode for sorting
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full');
    });

    it('should sort tags by name when requested', async () => {
      const tags = [
        { name: 'beta', count: 5 },
        { name: 'alpha', count: 10 },
        { name: 'gamma', count: 1 }
      ];
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ 
        mode: 'full',
        tags: tags,
        totalTags: 3
      });

      const result = await tool.executeTyped({ 
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.mode).toBe('full');
      expect(data.tags[0].name).toBe('alpha');
      expect(data.tags[1].name).toBe('beta');
      expect(data.tags[2].name).toBe('gamma');
      
      // Verify it used full mode for sorting
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full');
    });

    it('should combine sorting and pagination', async () => {
      // For sortBy=count with sortOrder=desc, this should use resource-level pagination
      const paginatedTags = Array.from({ length: 10 }, (_, i) => ({
        name: `tag-${i + 5}`, // Starting from 6th tag (offset 5)
        count: 100 - (i + 5) // Decreasing count, starting from 95
      }));
      
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ 
        mode: 'full',
        tags: paginatedTags,
        totalTags: 100,
        pagination: {
          hasMore: true,
          limit: 10,
          offset: 5,
          nextOffset: 15,
          usageStats: {}
        }
      });

      const result = await tool.executeTyped({ 
        sortBy: 'count',
        sortOrder: 'desc',
        limit: 10,
        offset: 5
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.mode).toBe('full');
      expect(data.tags).toHaveLength(10);
      expect(data.tags[0].count).toBe(95); // Should start from 6th highest
      expect(data.hasMore).toBe(true);
      
      // Verify it used resource-level pagination with parameters
      expect(defaultCachedHandlers.tags.handleRequest).toHaveBeenCalledWith('vault://tags?mode=full&limit=10&offset=5');
    });
  });

  describe('Resource integration (TRI1)', () => {
    it('should use vault://tags resource internally for caching with mode optimization', async () => {
      // Mock the cached handler to return optimized summary data
      const mockSummaryResponse = {
        mode: 'summary',
        totalTags: 2,
        topTags: [
          { name: 'project', count: 5 },
          { name: 'meeting', count: 3 }
        ],
        usageStats: {
          totalUsages: 8,
          averageUsage: 4,
          medianUsage: 4
        },
        message: 'Use ?mode=full for complete tag list'
      };
      
      // Mock the cached handler directly  
      const mockHandleRequest = vi.fn().mockResolvedValue(mockSummaryResponse);
      vi.spyOn(defaultCachedHandlers.tags, 'handleRequest').mockImplementation(mockHandleRequest);

      const result = await tool.executeTyped({});

      // Verify the cached handler was called with summary mode instead of direct client call
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://tags?mode=summary');
      expect(mockClient.getAllTags).not.toHaveBeenCalled();
      
      // Verify the result is processed correctly with optimized response
      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.mode).toBe('summary');
      expect(data.topTags).toEqual(mockSummaryResponse.topTags);
      expect(data.totalTags).toBe(2);
      expect(data.usageStats).toEqual(mockSummaryResponse.usageStats);
    });

    it('should use full mode when pagination or sorting is requested', async () => {
      const mockFullResponse = {
        mode: 'full',
        tags: [{ name: 'tag1', count: 5 }],
        totalTags: 1
      };
      
      const mockHandleRequest = vi.fn().mockResolvedValue(mockFullResponse);
      vi.spyOn(defaultCachedHandlers.tags, 'handleRequest').mockImplementation(mockHandleRequest);

      // Test with sorting
      await tool.executeTyped({ sortBy: 'name' });
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://tags?mode=full');

      // Test with pagination
      await tool.executeTyped({ limit: 10 });
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://tags?mode=full');
    });
  });
});