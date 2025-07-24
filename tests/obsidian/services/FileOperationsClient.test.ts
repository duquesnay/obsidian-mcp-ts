import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { FileOperationsClient } from '../../../src/obsidian/services/FileOperationsClient.js';
import { ObsidianError } from '../../../src/types/errors.js';
import type { ObsidianClientConfig } from '../../../src/obsidian/ObsidianClient.js';

vi.mock('axios');

describe('FileOperationsClient', () => {
  let client: FileOperationsClient;
  let mockAxiosInstance: AxiosInstance;
  const config: ObsidianClientConfig = {
    apiKey: 'test-key',
    host: '127.0.0.1',
    port: 27124
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { timeout: 30000 }
    } as unknown as AxiosInstance;

    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
    client = new FileOperationsClient(config);
  });

  describe('listFilesInVault', () => {
    it('should list all files in vault', async () => {
      const mockFiles = ['file1.md', 'file2.md'];
      vi.mocked(mockAxiosInstance.get).mockResolvedValue({
        data: { files: mockFiles }
      });

      const result = await client.listFilesInVault();

      expect(result).toEqual(mockFiles);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      vi.mocked(mockAxiosInstance.get).mockRejectedValue(error);

      await expect(client.listFilesInVault()).rejects.toThrow();
    });
  });

  describe('getFileContents', () => {
    it('should get file contents without format', async () => {
      const content = 'File content';
      vi.mocked(mockAxiosInstance.get).mockResolvedValue({
        data: content
      });

      const result = await client.getFileContents('test.md');

      expect(result).toEqual(content);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/test.md');
    });

    it('should get file contents with format', async () => {
      const metadata = { size: 100, created: '2024-01-01' };
      vi.mocked(mockAxiosInstance.get).mockResolvedValue({
        data: metadata
      });

      const result = await client.getFileContents('test.md', 'metadata');

      expect(result).toEqual(metadata);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/test.md?format=metadata');
    });
  });

  describe('createFile', () => {
    it('should create a new file', async () => {
      vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

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
      vi.mocked(mockAxiosInstance.delete).mockResolvedValue({ data: {} });

      await client.deleteFile('old.md');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/vault/old.md');
    });
  });

  describe('moveFile', () => {
    it('should move a file', async () => {
      vi.mocked(mockAxiosInstance.patch).mockResolvedValue({ data: {} });

      await client.moveFile('old.md', 'new.md');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/old.md',
        'new.md',
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

    it('should handle API not supporting move operation', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 400 }
      };
      vi.mocked(mockAxiosInstance.patch).mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      await expect(client.moveFile('old.md', 'new.md')).rejects.toThrow(ObsidianError);
    });
  });

  describe('copyFile', () => {
    it('should copy a file', async () => {
      // First call gets source content
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: 'Content' });
      // Second call checks if destination exists - should throw 404
      const notFoundError = Object.assign(new Error('Not found'), {
        isAxiosError: true,
        response: { status: 404, data: {} }
      });
      vi.mocked(mockAxiosInstance.get).mockRejectedValueOnce(notFoundError);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);
      vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

      await client.copyFile('source.md', 'dest.md');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/source.md');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/dest.md');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/vault/dest.md',
        'Content',
        { headers: { 'Content-Type': 'text/markdown' } }
      );
    });

    it('should handle overwrite option', async () => {
      vi.mocked(mockAxiosInstance.get).mockResolvedValue({ data: 'Content' });
      vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

      await client.copyFile('source.md', 'dest.md', true);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vault/source.md');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/vault/dest.md',
        'Content',
        { headers: { 'Content-Type': 'text/markdown' } }
      );
    });

    it('should prevent overwrite when flag is false', async () => {
      // First call returns content for source
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: 'Content' });
      // Second call checks if destination exists
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: 'Exists' });

      await expect(client.copyFile('source.md', 'dest.md', false)).rejects.toThrow(ObsidianError);
    });
  });

  describe('checkPathExists', () => {
    it('should identify file', async () => {
      vi.mocked(mockAxiosInstance.get).mockResolvedValue({ data: 'Content' });

      const result = await client.checkPathExists('test.md');

      expect(result).toEqual({ exists: true, type: 'file' });
    });

    it('should identify directory', async () => {
      vi.mocked(mockAxiosInstance.get)
        .mockRejectedValueOnce(new Error('Not a file'))
        .mockResolvedValueOnce({ data: { files: [] } });

      const result = await client.checkPathExists('folder');

      expect(result).toEqual({ exists: true, type: 'directory' });
    });

    it('should identify non-existent path', async () => {
      vi.mocked(mockAxiosInstance.get)
        .mockRejectedValueOnce(new Error('Not a file'))
        .mockRejectedValueOnce(new Error('Not a directory'));

      const result = await client.checkPathExists('missing');

      expect(result).toEqual({ exists: false, type: null });
    });
  });
});