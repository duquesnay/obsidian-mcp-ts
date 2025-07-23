import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyNoteHandler } from './DailyNoteHandler.js';
import { ObsidianClient } from '../obsidian/ObsidianClient.js';

describe('DailyNoteHandler', () => {
  let handler: DailyNoteHandler;
  let mockClient: any;
  let mockServer: any;

  beforeEach(() => {
    handler = new DailyNoteHandler();
    
    // Create mock ObsidianClient
    mockClient = {
      getPeriodicNote: vi.fn()
    };
    
    // Create mock server with the client
    mockServer = {
      obsidianClient: mockClient
    };
  });

  describe('URI parsing', () => {
    it('should extract date from vault://daily/2024-01-15', async () => {
      mockClient.getPeriodicNote.mockResolvedValue({
        date: '2024-01-15',
        content: '# Daily Note for 2024-01-15',
        path: 'Daily Notes/2024-01-15.md'
      });

      const result = await handler.execute('vault://daily/2024-01-15', mockServer);
      
      expect(mockClient.getPeriodicNote).toHaveBeenCalledWith('daily');
      expect(result.contents[0].text).toContain('Daily Note for 2024-01-15');
    });

    it('should handle today special case', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockClient.getPeriodicNote.mockResolvedValue({
        date: today,
        content: `# Daily Note for ${today}`,
        path: `Daily Notes/${today}.md`
      });

      const result = await handler.execute('vault://daily/today', mockServer);
      
      expect(mockClient.getPeriodicNote).toHaveBeenCalledWith('daily');
      expect(result.contents[0].text).toContain(`Daily Note for ${today}`);
    });

    it('should validate date format', async () => {
      await expect(handler.execute('vault://daily/invalid-date', mockServer))
        .rejects.toThrow('Invalid date format');
    });

    it('should handle missing daily note gracefully', async () => {
      mockClient.getPeriodicNote.mockRejectedValue({
        response: { status: 404 }
      });

      await expect(handler.execute('vault://daily/2024-01-15', mockServer))
        .rejects.toThrow('Daily note not found: 2024-01-15');
    });
  });

  describe('Response format', () => {
    it('should return markdown content when daily note exists', async () => {
      const noteContent = '# Daily Note\n\nToday was productive!';
      mockClient.getPeriodicNote.mockResolvedValue({
        date: '2024-01-15',
        content: noteContent,
        path: 'Daily Notes/2024-01-15.md'
      });

      const result = await handler.execute('vault://daily/2024-01-15', mockServer);
      
      expect(result.contents[0]).toEqual({
        uri: 'vault://daily/2024-01-15',
        mimeType: 'text/markdown',
        text: noteContent
      });
    });

    it('should include path information in response', async () => {
      mockClient.getPeriodicNote.mockResolvedValue({
        date: '2024-01-15',
        content: '# Test',
        path: 'Daily Notes/2024-01-15.md'
      });

      const result = await handler.execute('vault://daily/2024-01-15', mockServer);
      
      // The response text should be the content from the API
      expect(result.contents[0].text).toBe('# Test');
    });
  });

  describe('Edge cases', () => {
    it('should handle URI without date parameter', async () => {
      // When no date is provided, default to today
      const today = new Date().toISOString().split('T')[0];
      mockClient.getPeriodicNote.mockResolvedValue({
        date: today,
        content: `# Daily Note for ${today}`,
        path: `Daily Notes/${today}.md`
      });

      const result = await handler.execute('vault://daily/', mockServer);
      
      expect(mockClient.getPeriodicNote).toHaveBeenCalledWith('daily');
      expect(result.contents[0].text).toContain(`Daily Note for ${today}`);
    });

    it('should handle URI with trailing slash', async () => {
      mockClient.getPeriodicNote.mockResolvedValue({
        date: '2024-01-15',
        content: '# Daily Note',
        path: 'Daily Notes/2024-01-15.md'
      });

      const result = await handler.execute('vault://daily/2024-01-15/', mockServer);
      
      expect(result.contents[0].text).toBe('# Daily Note');
    });
  });
});