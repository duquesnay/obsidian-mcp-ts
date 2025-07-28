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
      expect(result.notes[0]).toEqual({
        path: 'note1.md',
        title: 'note1',
        modifiedAt: '2022-01-01T00:00:00.000Z',
        preview: 'This is the content of note 1 with some additional text that should be truncated after 100 character...'
      });
      expect(result.notes[1]).toEqual({
        path: 'note2.md',
        title: 'note2',
        modifiedAt: '2022-01-01T00:00:00.000Z',
        preview: 'Short content for note 2'
      });
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
      expect(result.notes[0]).toEqual({
        path: 'note1.md',
        title: 'note1',
        modifiedAt: '2022-01-01T00:00:00.000Z',
        content: 'Full content of note 1'
      });
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
});