import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagNotesHandler } from '../../../src/resources/TagNotesHandler.js';
import { ObsidianClient } from '../../../src/obsidian/ObsidianClient.js';

// Mock the ObsidianClient
vi.mock('../../../src/obsidian/ObsidianClient.js');

describe('TagNotesHandler', () => {
  let handler: TagNotesHandler;
  let mockClient: any;
  let mockServer: any;

  beforeEach(() => {
    handler = new TagNotesHandler();

    // Create mock client
    mockClient = {
      getFilesByTag: vi.fn(),
      getFileContents: vi.fn()
    };

    // Mock getFileContents to return metadata
    mockClient.getFileContents.mockResolvedValue({
      stat: {
        ctime: Date.now(),
        mtime: Date.now(),
        size: 1024
      }
    });

    // Create mock server with client
    mockServer = {
      obsidianClient: mockClient
    };
  });

  describe('handleRequest', () => {
    it('should return notes for a valid tag', async () => {
      // Given
      const uri = 'vault://tag/project';
      const mockFiles = [
        'Projects/Project1.md',
        'Projects/Project2.md',
        'Ideas/NewProject.md'
      ];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await handler.handleRequest(uri, mockServer);

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('project');
      expect(result.tag).toBe('project');
      expect(result.fileCount).toBe(3);
      expect(result.files).toHaveLength(3);
      // Verify files have metadata structure
      result.files.forEach((file: any) => {
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('_meta');
        expect(file._meta).toHaveProperty('size');
        expect(file._meta).toHaveProperty('sizeFormatted');
        expect(file._meta).toHaveProperty('lastModified');
      });
    });

    it('should handle tags with # prefix', async () => {
      // Given
      const uri = 'vault://tag/#meeting';
      const mockFiles = ['Meetings/2024-01-15.md'];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await handler.handleRequest(uri, mockServer);

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('meeting');
      expect(result.tag).toBe('meeting');
      expect(result.fileCount).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('Meetings/2024-01-15.md');
    });

    it('should handle empty tag list', async () => {
      // Given
      const uri = 'vault://tag/nonexistent';
      mockClient.getFilesByTag.mockResolvedValue([]);

      // When
      const result = await handler.handleRequest(uri, mockServer);

      // Then
      expect(result).toEqual({
        tag: 'nonexistent',
        fileCount: 0,
        files: []
      });
    });

    it('should handle tags with special characters', async () => {
      // Given
      const uri = 'vault://tag/project-alpha';
      const mockFiles = ['Projects/Alpha.md'];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await handler.handleRequest(uri, mockServer);

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('project-alpha');
      expect(result.tag).toBe('project-alpha');
      expect(result.fileCount).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('Projects/Alpha.md');
    });

    it('should handle URL encoded tags', async () => {
      // Given
      const uri = 'vault://tag/work%2Fproject';
      const mockFiles = ['Work/Project.md'];
      mockClient.getFilesByTag.mockResolvedValue(mockFiles);

      // When
      const result = await handler.handleRequest(uri, mockServer);

      // Then
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('work/project');
      expect(result.tag).toBe('work/project');
      expect(result.fileCount).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('Work/Project.md');
    });

    it('should handle missing tag parameter', async () => {
      // Given
      const uri = 'vault://tag/';
      
      // When/Then
      await expect(handler.handleRequest(uri, mockServer))
        .rejects.toThrow('Tag name is required');
    });

    it('should handle network errors gracefully', async () => {
      // Given
      const uri = 'vault://tag/test';
      mockClient.getFilesByTag.mockRejectedValue(new Error('Network error'));
      
      // When/Then
      await expect(handler.handleRequest(uri, mockServer))
        .rejects.toThrow('Network error');
    });
  });

  describe('URI parameter extraction', () => {
    it('should extract tag from standard URI', async () => {
      const uri = 'vault://tag/mytag';
      mockClient.getFilesByTag.mockResolvedValue([]);
      
      await handler.handleRequest(uri, mockServer);
      
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('mytag');
    });

    it('should handle trailing slash', async () => {
      const uri = 'vault://tag/mytag/';
      mockClient.getFilesByTag.mockResolvedValue([]);
      
      await handler.handleRequest(uri, mockServer);
      
      expect(mockClient.getFilesByTag).toHaveBeenCalledWith('mytag');
    });
  });
});