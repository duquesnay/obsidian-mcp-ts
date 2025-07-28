import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetAllTagsTool } from '../../src/tools/GetAllTagsTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

describe('GetAllTagsTool', () => {
  let tool: GetAllTagsTool;
  let mockClient: any;

  beforeEach(() => {
    tool = new GetAllTagsTool();
    mockClient = {
      getAllTags: vi.fn()
    };
    tool.getClient = vi.fn().mockReturnValue(mockClient);
  });

  describe('Tool description', () => {
    it('should mention the vault://tags resource alternative', () => {
      const tool = new GetAllTagsTool();
      
      expect(tool.description).toContain('vault://tags');
      expect(tool.description).toContain('5 minutes');
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
      
      mockClient.getAllTags.mockResolvedValue(allTags);

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
      mockClient.getAllTags.mockResolvedValue(tags);

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
      mockClient.getAllTags.mockResolvedValue(tags);

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
      mockClient.getAllTags.mockResolvedValue(tags);

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
      mockClient.getAllTags.mockResolvedValue(tags);

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
});