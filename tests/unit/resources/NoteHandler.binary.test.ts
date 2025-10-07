import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteHandler } from '../../../src/resources/concreteHandlers.js';
import { ObsidianClient } from '../../../src/obsidian/ObsidianClient.js';

describe('NoteHandler - Binary File Support', () => {
  let handler: NoteHandler;
  let mockClient: any;
  let mockServer: any;

  beforeEach(() => {
    handler = new NoteHandler();

    // Create mock client with required methods
    mockClient = {
      getBinaryFileContents: vi.fn(),
      getFileContents: vi.fn(),
    };

    mockServer = {
      obsidianClient: mockClient
    };
  });

  describe('Binary file detection and handling', () => {
    it('should detect PNG as binary and return blob response', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockClient.getBinaryFileContents.mockResolvedValue(base64Data);
      mockClient.getFileContents.mockResolvedValue({
        stat: {
          size: 1024,
          mtime: 1704067200000, // 2024-01-01T00:00:00Z
          ctime: 1704067200000
        }
      });

      const result = await handler.handleRequest('vault://note/images/test.png', mockServer);

      expect(mockClient.getBinaryFileContents).toHaveBeenCalledWith('images/test.png');
      expect(result.blob).toBe(base64Data);
      expect(result.mimeType).toBe('image/png');
      expect(result._meta).toBeDefined();
      expect(result._meta.size).toBe(1024);
      expect(result._meta.sizeFormatted).toBe('1.00 KB');
      expect(result._meta.lastModified).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should detect PDF as binary and return blob response', async () => {
      const base64Data = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKPj4KZW5kb2JqCg==';
      mockClient.getBinaryFileContents.mockResolvedValue(base64Data);
      mockClient.getFileContents.mockResolvedValue({
        stat: {
          size: 2048,
          mtime: 1704153600000, // 2024-01-02T00:00:00Z
          ctime: 1704153600000
        }
      });

      const result = await handler.handleRequest('vault://note/docs/document.pdf', mockServer);

      expect(mockClient.getBinaryFileContents).toHaveBeenCalledWith('docs/document.pdf');
      expect(result.blob).toBe(base64Data);
      expect(result.mimeType).toBe('application/pdf');
      expect(result._meta).toBeDefined();
      expect(result._meta.size).toBe(2048);
      expect(result._meta.sizeFormatted).toBe('2.00 KB');
    });

    it('should detect JPG as binary and return blob response', async () => {
      const base64Data = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8A';
      mockClient.getBinaryFileContents.mockResolvedValue(base64Data);
      mockClient.getFileContents.mockResolvedValue({
        size: 512,
        modified: '2024-01-03T00:00:00Z',
        created: '2024-01-03T00:00:00Z'
      });

      const result = await handler.handleRequest('vault://note/photos/image.jpg', mockServer);

      expect(result.blob).toBe(base64Data);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle binary files without metadata gracefully', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockClient.getBinaryFileContents.mockResolvedValue(base64Data);
      mockClient.getFileContents.mockRejectedValue(new Error('Metadata not available'));

      const result = await handler.handleRequest('vault://note/test.png', mockServer);

      expect(result.blob).toBe(base64Data);
      expect(result.mimeType).toBe('image/png');
      // Even with metadata fetch failure, ResourceMetadataUtil returns defaults
      expect(result._meta).toBeDefined();
      expect(result._meta.size).toBe(0);
      expect(result._meta.sizeFormatted).toBe('0 B');
    });

    it('should detect audio files as binary', async () => {
      const base64Data = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC';
      mockClient.getBinaryFileContents.mockResolvedValue(base64Data);
      mockClient.getFileContents.mockResolvedValue({
        size: 3072,
        modified: '2024-01-04T00:00:00Z',
        created: '2024-01-04T00:00:00Z'
      });

      const result = await handler.handleRequest('vault://note/audio/song.mp3', mockServer);

      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.blob).toBe(base64Data);
    });

    it('should detect video files as binary', async () => {
      const base64Data = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2';
      mockClient.getBinaryFileContents.mockResolvedValue(base64Data);
      mockClient.getFileContents.mockResolvedValue({
        size: 4096,
        modified: '2024-01-05T00:00:00Z',
        created: '2024-01-05T00:00:00Z'
      });

      const result = await handler.handleRequest('vault://note/videos/clip.mp4', mockServer);

      expect(result.mimeType).toBe('video/mp4');
      expect(result.blob).toBe(base64Data);
    });
  });

  describe('Text file handling (existing behavior)', () => {
    it('should handle markdown files as text in preview mode', async () => {
      const markdownContent = '# Test Note\n\nThis is a test note.';
      mockClient.getFileContents.mockResolvedValue(markdownContent);

      const result = await handler.handleRequest('vault://note/notes/test.md', mockServer);

      expect(mockClient.getFileContents).toHaveBeenCalledWith('notes/test.md');
      expect(mockClient.getBinaryFileContents).not.toHaveBeenCalled();
      expect(result).toHaveProperty('preview');
      expect(result).toHaveProperty('statistics');
    });

    it('should handle markdown files as text in full mode', async () => {
      const markdownContent = '# Test Note\n\nThis is a test note.';
      mockClient.getFileContents.mockResolvedValue(markdownContent);

      const result = await handler.handleRequest('vault://note/notes/test.md?mode=full', mockServer);

      expect(mockClient.getFileContents).toHaveBeenCalledWith('notes/test.md');
      expect(mockClient.getBinaryFileContents).not.toHaveBeenCalled();
      expect(result).toBe(markdownContent);
    });
  });

  describe('MIME type detection', () => {
    it('should return correct MIME type for different image formats', async () => {
      const testCases = [
        { path: 'test.png', expectedMime: 'image/png' },
        { path: 'test.jpg', expectedMime: 'image/jpeg' },
        { path: 'test.gif', expectedMime: 'image/gif' },
        { path: 'test.webp', expectedMime: 'image/webp' },
        { path: 'test.svg', expectedMime: 'image/svg+xml' },
        { path: 'test.bmp', expectedMime: 'image/bmp' },
        { path: 'test.ico', expectedMime: 'image/x-icon' },
      ];

      for (const testCase of testCases) {
        mockClient.getBinaryFileContents.mockResolvedValue('base64data');
        mockClient.getFileContents.mockResolvedValue({ size: 1024 });

        const result = await handler.handleRequest(`vault://note/${testCase.path}`, mockServer);

        expect(result.mimeType).toBe(testCase.expectedMime);
      }
    });

    it('should be case insensitive for file extensions', async () => {
      mockClient.getBinaryFileContents.mockResolvedValue('base64data');
      mockClient.getFileContents.mockResolvedValue({ size: 1024 });

      const resultUpperCase = await handler.handleRequest('vault://note/test.PNG', mockServer);
      const resultMixedCase = await handler.handleRequest('vault://note/test.PnG', mockServer);

      expect(resultUpperCase.mimeType).toBe('image/png');
      expect(resultMixedCase.mimeType).toBe('image/png');
    });
  });

  describe('Error handling', () => {
    it('should handle errors when fetching binary files', async () => {
      mockClient.getBinaryFileContents.mockRejectedValue(new Error('File too large'));

      await expect(
        handler.handleRequest('vault://note/large.png', mockServer)
      ).rejects.toThrow();
    });

    it('should handle errors when fetching text files', async () => {
      mockClient.getFileContents.mockRejectedValue(new Error('File not found'));

      await expect(
        handler.handleRequest('vault://note/missing.md', mockServer)
      ).rejects.toThrow();
    });
  });
});
