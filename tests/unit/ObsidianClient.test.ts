import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ObsidianError } from '../../src/types/errors.js';
import { RequestDeduplicator } from '../../src/utils/RequestDeduplicator.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn()
  }
}));

describe('ObsidianClient', () => {
  let client: ObsidianClient;
  let mockAxiosInstance: Partial<AxiosInstance>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { timeout: 6000 } as any
    };
    
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as AxiosInstance);
    
    client = new ObsidianClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124
    });
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new ObsidianClient({ apiKey: 'test-key' });
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ObsidianClient);
    });

    it('should create client with custom config', () => {
      const client = new ObsidianClient({
        apiKey: 'custom-key',
        protocol: 'http',
        host: 'localhost',
        port: 3000,
        verifySsl: false
      });
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ObsidianClient);
    });

    it('should instantiate RequestDeduplicator', () => {
      const client = new ObsidianClient({ apiKey: 'test-key' });
      
      // Access private property using type assertion
      const clientWithPrivate = client as any;
      
      expect(clientWithPrivate.requestDeduplicator).toBeDefined();
      expect(clientWithPrivate.requestDeduplicator).toBeInstanceOf(RequestDeduplicator);
    });
  });

  describe('listFilesInVault', () => {
    it('should return files list', async () => {
      const mockFiles = ['file1.md', 'file2.md', 'folder/file3.md'];
      (mockAxiosInstance.get as any).mockResolvedValue({
        data: { files: mockFiles }
      });

      const result = await client.listFilesInVault();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/');
      expect(result).toEqual(mockFiles);
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          data: {
            errorCode: 404,
            message: 'Vault not found'
          }
        }
      };
      
      (mockAxiosInstance.get as any).mockRejectedValue(errorResponse);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      await expect(client.listFilesInVault()).rejects.toThrow('Error 404: Vault not found');
    });

    it('should deduplicate concurrent calls', async () => {
      const mockFiles = ['file1.md', 'file2.md', 'folder/file3.md'];
      let resolveFunction: any;
      const promise = new Promise((resolve) => {
        resolveFunction = resolve;
      });
      
      (mockAxiosInstance.get as any).mockReturnValue(promise);

      // Make multiple concurrent calls
      const call1 = client.listFilesInVault();
      const call2 = client.listFilesInVault();
      const call3 = client.listFilesInVault();

      // Should only make one actual API call
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolveFunction({ data: { files: mockFiles } });

      // All calls should return the same result
      const [result1, result2, result3] = await Promise.all([call1, call2, call3]);
      expect(result1).toEqual(mockFiles);
      expect(result2).toEqual(mockFiles);
      expect(result3).toEqual(mockFiles);
      
      // All promises should resolve to the same value (deduplication worked)
    });

    it('should make new request after TTL expires', async () => {
      const mockFiles1 = ['file1.md'];
      const mockFiles2 = ['file1.md', 'file2.md'];
      
      // First call
      (mockAxiosInstance.get as any).mockResolvedValueOnce({
        data: { files: mockFiles1 }
      });
      
      const result1 = await client.listFilesInVault();
      expect(result1).toEqual(mockFiles1);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      
      // Mock time passing (simulate TTL expiration)
      // Since we can't easily mock the internal cache TTL, we'll use a workaround
      // by clearing the deduplicator's cache
      const clientWithPrivate = client as any;
      clientWithPrivate.requestDeduplicator.clear();
      
      // Second call after cache clear
      (mockAxiosInstance.get as any).mockResolvedValueOnce({
        data: { files: mockFiles2 }
      });
      
      const result2 = await client.listFilesInVault();
      expect(result2).toEqual(mockFiles2);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should handle deduplicated error cases', async () => {
      const errorResponse = {
        response: {
          data: {
            errorCode: 500,
            message: 'Internal Server Error'
          }
        }
      };
      
      (mockAxiosInstance.get as any).mockRejectedValue(errorResponse);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      // Make multiple concurrent calls
      const call1 = client.listFilesInVault();
      const call2 = client.listFilesInVault();
      const call3 = client.listFilesInVault();

      // Should only make one actual API call
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // All calls should fail with the same error
      await expect(call1).rejects.toThrow('Error 500: Internal Server Error');
      await expect(call2).rejects.toThrow('Error 500: Internal Server Error');
      await expect(call3).rejects.toThrow('Error 500: Internal Server Error');
    });
  });

  describe('getFileContents', () => {
    it('should return file contents', async () => {
      const mockContent = '# Test File\n\nThis is test content.';
      (mockAxiosInstance.get as any).mockResolvedValue({
        data: mockContent
      });

      const result = await client.getFileContents('test.md');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/test.md');
      expect(result).toBe(mockContent);
    });

    it('should deduplicate concurrent calls for the same file', async () => {
      const mockContent = '# Test File\n\nThis is test content.';
      let resolveFunction: any;
      const promise = new Promise((resolve) => {
        resolveFunction = resolve;
      });
      
      (mockAxiosInstance.get as any).mockReturnValue(promise);

      // Make multiple concurrent calls for the same file
      const call1 = client.getFileContents('test.md');
      const call2 = client.getFileContents('test.md');
      const call3 = client.getFileContents('test.md');

      // Should only make one actual API call
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/test.md');

      // Resolve the promise
      resolveFunction({ data: mockContent });

      // All calls should return the same result
      const [result1, result2, result3] = await Promise.all([call1, call2, call3]);
      expect(result1).toBe(mockContent);
      expect(result2).toBe(mockContent);
      expect(result3).toBe(mockContent);
    });

    it('should make separate requests for different files', async () => {
      const mockContent1 = '# File 1';
      const mockContent2 = '# File 2';
      
      (mockAxiosInstance.get as any)
        .mockResolvedValueOnce({ data: mockContent1 })
        .mockResolvedValueOnce({ data: mockContent2 });

      // Make calls for different files
      const [result1, result2] = await Promise.all([
        client.getFileContents('file1.md'),
        client.getFileContents('file2.md')
      ]);

      // Should make two separate API calls
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1, '/vault/file1.md');
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2, '/vault/file2.md');
      
      expect(result1).toBe(mockContent1);
      expect(result2).toBe(mockContent2);
    });

    it('should make new request after TTL expires', async () => {
      const mockContent1 = '# Old Content';
      const mockContent2 = '# New Content';
      
      // First call
      (mockAxiosInstance.get as any).mockResolvedValueOnce({
        data: mockContent1
      });
      
      const result1 = await client.getFileContents('test.md');
      expect(result1).toBe(mockContent1);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      
      // Clear the deduplicator's cache to simulate TTL expiration
      const clientWithPrivate = client as any;
      clientWithPrivate.requestDeduplicator.clear();
      
      // Second call after cache clear
      (mockAxiosInstance.get as any).mockResolvedValueOnce({
        data: mockContent2
      });
      
      const result2 = await client.getFileContents('test.md');
      expect(result2).toBe(mockContent2);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should handle deduplicated error cases', async () => {
      const errorResponse = {
        response: {
          data: {
            errorCode: 404,
            message: 'File not found'
          }
        }
      };
      
      (mockAxiosInstance.get as any).mockRejectedValue(errorResponse);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      // Make multiple concurrent calls
      const call1 = client.getFileContents('missing.md');
      const call2 = client.getFileContents('missing.md');
      const call3 = client.getFileContents('missing.md');

      // Should only make one actual API call
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // All calls should fail with the same error
      await expect(call1).rejects.toThrow('Error 404: File not found');
      await expect(call2).rejects.toThrow('Error 404: File not found');
      await expect(call3).rejects.toThrow('Error 404: File not found');
    });

    it('should handle format parameter with deduplication', async () => {
      const mockMetadata = { size: 1024, created: '2024-01-01' };
      const mockContent = '# Test File';
      
      (mockAxiosInstance.get as any)
        .mockResolvedValueOnce({ data: mockMetadata })
        .mockResolvedValueOnce({ data: mockContent });

      // Different format parameters should make separate requests
      const [result1, result2] = await Promise.all([
        client.getFileContents('test.md', 'metadata'),
        client.getFileContents('test.md', 'content')
      ]);

      // Should make two separate API calls due to different format parameters
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1, '/vault/test.md?format=metadata');
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2, '/vault/test.md?format=content');
      
      expect(result1).toEqual(mockMetadata);
      expect(result2).toBe(mockContent);
    });
  });

  describe('getBatchFileContents', () => {
    it('should return concatenated file contents', async () => {
      const files = ['file1.md', 'file2.md'];
      const contents = ['Content 1', 'Content 2'];
      
      (mockAxiosInstance.get as any)
        .mockResolvedValueOnce({ data: contents[0] })
        .mockResolvedValueOnce({ data: contents[1] });

      const result = await client.getBatchFileContents(files);

      expect(result).toContain('# file1.md');
      expect(result).toContain('Content 1');
      expect(result).toContain('# file2.md');
      expect(result).toContain('Content 2');
      expect(result).toContain('---');
    });

    it('should handle individual file errors gracefully', async () => {
      const files = ['existing.md', 'missing.md'];
      
      (mockAxiosInstance.get as any)
        .mockResolvedValueOnce({ data: 'Good content' })
        .mockRejectedValueOnce(new Error('File not found'));

      const result = await client.getBatchFileContents(files);

      expect(result).toContain('# existing.md');
      expect(result).toContain('Good content');
      expect(result).toContain('# missing.md');
      expect(result).toContain('Error reading file:');
    });

    it('should deduplicate concurrent batch read requests', async () => {
      const files = ['file1.md', 'file2.md'];
      const expectedContent = '# file1.md\n\nContent 1\n\n---\n\n# file2.md\n\nContent 2\n\n---';
      
      (mockAxiosInstance.get as any)
        .mockResolvedValueOnce({ data: 'Content 1' })
        .mockResolvedValueOnce({ data: 'Content 2' });

      // Make concurrent requests with same file array
      const promise1 = client.getBatchFileContents(files);
      const promise2 = client.getBatchFileContents(files);
      const promise3 = client.getBatchFileContents([...files]); // Same content, different array

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // All results should be identical (deduplicated)
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      
      // Should only make 2 API calls (one per file) despite 3 batch requests
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('search', () => {
    it('should perform simple search', async () => {
      const mockResults = [
        { filename: 'test.md', content: 'Found text here' }
      ];
      
      (mockAxiosInstance.post as any).mockResolvedValue({
        data: mockResults
      });

      const result = await client.search('test query', 200);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search/simple/', null, {
        params: {
          query: 'test query',
          contextLength: 200
        }
      });
      expect(result).toEqual({
        results: mockResults,
        totalResults: 1,
        hasMore: false,
        offset: 0,
        limit: 1
      });
    });

    it('should deduplicate concurrent search requests with same parameters', async () => {
      const mockResults = [
        { filename: 'test.md', content: 'Found text here' }
      ];
      
      (mockAxiosInstance.post as any).mockResolvedValue({
        data: mockResults
      });

      // Make multiple concurrent requests with same parameters
      const promise1 = client.search('test query', 200);
      const promise2 = client.search('test query', 200);
      const promise3 = client.search('test query', 200);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // Should only make one actual request
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      
      // All results should be the same
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should make separate requests for different queries', async () => {
      const mockResults1 = [{ filename: 'test1.md', content: 'First query' }];
      const mockResults2 = [{ filename: 'test2.md', content: 'Second query' }];
      
      (mockAxiosInstance.post as any)
        .mockResolvedValueOnce({ data: mockResults1 })
        .mockResolvedValueOnce({ data: mockResults2 });

      // Make requests with different queries
      const [result1, result2] = await Promise.all([
        client.search('query1', 200),
        client.search('query2', 200)
      ]);

      // Should make two separate requests
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      
      // Results should be different
      expect(result1).not.toEqual(result2);
    });

    it('should make separate requests for same query with different context lengths', async () => {
      const mockResults1 = [{ filename: 'test.md', content: 'Short context' }];
      const mockResults2 = [{ filename: 'test.md', content: 'Long context with more text' }];
      
      (mockAxiosInstance.post as any)
        .mockResolvedValueOnce({ data: mockResults1 })
        .mockResolvedValueOnce({ data: mockResults2 });

      // Make requests with different context lengths
      const [result1, result2] = await Promise.all([
        client.search('test query', 100),
        client.search('test query', 300)
      ]);

      // Should make two separate requests
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during deduplicated search requests', async () => {
      const mockError = new Error('Search failed');
      (mockAxiosInstance.post as any).mockRejectedValue(mockError);
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      // Make multiple concurrent requests
      const promises = [
        client.search('error query', 200),
        client.search('error query', 200),
        client.search('error query', 200)
      ];

      // All should reject with the same error
      await expect(Promise.all(promises)).rejects.toThrow('Search failed');
      
      // Should only make one actual request
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should correctly deduplicate searches with special characters', async () => {
      const mockResults = [{ filename: 'test.md', content: 'Found text' }];
      
      (mockAxiosInstance.post as any).mockResolvedValue({ data: mockResults });

      // Query with special characters that could break simple string concatenation
      const specialQuery = 'search:with:colons and "quotes"';
      
      // Make multiple concurrent requests with same special query
      const promises = [
        client.search(specialQuery, 200),
        client.search(specialQuery, 200)
      ];

      await Promise.all(promises);

      // Should only make one actual request
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

  });

  describe('appendContent', () => {
    it('should create new file when createIfNotExists is true', async () => {
      (mockAxiosInstance.post as any).mockResolvedValue({ data: {} });

      await client.appendContent('new-file.md', 'New content', true);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/vault/new-file.md',
        'New content',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/markdown',
            'If-None-Match': '*'
          })
        })
      );
    });

    it('should append to existing file when createIfNotExists is false', async () => {
      const existingContent = 'Existing content';
      const newContent = 'New content';
      
      (mockAxiosInstance.get as any).mockResolvedValue({ data: existingContent });
      (mockAxiosInstance.put as any).mockResolvedValue({ data: {} });

      await client.appendContent('existing.md', newContent, false);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/existing.md');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/vault/existing.md',
        `${existingContent}\n${newContent}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/markdown'
          })
        })
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      (mockAxiosInstance.delete as any).mockResolvedValue({ data: {} });

      await client.deleteFile('test.md');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/vault/test.md');
    });
  });

  describe('renameFile', () => {
    it('should rename file using PATCH with proper headers', async () => {
      (mockAxiosInstance.patch as any).mockResolvedValue({ data: {} });

      await client.renameFile('old-name.md', 'new-name.md');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/vault/old-name.md', 'new-name.md', {
        headers: {
          'Content-Type': 'text/plain',
          'Operation': 'rename',
          'Target-Type': 'file',
          'Target': 'name'
        }
      });
    });

    it('should throw error if enhanced API not available', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 400 }
      };
      
      // Mock isAxiosError to return true for our error
      (axios.isAxiosError as any).mockReturnValue(true);
      
      // PATCH fails with 400
      (mockAxiosInstance.patch as any).mockRejectedValue(error);

      await expect(client.renameFile('old-name.md', 'new-name.md')).rejects.toThrow(
        'Rename operation requires the enhanced Obsidian REST API. The standard API does not support preserving backlinks during rename operations.'
      );

      expect(mockAxiosInstance.patch).toHaveBeenCalled();
      // Should NOT attempt fallback operations
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });
  });

  describe('moveFile', () => {
    it('should move file using PATCH with proper headers', async () => {
      (mockAxiosInstance.patch as any).mockResolvedValue({ data: {} });

      await client.moveFile('source/file.md', 'destination/file.md');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/vault/source%2Ffile.md', 'destination/file.md', {
        headers: {
          'Content-Type': 'text/plain',
          'Operation': 'move',
          'Target-Type': 'file',
          'Target': 'path'
        }
      });
    });

    it('should throw error if enhanced API not available', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 400 }
      };
      
      // Mock isAxiosError to return true for our error
      (axios.isAxiosError as any).mockReturnValue(true);
      
      // PATCH fails with 400
      (mockAxiosInstance.patch as any).mockRejectedValue(error);

      await expect(client.moveFile('source/file.md', 'destination/file.md')).rejects.toThrow(
        'Move operation requires the enhanced Obsidian REST API. The standard API does not support preserving backlinks during move operations.'
      );

      expect(mockAxiosInstance.patch).toHaveBeenCalled();
      // Should NOT attempt fallback operations
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });
  });

  describe('patchContent', () => {
    it('should handle traditional insert at heading', async () => {
      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { success: true }
      });

      await client.patchContent('test.md', 'New content', {
        targetType: 'heading',
        target: '## Section',
        insertAfter: true
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/test.md',
        'New content',
        {
          headers: {
            'Content-Type': 'text/markdown',
            'Operation': 'append',
            'Target': '## Section',
            'Target-Type': 'heading'
          }
        }
      );
    });

    it('should handle find/replace operations', async () => {
      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { success: true }
      });

      await client.patchContent('test.md', '', {
        targetType: 'block',
        target: 'target-block',
        oldText: 'old text',
        newText: 'new text'
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/test.md',
        '',
        {
          headers: {
            'Content-Type': 'text/markdown',
            'Operation': 'replace',
            'Target': 'target-block',
            'Target-Type': 'block'
          }
        }
      );
    });

    it('should handle find/replace without targetType', async () => {
      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { success: true }
      });

      await client.patchContent('test.md', '', {
        targetType: 'block',
        target: 'content-block',
        oldText: '![[old.png]]',
        newText: '![[new.png]]'
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/test.md',
        '',
        {
          headers: {
            'Content-Type': 'text/markdown',
            'Operation': 'replace',
            'Target': 'content-block',
            'Target-Type': 'block'
          }
        }
      );
    });

    it('should handle frontmatter updates', async () => {
      (mockAxiosInstance.patch as any).mockResolvedValue({
        data: { success: true }
      });

      await client.patchContent('test.md', 'tags: [tag1, tag2]', {
        targetType: 'frontmatter',
        target: 'tags'
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/test.md',
        '"tags: [tag1, tag2]"',
        {
          headers: {
            'Content-Type': 'application/json',
            'Operation': 'append',
            'Target': 'tags',
            'Target-Type': 'frontmatter'
          }
        }
      );
    });
  });
});