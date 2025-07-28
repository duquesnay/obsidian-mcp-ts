import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagsHandler } from '../../../src/resources/concreteHandlers.js';
import { ObsidianClient } from '../../../src/obsidian/ObsidianClient.js';

// Mock the ObsidianClient
vi.mock('../../../src/obsidian/ObsidianClient.js');

describe('TagsHandler', () => {
  let handler: TagsHandler;
  let mockClient: any;
  let mockServer: any;

  beforeEach(() => {
    handler = new TagsHandler();
    
    // Create mock client
    mockClient = {
      getAllTags: vi.fn()
    };
    
    // Create mock server with client
    mockServer = {
      obsidianClient: mockClient
    };
  });

  describe('Basic functionality (existing behavior)', () => {
    it('should return tags in full mode for backward compatibility when requested', async () => {
      // Given
      const uri = 'vault://tags?mode=full';
      const mockTags = [
        { name: 'project', count: 5 },
        { name: 'meeting', count: 3 },
        { name: 'idea', count: 1 }
      ];
      mockClient.getAllTags.mockResolvedValue(mockTags);
      
      // When
      const result = await handler.handleRequest(uri, mockServer);
      
      // Then
      expect(mockClient.getAllTags).toHaveBeenCalled();
      expect(result).toEqual({ 
        mode: 'full',
        tags: mockTags,
        totalTags: 3
      });
    });
  });

  describe('Response modes for conversation optimization', () => {
    const mockTags = [
      { name: 'project', count: 15 },
      { name: 'meeting', count: 8 },
      { name: 'idea', count: 3 },
      { name: 'todo', count: 12 },
      { name: 'personal', count: 7 },
      { name: 'work', count: 20 },
      { name: 'archive', count: 2 },
      { name: 'draft', count: 4 }
    ];

    beforeEach(() => {
      mockClient.getAllTags.mockResolvedValue(mockTags);
    });

    it('should return summary mode by default', async () => {
      // When
      const result = await handler.handleRequest('vault://tags', mockServer);
      
      // Then
      expect(result).toEqual({
        mode: 'summary',
        totalTags: 8,
        topTags: [
          { name: 'work', count: 20 },
          { name: 'project', count: 15 },
          { name: 'todo', count: 12 },
          { name: 'meeting', count: 8 },
          { name: 'personal', count: 7 }
        ],
        usageStats: {
          totalUsages: 71,
          averageUsage: 8.9,
          medianUsage: 7.5
        },
        message: 'Use ?mode=full for complete tag list'
      });
    });

    it('should return summary mode when explicitly requested', async () => {
      // When
      const result = await handler.handleRequest('vault://tags?mode=summary', mockServer);
      
      // Then
      expect(result.mode).toBe('summary');
      expect(result.topTags).toHaveLength(5);
      expect(result.usageStats).toBeDefined();
      expect(result.message).toBe('Use ?mode=full for complete tag list');
    });

    it('should return full mode when requested', async () => {
      // When
      const result = await handler.handleRequest('vault://tags?mode=full', mockServer);
      
      // Then
      expect(result).toEqual({
        mode: 'full',
        tags: mockTags,
        totalTags: 8
      });
    });

    it('should default to summary mode for invalid mode parameters', async () => {
      // When
      const result = await handler.handleRequest('vault://tags?mode=invalid', mockServer);
      
      // Then
      expect(result.mode).toBe('summary');
      expect(result.topTags).toBeDefined();
      expect(result.usageStats).toBeDefined();
    });

    it('should calculate usage statistics correctly', async () => {
      // When
      const result = await handler.handleRequest('vault://tags?mode=summary', mockServer);
      
      // Then
      expect(result.usageStats.totalUsages).toBe(71); // 15+8+3+12+7+20+2+4
      expect(result.usageStats.averageUsage).toBe(8.9); // 71/8 rounded to 1 decimal
      expect(result.usageStats.medianUsage).toBe(7.5); // median of [2,3,4,7,8,12,15,20]
    });

    it('should return top 5 tags by usage in summary mode', async () => {
      // When
      const result = await handler.handleRequest('vault://tags?mode=summary', mockServer);
      
      // Then
      expect(result.topTags).toHaveLength(5);
      expect(result.topTags[0]).toEqual({ name: 'work', count: 20 });
      expect(result.topTags[1]).toEqual({ name: 'project', count: 15 });
      expect(result.topTags[2]).toEqual({ name: 'todo', count: 12 });
      expect(result.topTags[3]).toEqual({ name: 'meeting', count: 8 });
      expect(result.topTags[4]).toEqual({ name: 'personal', count: 7 });
    });

    it('should handle empty tag list in summary mode', async () => {
      // Given
      mockClient.getAllTags.mockResolvedValue([]);
      
      // When
      const result = await handler.handleRequest('vault://tags?mode=summary', mockServer);
      
      // Then
      expect(result).toEqual({
        mode: 'summary',
        totalTags: 0,
        topTags: [],
        usageStats: {
          totalUsages: 0,
          averageUsage: 0,
          medianUsage: 0
        },
        message: 'No tags found in vault'
      });
    });

    it('should handle single tag in summary mode', async () => {
      // Given
      mockClient.getAllTags.mockResolvedValue([{ name: 'single', count: 5 }]);
      
      // When
      const result = await handler.handleRequest('vault://tags?mode=summary', mockServer);
      
      // Then
      expect(result.topTags).toHaveLength(1);
      expect(result.usageStats.averageUsage).toBe(5);
      expect(result.usageStats.medianUsage).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Given
      const uri = 'vault://tags';
      mockClient.getAllTags.mockRejectedValue(new Error('Network error'));
      
      // When/Then
      await expect(handler.handleRequest(uri, mockServer))
        .rejects.toThrow('Network error');
    });
  });
});