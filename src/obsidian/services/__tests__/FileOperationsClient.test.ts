import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileOperationsClient } from '../FileOperationsClient.js';
import axios, { AxiosInstance } from 'axios';
import { ObsidianError } from '../../../types/errors.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      defaults: { timeout: 30000 }
    })),
    isAxiosError: vi.fn()
  }
}));

describe('FileOperationsClient', () => {
  let client: FileOperationsClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      defaults: { timeout: 30000 }
    };
    
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as AxiosInstance);
    
    client = new FileOperationsClient({
      apiKey: 'test-key',
      host: '127.0.0.1',
      port: 27124
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listFilesInVault', () => {
    it('should return list of files', async () => {
      const mockFiles = ['file1.md', 'file2.md'];
      mockAxiosInstance.get.mockResolvedValue({ data: { files: mockFiles } });

      const result = await client.listFilesInVault();
      
      expect(result).toEqual(mockFiles);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/');
    });

    it('should handle errors properly', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.listFilesInVault()).rejects.toThrow();
    });
  });

  describe('listFilesInDir', () => {
    it('should return files in directory', async () => {
      const mockFiles = ['dir/file1.md', 'dir/file2.md'];
      mockAxiosInstance.get.mockResolvedValue({ data: { files: mockFiles } });

      const result = await client.listFilesInDir('dir');
      
      expect(result).toEqual(mockFiles);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/dir/');
    });

    it('should validate path', async () => {
      await expect(client.listFilesInDir('../invalid')).rejects.toThrow('Invalid dirpath');
    });
  });

  describe('getFileContents', () => {
    it('should get file contents without format', async () => {
      const content = 'File content';
      mockAxiosInstance.get.mockResolvedValue({ data: content });

      const result = await client.getFileContents('test.md');
      
      expect(result).toEqual(content);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/test.md');
    });

    it('should get file contents with format', async () => {
      const metadata = { size: 100, created: '2024-01-01' };
      mockAxiosInstance.get.mockResolvedValue({ data: metadata });

      const result = await client.getFileContents('test.md', 'metadata');
      
      expect(result).toEqual(metadata);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/test.md?format=metadata');
    });
  });

  describe('createFile', () => {
    it('should create a file', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await client.createFile('new.md', 'Content');
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/vault/new.md',
        'Content',
        { headers: { 'Content-Type': 'text/markdown' } }
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.deleteFile('old.md');
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/vault/old.md');
    });
  });

  describe('renameFile', () => {
    it('should rename a file using PATCH', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await client.renameFile('old.md', 'new.md');
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/old.md',
        'new.md',
        {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'rename',
            'Target-Type': 'file',
            'Target': 'name'
          }
        }
      );
    });

    it('should extract filename from full path', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await client.renameFile('dir/old.md', 'dir/new.md');
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/dir%2Fold.md',
        'new.md',
        expect.any(Object)
      );
    });
  });

  describe('moveFile', () => {
    it('should move a file', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await client.moveFile('old/path.md', 'new/path.md');
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/old%2Fpath.md',
        'new/path.md',
        {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'move',
            'Target-Type': 'file',
            'Target': 'path'
          }
        }
      );
    });
  });

  describe('copyFile', () => {
    it('should copy a file', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: 'File content' });
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await client.copyFile('source.md', 'dest.md');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/source.md');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/vault/dest.md',
        'File content',
        { headers: { 'Content-Type': 'text/markdown' } }
      );
    });

    it('should handle overwrite option', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: 'Source content' })
        .mockResolvedValueOnce({ data: 'Existing content' });

      await expect(client.copyFile('source.md', 'dest.md', false))
        .rejects.toThrow('Destination file already exists');
    });
  });

  describe('checkPathExists', () => {
    it('should detect file exists', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: 'content' });

      const result = await client.checkPathExists('file.md');
      
      expect(result).toEqual({ exists: true, type: 'file' });
    });

    it('should detect directory exists', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Not a file'))
        .mockResolvedValueOnce({ data: { files: [] } });

      const result = await client.checkPathExists('directory');
      
      expect(result).toEqual({ exists: true, type: 'directory' });
    });

    it('should detect path does not exist', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Not found'));

      const result = await client.checkPathExists('nonexistent');
      
      expect(result).toEqual({ exists: false, type: null });
    });
  });

  describe('appendContent', () => {
    it('should append content with createIfNotExists', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.appendContent('file.md', 'New content', true);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/vault/file.md',
        'New content',
        {
          headers: {
            'Content-Type': 'text/markdown',
            'If-None-Match': '*'
          }
        }
      );
    });

    it('should append to existing file', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: 'Existing content' });
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await client.appendContent('file.md', 'New content', false);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/vault/file.md',
        'Existing content\nNew content',
        { headers: { 'Content-Type': 'text/markdown' } }
      );
    });
  });

  describe('patchContent', () => {
    it('should patch content in heading', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await client.patchContent('file.md', 'New content', {
        targetType: 'heading',
        target: 'My Heading',
        insertAfter: true
      });
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/file.md',
        'New content',
        {
          headers: {
            'Target-Type': 'heading',
            'Target': 'My Heading',
            'Operation': 'append',
            'Content-Type': 'text/markdown'
          }
        }
      );
    });

    it('should handle frontmatter patches', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await client.patchContent('file.md', '"value"', {
        targetType: 'frontmatter',
        target: 'field'
      });
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/file.md',
        '"value"',
        {
          headers: {
            'Target-Type': 'frontmatter',
            'Target': 'field',
            'Operation': 'append',
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });
});