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