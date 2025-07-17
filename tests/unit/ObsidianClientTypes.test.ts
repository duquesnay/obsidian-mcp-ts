import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import axios from 'axios';

vi.mock('axios');

describe('ObsidianClient Type Safety', () => {
  let client: ObsidianClient;
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { timeout: 6000 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    
    client = new ObsidianClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124
    });
  });

  describe('getFileContents return types', () => {
    it('should return string for content format', async () => {
      mockAxiosInstance.get.mockResolvedValue({ 
        data: 'File content here' 
      });
      
      const result = await client.getFileContents('test.md');
      expect(typeof result).toBe('string');
    });

    it('should return object for metadata format', async () => {
      const metadata = {
        path: 'test.md',
        stat: { ctime: 123, mtime: 456, size: 789 }
      };
      mockAxiosInstance.get.mockResolvedValue({ data: metadata });
      
      const result = await client.getFileContents('test.md', 'metadata');
      expect(result).toEqual(metadata);
    });

    it('should return object for frontmatter format', async () => {
      const frontmatter = { title: 'Test', tags: ['tag1', 'tag2'] };
      mockAxiosInstance.get.mockResolvedValue({ data: frontmatter });
      
      const result = await client.getFileContents('test.md', 'frontmatter');
      expect(result).toEqual(frontmatter);
    });
  });

  describe('search return types', () => {
    it('should return search results array', async () => {
      const searchResults = {
        matches: [
          { path: 'file1.md', matches: 2 },
          { path: 'file2.md', matches: 1 }
        ]
      };
      mockAxiosInstance.post.mockResolvedValue({ data: searchResults });
      
      const result = await client.search('test query');
      expect(result).toEqual(searchResults);
    });
  });

  describe('complexSearch with JsonLogic', () => {
    it('should accept any JsonLogic query structure', async () => {
      const jsonLogicQuery = {
        and: [
          { '==': [{ var: 'tags' }, 'important'] },
          { '>': [{ var: 'stat.size' }, 1000] }
        ]
      };
      
      mockAxiosInstance.post.mockResolvedValue({ 
        data: { matches: ['file1.md'] } 
      });
      
      const result = await client.complexSearch(jsonLogicQuery);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search/', jsonLogicQuery);
      expect(result).toEqual({ matches: ['file1.md'] });
    });
  });

  describe('getPeriodicNote return types', () => {
    it('should return periodic note data', async () => {
      const noteData = {
        path: 'daily/2024-01-01.md',
        exists: true,
        content: 'Daily note content'
      };
      mockAxiosInstance.get.mockResolvedValue({ data: noteData });
      
      const result = await client.getPeriodicNote('daily');
      expect(result).toEqual(noteData);
    });
  });

  describe('advancedSearch with typed filters', () => {
    it('should accept properly typed filters and options', async () => {
      const filters = {
        content: { query: 'test' },
        file: { path: { pattern: '*.md' } }
      };
      const options = {
        limit: 10,
        offset: 0
      };
      
      mockAxiosInstance.post.mockResolvedValue({ 
        data: { results: [] } 
      });
      
      const result = await client.advancedSearch(filters, options);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/search/advanced',
        { filters, options },
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        })
      );
    });
  });
});