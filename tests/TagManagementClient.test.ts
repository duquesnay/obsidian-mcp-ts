import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TagManagementClient } from '../src/obsidian/services/TagManagementClient';
import { ObsidianError } from '../src/types/errors';
import type { ObsidianClientConfig } from '../src/obsidian/ObsidianClient';

vi.mock('axios');

describe('TagManagementClient', () => {
  let client: TagManagementClient;
  let mockAxiosInstance: AxiosInstance;
  let mockConfig: ObsidianClientConfig;

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      patch: vi.fn(),
    } as unknown as AxiosInstance;

    (axios.create as any).mockReturnValue(mockAxiosInstance);

    mockConfig = {
      apiKey: 'test-api-key',
      host: 'localhost',
      port: 27124,
      protocol: 'https',
      verifySsl: false
    };

    client = new TagManagementClient(mockConfig);
  });

  describe('getAllTags', () => {
    it('should retrieve all tags with counts', async () => {
      const mockTags = [
        { name: 'project', count: 10 },
        { name: 'todo', count: 5 },
        { name: 'important', count: 3 }
      ];

      (mockAxiosInstance.get as any).mockResolvedValue({
        data: { tags: mockTags }
      });

      const result = await client.getAllTags();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tags');
      expect(result).toEqual(mockTags);
    });

    it('should return empty array when no tags exist', async () => {
      (mockAxiosInstance.get as any).mockResolvedValue({
        data: { tags: [] }
      });

      const result = await client.getAllTags();

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Network error');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 500,
        data: { message: 'Internal server error' }
      };
      (mockAxiosInstance.get as any).mockRejectedValue(error);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(client.getAllTags()).rejects.toThrow(ObsidianError);
    });
  });

  describe('getFilesByTag', () => {
    it('should retrieve files containing a specific tag', async () => {
      const mockFiles = ['notes/project1.md', 'notes/project2.md', 'tasks/todo.md'];

      (mockAxiosInstance.get as any).mockResolvedValue({
        data: { files: mockFiles }
      });

      const result = await client.getFilesByTag('project');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tags/project');
      expect(result).toEqual(mockFiles);
    });

    it('should encode tag names with special characters', async () => {
      const tagName = 'tag with spaces';
      const encodedTag = encodeURIComponent(tagName);

      (mockAxiosInstance.get as any).mockResolvedValue({
        data: { files: [] }
      });

      await client.getFilesByTag(tagName);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tags/${encodedTag}`);
    });

    it('should handle tags with # prefix', async () => {
      const tagName = '#todo';
      const encodedTag = encodeURIComponent(tagName);

      (mockAxiosInstance.get as any).mockResolvedValue({
        data: { files: [] }
      });

      await client.getFilesByTag(tagName);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tags/${encodedTag}`);
    });
  });

  describe('renameTag', () => {
    it('should rename a tag across the vault', async () => {
      const oldTag = 'wip';
      const newTag = 'in-progress';

      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { filesUpdated: 5, message: 'Tag renamed successfully' }
      });

      const result = await client.renameTag(oldTag, newTag);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/tags/${oldTag}`,
        newTag,
        {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'rename'
          }
        }
      );
      expect(result).toEqual({
        filesUpdated: 5,
        message: 'Tag renamed successfully'
      });
    });

    it('should handle tag names with special characters', async () => {
      const oldTag = 'tag with spaces';
      const newTag = 'tag-with-dashes';
      const encodedOldTag = encodeURIComponent(oldTag);

      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { filesUpdated: 2 }
      });

      await client.renameTag(oldTag, newTag);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/tags/${encodedOldTag}`,
        newTag,
        expect.any(Object)
      );
    });
  });

  describe('manageFileTags', () => {
    it('should add tags to a file', async () => {
      const filePath = 'notes/project.md';
      const tags = ['important', 'urgent'];

      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { tagsModified: 2, message: 'Tags added successfully' }
      });

      const result = await client.manageFileTags(filePath, 'add', tags);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/vault/${encodeURIComponent(filePath)}`,
        tags,
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': 'add',
            'Tag-Location': 'frontmatter'
          }
        }
      );
      expect(result).toEqual({
        tagsModified: 2,
        message: 'Tags added successfully'
      });
    });

    it('should remove tags from a file with inline location', async () => {
      const filePath = 'notes/done.md';
      const tags = ['todo', 'wip'];

      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { tagsModified: 2 }
      });

      const result = await client.manageFileTags(filePath, 'remove', tags, 'inline');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/vault/${encodeURIComponent(filePath)}`,
        tags,
        {
          headers: {
            'Content-Type': 'application/json',
            'Target-Type': 'tag',
            'Operation': 'remove',
            'Tag-Location': 'inline'
          }
        }
      );
      expect(result.tagsModified).toBe(2);
    });

    it('should validate file path', async () => {
      await expect(
        client.manageFileTags('', 'add', ['tag'])
      ).rejects.toThrow();
    });

    it('should default to frontmatter location when not specified', async () => {
      const filePath = 'notes/test.md';
      const tags = ['test'];

      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { tagsModified: 1 }
      });

      await client.manageFileTags(filePath, 'add', tags);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        expect.any(String),
        tags,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Tag-Location': 'frontmatter'
          })
        })
      );
    });
  });
});