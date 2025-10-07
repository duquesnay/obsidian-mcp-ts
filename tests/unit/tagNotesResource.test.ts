import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../../src/resources/index.js';

// Mock the ConfigLoader to avoid environment dependencies
vi.mock('../../src/utils/configLoader.js', () => ({
  ConfigLoader: {
    getInstance: () => ({
      getApiKey: () => 'test-api-key',
      getHost: () => '127.0.0.1'
    })
  }
}));

describe('Tag Notes Resource', () => {
  let mockServer: any;
  let mockClient: any;
  let readHandler: any;

  beforeEach(async () => {
    // Create mock ObsidianClient
    mockClient = {
      getFilesByTag: vi.fn()
    };

    // Create mock server
    mockServer = {
      setRequestHandler: vi.fn(),
      obsidianClient: mockClient
    };

    // Register resources
    await registerResources(mockServer);

    // Get the ReadResource handler
    readHandler = mockServer.setRequestHandler.mock.calls
      .find((call: any) => call[0] === ReadResourceRequestSchema)?.[1];
  });

  describe('vault://tag/{tagname}', () => {
    it('should return notes for a valid tag', async () => {
      // Given
      const mockFiles = [
        'Projects/ProjectA.md',
        'Projects/ProjectB.md',
        'Ideas/ProjectIdea.md'
      ];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://tag/project' }
      });

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('project');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('vault://tag/project');
      expect(result.contents[0].mimeType).toBe('application/json');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.tag).toBe('project');
      expect(data.fileCount).toBe(3);
      expect(data.files).toHaveLength(3);

      // Check that files now include metadata
      expect(data.files[0]).toHaveProperty('path', 'Projects/ProjectA.md');
      expect(data.files[0]).toHaveProperty('_meta');
      expect(data.files[1]).toHaveProperty('path', 'Projects/ProjectB.md');
      expect(data.files[1]).toHaveProperty('_meta');
      expect(data.files[2]).toHaveProperty('path', 'Ideas/ProjectIdea.md');
      expect(data.files[2]).toHaveProperty('_meta');
    });

    it('should handle tags with # prefix', async () => {
      // Given
      const mockFiles = ['Daily/2024-01-15.md'];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://tag/#daily' }
      });

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('daily');
      const data = JSON.parse(result.contents[0].text);
      expect(data.tag).toBe('daily');
    });

    it('should handle empty tag results', async () => {
      // Given
      mockClient.getFilesByTag.mockResolvedValue([]);

      // When
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://tag/nonexistent' }
      });

      // Then
      const data = JSON.parse(result.contents[0].text);
      expect(data).toEqual({
        tag: 'nonexistent',
        fileCount: 0,
        files: []
      });
    });

    it('should handle URL encoded tags', async () => {
      // Given
      const mockFiles = ['Work/ProjectReview.md'];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://tag/work%2Fproject' }
      });

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('work/project');
      const data = JSON.parse(result.contents[0].text);
      expect(data.tag).toBe('work/project');
    });

    it('should handle missing tag name', async () => {
      // When/Then
      await expect(readHandler({ 
        method: 'resources/read',
        params: { uri: 'vault://tag/' }
      })).rejects.toThrow('Tag name is required');
    });
  });
});