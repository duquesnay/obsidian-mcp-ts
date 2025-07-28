import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleSearchTool } from '../../src/tools/SimpleSearchTool.js';
import { defaultCachedHandlers } from '../../src/resources/CachedConcreteHandlers.js';

describe('SimpleSearchTool', () => {
  let tool: SimpleSearchTool;
  let originalHandleRequest: any;

  beforeEach(() => {
    tool = new SimpleSearchTool();
    
    // Store original handler for later restoration
    originalHandleRequest = defaultCachedHandlers.search.handleRequest;
  });

  afterEach(() => {
    // Restore original handler
    defaultCachedHandlers.search.handleRequest = originalHandleRequest;
  });

  describe('resource integration', () => {
    it('should use vault://search/{query} resource internally', async () => {
      // Arrange
      const query = 'test query';
      const mockResourceData = {
        query,
        results: [
          { file: 'note1.md', content: 'test content', context: 'test context' }
        ],
        totalResults: 1,
        hasMore: false
      };
      
      // Mock the cached handler
      const mockHandleRequest = vi.fn().mockResolvedValue(mockResourceData);
      vi.spyOn(defaultCachedHandlers.search, 'handleRequest').mockImplementation(mockHandleRequest);

      // Act
      const result = await tool.executeTyped({ query });

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith(`vault://search/${encodeURIComponent(query)}`);
      expect(result.type).toBe('text');
      expect(result.text).toContain('test content');
    });

    it('should handle search parameters correctly', async () => {
      // Arrange
      const query = 'test query';
      const contextLength = 200;
      const limit = 25;
      const offset = 10;
      
      const mockResourceData = {
        query,
        results: [
          { file: 'note1.md', content: 'test content', context: 'test context' }
        ],
        totalResults: 50,
        hasMore: true
      };
      
      // Mock the cached handler
      const mockHandleRequest = vi.fn().mockResolvedValue(mockResourceData);
      vi.spyOn(defaultCachedHandlers.search, 'handleRequest').mockImplementation(mockHandleRequest);

      // Act
      const result = await tool.executeTyped({ 
        query, 
        contextLength, 
        limit, 
        offset 
      });

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith(`vault://search/${encodeURIComponent(query)}`);
      expect(result.type).toBe('text');
    });

    it('should handle resource errors gracefully', async () => {
      // Arrange
      const query = 'test query';
      const mockHandleRequest = vi.fn().mockRejectedValue(new Error('Search service error'));
      vi.spyOn(defaultCachedHandlers.search, 'handleRequest').mockImplementation(mockHandleRequest);

      // Act
      const result = await tool.executeTyped({ query });

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith(`vault://search/${encodeURIComponent(query)}`);
      expect(result.type).toBe('text');
      expect(result.text).toContain('Search service error');
    });
  });

  describe('validation', () => {
    it('should require query parameter', async () => {
      // Act
      const result = await tool.executeTyped({} as any);

      // Assert
      expect(result.type).toBe('text');
      expect(result.text).toContain('Provide query parameter');
    });
  });
});