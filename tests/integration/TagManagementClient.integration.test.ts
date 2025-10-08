import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import { TagManagementClient } from '../../src/obsidian/services/TagManagementClient';
import type { ObsidianClientConfig } from '../../src/obsidian/ObsidianClient';
import { REGEX_PATTERNS } from '../../src/constants.js';

describe('TagManagementClient Integration Tests', () => {
  let client: TagManagementClient;

  beforeAll(() => {
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error(
        'Integration tests require OBSIDIAN_API_KEY environment variable\n' +
        'Set it in .env file or skip integration tests'
      );
    }

    const config: ObsidianClientConfig = {
      apiKey: process.env.OBSIDIAN_API_KEY,
      host: process.env.OBSIDIAN_HOST || '127.0.0.1',
      port: parseInt(process.env.OBSIDIAN_PORT || '27124'),
      protocol: 'https',
      verifySsl: false
    };
    client = new TagManagementClient(config);
  });

  describe('getAllTags', () => {
    it('should retrieve all tags from the vault', async () => {
      const tags = await client.getAllTags();
      
      expect(Array.isArray(tags)).toBe(true);
      tags.forEach(tag => {
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('count');
        expect(typeof tag.name).toBe('string');
        expect(typeof tag.count).toBe('number');
        expect(tag.count).toBeGreaterThan(0);
      });
    });
  });

  describe('getFilesByTag', () => {
    it('should retrieve files for existing tags', async () => {
      // First get all tags
      const tags = await client.getAllTags();
      
      if (tags.length > 0) {
        // Test with the first available tag
        const testTag = tags[0];
        const files = await client.getFilesByTag(testTag.name);
        
        expect(Array.isArray(files)).toBe(true);
        expect(files.length).toBeGreaterThan(0);
        files.forEach(file => {
          expect(typeof file).toBe('string');
          expect(file).toMatch(REGEX_PATTERNS.MARKDOWN_FILE);
        });
      }
    });

    it('should return empty array for non-existent tag', async () => {
      const files = await client.getFilesByTag('nonexistent-tag-12345');
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });

  describe('manageFileTags', () => {
    const testFilePath = 'test-tag-management.md';

    beforeAll(async () => {
      // Create a test file for tag management
      const { FileOperationsClient } = await import('../../src/obsidian/services/FileOperationsClient');
      const fileClient = new FileOperationsClient({
        apiKey: process.env.OBSIDIAN_API_KEY!,
        host: process.env.OBSIDIAN_HOST || '127.0.0.1',
        port: parseInt(process.env.OBSIDIAN_PORT || '27124'),
        protocol: 'https',
        verifySsl: false
      });

      await fileClient.createFile(testFilePath, '# Test File\n\nContent for tag testing.');
    });

    afterAll(async () => {
      // Clean up test file
      const { FileOperationsClient } = await import('../../src/obsidian/services/FileOperationsClient');
      const fileClient = new FileOperationsClient({
        apiKey: process.env.OBSIDIAN_API_KEY!,
        host: process.env.OBSIDIAN_HOST || '127.0.0.1',
        port: parseInt(process.env.OBSIDIAN_PORT || '27124'),
        protocol: 'https',
        verifySsl: false
      });

      try {
        await fileClient.deleteFile(testFilePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should add tags to frontmatter', async () => {
      const result = await client.manageFileTags(
        testFilePath,
        'add',
        ['test-tag-1', 'test-tag-2'],
        'frontmatter'
      );

      expect(result.tagsModified).toBeGreaterThan(0);
      expect(result.message).toContain('added');

      // Verify tags were added
      const files = await client.getFilesByTag('test-tag-1');
      expect(files).toContain(testFilePath);
    });

    it('should add tags inline', async () => {
      const result = await client.manageFileTags(
        testFilePath,
        'add',
        ['inline-tag-1'],
        'inline'
      );

      expect(result.tagsModified).toBeGreaterThan(0);
    });

    it('should remove tags from file', async () => {
      // First add a tag
      await client.manageFileTags(testFilePath, 'add', ['removable-tag'], 'frontmatter');

      // Then remove it
      const result = await client.manageFileTags(
        testFilePath,
        'remove',
        ['removable-tag'],
        'frontmatter'
      );

      expect(result.tagsModified).toBeGreaterThan(0);
      expect(result.message).toContain('removed');
    });

    it('should handle multiple tags in single call', async () => {
      const result = await client.manageFileTags(
        testFilePath,
        'add',
        ['multi-1', 'multi-2', 'multi-3'],
        'frontmatter'
      );

      expect(result.tagsModified).toBe(3);
    });

    it('should work with both frontmatter and inline location', async () => {
      const result = await client.manageFileTags(
        testFilePath,
        'add',
        ['both-location-tag'],
        'both'
      );

      expect(result.tagsModified).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const invalidClient = new TagManagementClient({
        apiKey: 'invalid-key',
        host: '127.0.0.1',
        port: 27124,
        protocol: 'https',
        verifySsl: false
      });

      await expect(invalidClient.getAllTags()).rejects.toThrow(/Authentication failed/);
    });
  });
});