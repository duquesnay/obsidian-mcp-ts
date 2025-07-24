import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { DirectoryOperationsClient } from '../../../src/obsidian/services/DirectoryOperationsClient.js';
import { ObsidianError } from '../../../src/types/errors.js';
import type { ObsidianClientConfig } from '../../../src/obsidian/ObsidianClient.js';

vi.mock('axios');

describe('DirectoryOperationsClient', () => {
  let client: DirectoryOperationsClient;
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
    client = new DirectoryOperationsClient(config);
  });

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: { message: 'Directory created: test/dir', parentsCreated: false }
      });

      const result = await client.createDirectory('test/dir');

      expect(result).toEqual({
        created: true,
        message: 'Directory created: test/dir',
        parentsCreated: false
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/vault/test%2Fdir',
        '',
        {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'create',
            'Target-Type': 'directory',
            'Create-Parents': 'true'
          }
        }
      );
    });

    it('should handle directory already exists', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 409, data: {} }
      };
      vi.mocked(mockAxiosInstance.post).mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      await expect(client.createDirectory('existing')).rejects.toThrow(ObsidianError);
    });
  });

  describe('deleteDirectory', () => {
    it('should delete an empty directory', async () => {
      vi.mocked(mockAxiosInstance.delete).mockResolvedValue({
        data: { message: 'Directory deleted: test/dir', filesDeleted: 0 }
      });

      const result = await client.deleteDirectory('test/dir');

      expect(result).toEqual({
        deleted: true,
        message: 'Directory deleted: test/dir',
        filesDeleted: 0
      });
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/vault/test%2Fdir', {
        headers: {
          'Target-Type': 'directory',
          'Recursive': 'false'
        }
      });
    });

    it('should delete directory recursively', async () => {
      vi.mocked(mockAxiosInstance.delete).mockResolvedValue({
        data: { message: 'Directory deleted: test/dir', filesDeleted: 5 }
      });

      const result = await client.deleteDirectory('test/dir', true);

      expect(result.filesDeleted).toBe(5);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/vault/test%2Fdir', {
        headers: {
          'Target-Type': 'directory',
          'Recursive': 'true'
        }
      });
    });

    it('should delete permanently when requested', async () => {
      vi.mocked(mockAxiosInstance.delete).mockResolvedValue({
        data: { message: 'Directory deleted permanently', filesDeleted: 0 }
      });

      await client.deleteDirectory('test/dir', false, true);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/vault/test%2Fdir', {
        headers: {
          'Target-Type': 'directory',
          'Recursive': 'false',
          'Permanent': 'true'
        }
      });
    });
  });

  describe('moveDirectory', () => {
    it('should move a directory', async () => {
      vi.mocked(mockAxiosInstance.patch).mockResolvedValue({
        data: {
          message: 'Directory moved',
          oldPath: 'old/path',
          newPath: 'new/path',
          filesMovedCount: 10
        }
      });

      const result = await client.moveDirectory('old/path', 'new/path');

      expect(result).toEqual({
        movedFiles: [],
        failedFiles: [],
        success: true,
        message: 'Directory moved',
        oldPath: 'old/path',
        newPath: 'new/path',
        filesMovedCount: 10
      });
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/vault/old/path',
        'new/path',
        {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'move',
            'Target-Type': 'directory',
            'Target': 'path'
          },
          timeout: 120000
        }
      );
    });

    it('should handle directory not found', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404, data: {} }
      };
      vi.mocked(mockAxiosInstance.patch).mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      await expect(client.moveDirectory('missing', 'new')).rejects.toThrow(ObsidianError);
    });
  });

  describe('copyDirectory', () => {
    it('should copy a directory', async () => {
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: {
          filesCopied: 15,
          failedFiles: [],
          message: 'Directory copied'
        }
      });

      const result = await client.copyDirectory('source/dir', 'dest/dir');

      expect(result).toEqual({
        filesCopied: 15,
        failedFiles: [],
        message: 'Directory copied'
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/vault/dest%2Fdir',
        'source/dir',
        {
          headers: {
            'Content-Type': 'text/plain',
            'Operation': 'copy',
            'Target-Type': 'directory',
            'Overwrite': 'false'
          },
          timeout: 120000
        }
      );
    });

    it('should copy with overwrite', async () => {
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: {
          filesCopied: 10,
          failedFiles: ['file1.md'],
          message: 'Directory copied with some failures'
        }
      });

      const result = await client.copyDirectory('source', 'dest', true);

      expect(result.failedFiles).toContain('file1.md');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/vault/dest',
        'source',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Overwrite': 'true'
          })
        })
      );
    });
  });
});