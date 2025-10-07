import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecentChangesHandler as RecentHandler } from '../../../src/resources/RecentChangesHandler.js';
import { ObsidianClient } from '../../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../../src/obsidian/ObsidianClient.js');

describe('RecentHandler', () => {
  let handler: RecentHandler;
  let mockClient: ObsidianClient;

  beforeEach(() => {
    handler = new RecentHandler();
    mockClient = new ObsidianClient({ apiKey: 'test', host: '127.0.0.1', verifySsl: false });
    vi.clearAllMocks();
  });

  describe('handleRequest', () => {
    it('should return preview mode by default with titles and previews', async () => {
      // Arrange
      const mockRecentChanges = [
        { path: 'note1.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: 'This is the content of note 1 with some additional text that should be truncated after 100 character...' },
        { path: 'note2.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: 'Short content for note 2' }
      ];
      
      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };
      
      // Act
      const result = await handler.handleRequest('vault://recent', server);
      
      // Assert
      expect(result.notes).toHaveLength(2);

      // Check first note structure (including _meta field)
      expect(result.notes[0]).toHaveProperty('path', 'note1.md');
      expect(result.notes[0]).toHaveProperty('title', 'note1');
      expect(result.notes[0]).toHaveProperty('modifiedAt', '2022-01-01T00:00:00.000Z');
      expect(result.notes[0]).toHaveProperty('preview', 'This is the content of note 1 with some additional text that should be truncated after 100 character...');
      expect(result.notes[0]).toHaveProperty('_meta');
      expect(result.notes[0]._meta).toHaveProperty('size');
      expect(result.notes[0]._meta).toHaveProperty('sizeFormatted');
      expect(result.notes[0]._meta).toHaveProperty('lastModified');

      // Check second note structure
      expect(result.notes[1]).toHaveProperty('path', 'note2.md');
      expect(result.notes[1]).toHaveProperty('title', 'note2');
      expect(result.notes[1]).toHaveProperty('modifiedAt', '2022-01-01T00:00:00.000Z');
      expect(result.notes[1]).toHaveProperty('preview', 'Short content for note 2');
      expect(result.notes[1]).toHaveProperty('_meta');

      expect(result.mode).toBe('preview');
    });

    it('should return full content when mode=full parameter is provided', async () => {
      // Arrange
      const mockRecentChanges = [
        { path: 'note1.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: 'Full content of note 1' }
      ];
      
      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };
      
      // Act
      const result = await handler.handleRequest('vault://recent?mode=full', server);
      
      // Assert
      expect(result.notes).toHaveLength(1);

      // Check note structure (including _meta field)
      expect(result.notes[0]).toHaveProperty('path', 'note1.md');
      expect(result.notes[0]).toHaveProperty('title', 'note1');
      expect(result.notes[0]).toHaveProperty('modifiedAt', '2022-01-01T00:00:00.000Z');
      expect(result.notes[0]).toHaveProperty('content', 'Full content of note 1');
      expect(result.notes[0]).toHaveProperty('_meta');
      expect(result.notes[0]._meta).toHaveProperty('size');
      expect(result.notes[0]._meta).toHaveProperty('sizeFormatted');
      expect(result.notes[0]._meta).toHaveProperty('lastModified');

      expect(result.mode).toBe('full');
    });

    it('should handle invalid modes by defaulting to preview', async () => {
      // Arrange
      const mockRecentChanges = [
        { path: 'note1.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: 'Content for note 1' }
      ];
      
      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };
      
      // Act
      const result = await handler.handleRequest('vault://recent?mode=invalid', server);
      
      // Assert
      expect(result.mode).toBe('preview');
      expect(result.notes[0]).toHaveProperty('preview');
      expect(result.notes[0]).not.toHaveProperty('content');
    });

    it('should extract titles correctly from file paths', async () => {
      // Arrange
      const mockRecentChanges = [
        { path: 'folder/subfolder/My Note with Spaces.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: 'Content' },
        { path: 'Root Note.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: 'Content' }
      ];
      
      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };
      
      // Act
      const result = await handler.handleRequest('vault://recent', server);
      
      // Assert
      expect(result.notes[0].title).toBe('My Note with Spaces');
      expect(result.notes[1].title).toBe('Root Note');
    });

    it('should truncate previews to 100 characters with ellipsis', async () => {
      // Arrange
      const longContent = 'This is a very long piece of content that definitely exceeds one hundred characters and should be truncated properly with an ellipsis at the end.';
      const mockRecentChanges = [
        { path: 'note1.md', mtime: new Date('2022-01-01T00:00:00.000Z').getTime(), content: longContent }
      ];
      
      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };
      
      // Act
      const result = await handler.handleRequest('vault://recent', server);
      
      // Assert
      expect(result.notes[0].preview).toHaveLength(103); // 100 chars + '...'
      expect(result.notes[0].preview).toMatch(/\.\.\.$/);  // ends with ...
      expect(result.notes[0].preview).toBe(longContent.substring(0, 100) + '...');
    });
  });

  describe('pagination support', () => {
    it('should handle limit parameter', async () => {
      // Arrange
      const mockRecentChanges = Array(25).fill(null).map((_, i) => ({
        path: `note${i}.md`,
        mtime: new Date(`2022-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`).getTime(),
        content: `Content for note ${i}`
      }));

      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };

      // Act - request with limit of 10
      const result = await handler.handleRequest('vault://recent?limit=10', server);

      // Assert
      expect(result.notes).toHaveLength(10);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.totalItems).toBe(25);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.nextOffset).toBe(10);
    });

    it('should handle offset parameter', async () => {
      // Arrange
      const mockRecentChanges = Array(25).fill(null).map((_, i) => ({
        path: `note${i}.md`,
        mtime: new Date(`2022-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`).getTime(),
        content: `Content for note ${i}`
      }));

      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };

      // Act - request with offset of 10
      const result = await handler.handleRequest('vault://recent?offset=10&limit=10', server);

      // Assert
      expect(result.notes).toHaveLength(10);
      expect(result.notes[0].path).toBe('note10.md');
      expect(result.pagination.offset).toBe(10);
      expect(result.pagination.nextOffset).toBe(20);
    });

    it('should handle limit=20 as default for recent items', async () => {
      // Arrange
      const mockRecentChanges = Array(30).fill(null).map((_, i) => ({
        path: `note${i}.md`,
        mtime: new Date(`2022-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`).getTime(),
        content: `Content for note ${i}`
      }));

      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };

      // Act - request without pagination params (should default to limit=20)
      const result = await handler.handleRequest('vault://recent', server);

      // Assert
      expect(result.notes).toHaveLength(20);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should maintain chronological ordering with pagination', async () => {
      // Arrange - Create dates in reverse chronological order (most recent first)
      const mockRecentChanges = Array(15).fill(null).map((_, i) => ({
        path: `note${i}.md`,
        mtime: new Date(`2022-12-${String(31 - i).padStart(2, '0')}T00:00:00.000Z`).getTime(),
        content: `Content for note ${i}`
      }));

      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };

      // Act - get first page
      const page1 = await handler.handleRequest('vault://recent?limit=5&offset=0', server);
      // Act - get second page  
      const page2 = await handler.handleRequest('vault://recent?limit=5&offset=5', server);

      // Assert - verify chronological ordering is maintained
      expect(page1.notes[0].modifiedAt).toBe('2022-12-31T00:00:00.000Z'); // Most recent
      expect(page1.notes[4].modifiedAt).toBe('2022-12-27T00:00:00.000Z');
      expect(page2.notes[0].modifiedAt).toBe('2022-12-26T00:00:00.000Z');
      expect(page2.notes[4].modifiedAt).toBe('2022-12-22T00:00:00.000Z');
    });

    it('should include continuation tokens for time-based pagination', async () => {
      // Arrange
      const mockRecentChanges = Array(15).fill(null).map((_, i) => ({
        path: `note${i}.md`,
        mtime: new Date(`2022-01-${String(i + 15).padStart(2, '0')}T00:00:00.000Z`).getTime(),
        content: `Content for note ${i}`
      }));

      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };

      // Act
      const result = await handler.handleRequest('vault://recent?limit=5', server);

      // Assert
      expect(result.pagination.continuationToken).toBeDefined();
      expect(result.pagination.continuationToken).toMatch(/^\d+$/); // Should be a timestamp
    });

    it('should handle no pagination when all results fit in default limit', async () => {
      // Arrange
      const mockRecentChanges = Array(10).fill(null).map((_, i) => ({
        path: `note${i}.md`,
        mtime: new Date(`2022-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`).getTime(),
        content: `Content for note ${i}`
      }));

      vi.mocked(mockClient.getRecentChanges).mockResolvedValue(mockRecentChanges);

      const server = { obsidianClient: mockClient };

      // Act
      const result = await handler.handleRequest('vault://recent', server);

      // Assert - When all results fit, should not include pagination metadata
      expect(result.notes).toHaveLength(10);
      expect(result.pagination).toBeUndefined();
    });
  });
});