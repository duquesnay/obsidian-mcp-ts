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

  describe('Tool description', () => {
    it('should mention the vault://tags resource and internal usage', () => {
      const tool = new GetAllTagsTool();
      
      expect(tool.description).toContain('vault://tags');
      expect(tool.description).toContain('internally');
      expect(tool.description).toContain('5-minute caching');
      expect(tool.description).toContain('performance');
    });
  });

  describe('Large vault optimization', () => {
    it('should handle pagination for large tag lists', async () => {
      // Generate mock data for a large number of tags
      const totalTags = 5000;
      const allTags = Array.from({ length: totalTags }, (_, i) => ({
        name: `tag-${i}`,
        count: Math.floor(Math.random() * 100) + 1
      }));
      
      // Mock the cached handler instead of client
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ tags: allTags });

      // Test with pagination parameters
      const result = await tool.executeTyped({ 
        limit: 100,
        offset: 0 
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.tags).toHaveLength(100);
      expect(data.totalTags).toBe(totalTags);
      expect(data.hasMore).toBe(true);
      expect(data.nextOffset).toBe(100);
    });

    it('should return all tags when no pagination is requested', async () => {
      const tags = [
        { name: 'tag1', count: 5 },
        { name: 'tag2', count: 3 },
        { name: 'tag3', count: 1 }
      ];
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ tags });

      const result = await tool.executeTyped({});

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.tags).toEqual(tags);
      expect(data.totalTags).toBe(3);
      expect(data.message).toContain('Found 3 unique tags');
      expect(data.hasMore).toBeUndefined();
    });

    it('should sort tags by count when sortBy parameter is provided', async () => {
      const tags = [
        { name: 'tag1', count: 5 },
        { name: 'tag2', count: 10 },
        { name: 'tag3', count: 1 }
      ];
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ tags });

      const result = await tool.executeTyped({ 
        sortBy: 'count',
        sortOrder: 'desc'
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.tags[0].count).toBe(10);
      expect(data.tags[1].count).toBe(5);
      expect(data.tags[2].count).toBe(1);
    });

    it('should sort tags by name when requested', async () => {
      const tags = [
        { name: 'beta', count: 5 },
        { name: 'alpha', count: 10 },
        { name: 'gamma', count: 1 }
      ];
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ tags });

      const result = await tool.executeTyped({ 
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.tags[0].name).toBe('alpha');
      expect(data.tags[1].name).toBe('beta');
      expect(data.tags[2].name).toBe('gamma');
    });

    it('should combine sorting and pagination', async () => {
      const tags = Array.from({ length: 100 }, (_, i) => ({
        name: `tag-${i}`,
        count: 100 - i // Decreasing count
      }));
      defaultCachedHandlers.tags.handleRequest = vi.fn().mockResolvedValue({ tags });

      const result = await tool.executeTyped({ 
        sortBy: 'count',
        sortOrder: 'desc',
        limit: 10,
        offset: 5
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.tags).toHaveLength(10);
      expect(data.tags[0].count).toBe(95); // Should start from 6th highest
      expect(data.hasMore).toBe(true);
    });
  });

  describe('Resource integration (TRI1)', () => {
    it('should use vault://tags resource internally for caching', async () => {
      // Mock the cached handler to return data
      const mockTags = [
        { name: 'project', count: 5 },
        { name: 'meeting', count: 3 }
      ];
      
      // Mock the cached handler directly  
      const mockHandleRequest = vi.fn().mockResolvedValue({ tags: mockTags });
      vi.spyOn(defaultCachedHandlers.tags, 'handleRequest').mockImplementation(mockHandleRequest);

      const result = await tool.executeTyped({});

      // Verify the cached handler was called instead of direct client call
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://tags');
      expect(mockClient.getAllTags).not.toHaveBeenCalled();
      
      // Verify the result is processed correctly
      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.tags).toEqual(mockTags);
      expect(data.totalTags).toBe(2);
    });
  });
});