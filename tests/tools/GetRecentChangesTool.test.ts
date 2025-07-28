import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetRecentChangesTool } from '../../src/tools/GetRecentChangesTool.js';
import { defaultCachedHandlers } from '../../src/resources/CachedConcreteHandlers.js';

// Mock the cached handlers
vi.mock('../../src/resources/CachedConcreteHandlers.js', () => ({
  defaultCachedHandlers: {
    recent: {
      handleRequest: vi.fn()
    }
  }
}));

describe('GetRecentChangesTool', () => {
  let tool: GetRecentChangesTool;

  beforeEach(() => {
    tool = new GetRecentChangesTool();
    vi.clearAllMocks();
  });

  describe('description', () => {
    it('should mention the vault://recent resource alternative with cache information', () => {
      const description = tool.description;
      
      // Check that it mentions the vault://recent resource
      expect(description.toLowerCase()).toContain('vault://recent');
      
      // Check that it mentions the cache duration
      expect(description).toMatch(/30\s*second|30s/i);
      
      // Check that it mentions performance benefit
      expect(description.toLowerCase()).toContain('performance');
    });
  });

  describe('executeTyped', () => {
    it('should use the vault://recent resource internally for caching benefits', async () => {
      // Arrange
      const mockResourceData = {
        notes: [
          { path: 'note1.md', modifiedAt: '2024-01-01T10:00:00.000Z' },
          { path: 'note2.md', modifiedAt: '2024-01-01T09:00:00.000Z' }
        ]
      };
      
      const mockHandleRequest = vi.mocked(defaultCachedHandlers.recent.handleRequest);
      mockHandleRequest.mockResolvedValue(mockResourceData);

      const args = {
        limit: 10,
        offset: 0,
        contentLength: 100
      };

      // Act
      const result = await tool.executeTyped(args);

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledTimes(1);
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent');
      
      // Should return tool response format
      expect(result.type).toBe('text');
      expect(result.text).toBeDefined();
      
      // Parse the response to verify it contains the expected data structure
      const responseData = JSON.parse(result.text);
      expect(responseData).toEqual([
        { path: 'note1.md', mtime: expect.any(Number), content: undefined },
        { path: 'note2.md', mtime: expect.any(Number), content: undefined }
      ]);
    });

    it('should use preview mode by default when accessing vault://recent resource', async () => {
      // Arrange
      const mockResourceData = {
        notes: [
          { 
            path: 'note1.md', 
            title: 'note1',
            modifiedAt: '2024-01-01T10:00:00.000Z',
            preview: 'This is a preview of the first note with exactly one hundred characters to test the truncation...'
          },
          { 
            path: 'note2.md', 
            title: 'note2',
            modifiedAt: '2024-01-01T09:00:00.000Z',
            preview: 'Short preview'
          }
        ],
        mode: 'preview'
      };
      
      const mockHandleRequest = vi.mocked(defaultCachedHandlers.recent.handleRequest);
      mockHandleRequest.mockResolvedValue(mockResourceData);

      const args = { limit: 10 };

      // Act
      const result = await tool.executeTyped(args);

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent');
      
      const responseData = JSON.parse(result.text);
      expect(responseData).toEqual([
        { 
          path: 'note1.md', 
          title: 'note1',
          mtime: expect.any(Number), 
          preview: 'This is a preview of the first note with exactly one hundred characters to test the truncation...'
        },
        { 
          path: 'note2.md', 
          title: 'note2',
          mtime: expect.any(Number), 
          preview: 'Short preview'
        }
      ]);
    });

    it('should handle pagination by processing resource data', async () => {
      // Arrange - This test should fail initially because pagination logic needs to be implemented
      const mockResourceData = {
        notes: [
          { path: 'note1.md', modifiedAt: '2024-01-01T10:00:00.000Z' },
          { path: 'note2.md', modifiedAt: '2024-01-01T09:00:00.000Z' },
          { path: 'note3.md', modifiedAt: '2024-01-01T08:00:00.000Z' }
        ]
      };
      
      const mockHandleRequest = vi.mocked(defaultCachedHandlers.recent.handleRequest);
      mockHandleRequest.mockResolvedValue(mockResourceData);

      const args = {
        limit: 2,
        offset: 1,
        contentLength: 100
      };

      // Act
      const result = await tool.executeTyped(args);

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent');
      expect(result.type).toBe('text');
      expect(result.text).toBeDefined();
      
      // Parse the response to verify pagination was applied
      const responseData = JSON.parse(result.text);
      expect(responseData.notes).toHaveLength(2);
      expect(responseData.notes[0].path).toBe('note2.md');
      expect(responseData.notes[1].path).toBe('note3.md');
      expect(responseData.hasMore).toBe(false);
      expect(responseData.totalNotes).toBe(3);
    });

    it('should handle directory filtering', async () => {
      // Arrange - This test should fail initially because directory filtering needs to be implemented
      const mockResourceData = {
        notes: [
          { path: 'projects/note1.md', modifiedAt: '2024-01-01T10:00:00.000Z' },
          { path: 'personal/note2.md', modifiedAt: '2024-01-01T09:00:00.000Z' },
          { path: 'projects/note3.md', modifiedAt: '2024-01-01T08:00:00.000Z' }
        ]
      };
      
      const mockHandleRequest = vi.mocked(defaultCachedHandlers.recent.handleRequest);
      mockHandleRequest.mockResolvedValue(mockResourceData);

      const args = {
        directory: 'projects',
        limit: 10,
        offset: 0,
        contentLength: 100
      };

      // Act
      const result = await tool.executeTyped(args);

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent');
      expect(result.type).toBe('text');
      expect(result.text).toBeDefined();
      
      // Parse the response to verify directory filtering was applied
      const responseData = JSON.parse(result.text);
      expect(responseData).toHaveLength(2);
      expect(responseData.every(note => note.path.startsWith('projects/'))).toBe(true);
      expect(responseData[0].path).toBe('projects/note1.md');
      expect(responseData[1].path).toBe('projects/note3.md');
    });
  });
});