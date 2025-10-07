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
    it('should have a clear description about recent changes', () => {
      const description = tool.description;

      // Check that it mentions recent files and vault
      expect(description.toLowerCase()).toContain('recent');
      expect(description.toLowerCase()).toContain('vault');
      expect(description.toLowerCase()).toContain('pagination');
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
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent?limit=10&offset=0');
      
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
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent?limit=10');
      
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

    it('should handle paginated resource responses correctly', async () => {
      // Arrange - Mock a paginated response from the resource
      const mockResourceData = {
        notes: [
          { path: 'note1.md', modifiedAt: '2024-01-01T10:00:00.000Z' },
          { path: 'note2.md', modifiedAt: '2024-01-01T09:00:00.000Z' },
          { path: 'note3.md', modifiedAt: '2024-01-01T08:00:00.000Z' }
        ],
        pagination: {
          totalNotes: 10,
          hasMore: true,
          limit: 3,
          offset: 0,
          nextOffset: 3,
          continuationToken: '1704096000000'
        }
      };
      
      const mockHandleRequest = vi.mocked(defaultCachedHandlers.recent.handleRequest);
      mockHandleRequest.mockResolvedValue(mockResourceData);

      const args = {
        limit: 3,
        offset: 0,
        contentLength: 100
      };

      // Act
      const result = await tool.executeTyped(args);

      // Assert
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent?limit=3&offset=0');
      expect(result.type).toBe('text');
      
      // Parse the response to verify paginated response structure
      const responseData = JSON.parse(result.text);
      expect(responseData.notes).toHaveLength(3);
      expect(responseData.totalNotes).toBe(10);
      expect(responseData.hasMore).toBe(true);
      expect(responseData.limit).toBe(3);
      expect(responseData.offset).toBe(0);
      expect(responseData.nextOffset).toBe(3);
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
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent?limit=2&offset=1');
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
      expect(mockHandleRequest).toHaveBeenCalledWith('vault://recent?limit=10&offset=0');
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