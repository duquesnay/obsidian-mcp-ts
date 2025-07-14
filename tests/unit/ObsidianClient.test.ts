import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ObsidianError } from '../../src/types/errors.js';

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
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://127.0.0.1:27124',
          timeout: 6000,
          headers: {
            'Authorization': 'Bearer test-key'
          }
        })
      );
    });

    it('should create client with custom config', () => {
      const client = new ObsidianClient({
        apiKey: 'custom-key',
        protocol: 'http',
        host: 'localhost',
        port: 3000,
        verifySsl: true
      });
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
          headers: {
            'Authorization': 'Bearer custom-key'
          }
        })
      );
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