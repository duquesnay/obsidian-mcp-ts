import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { FileOperationsClient } from '../../../src/obsidian/services/FileOperationsClient.js';
import { ObsidianError } from '../../../src/types/errors.js';
import { NotificationManager } from '../../../src/utils/NotificationManager.js';
import { SUBSCRIPTION_EVENTS } from '../../../src/constants.js';
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

  describe('Cache Invalidation Notifications', () => {
    let notificationManager: NotificationManager;
    let notifyFileCreatedSpy: ReturnType<typeof vi.fn>;
    let notifyFileUpdatedSpy: ReturnType<typeof vi.fn>;
    let notifyFileDeletedSpy: ReturnType<typeof vi.fn>;
    let notifyCacheInvalidationSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Reset and get fresh notification manager instance
      NotificationManager.reset();
      notificationManager = NotificationManager.getInstance();
      
      // Spy on notification methods
      notifyFileCreatedSpy = vi.spyOn(notificationManager, 'notifyFileCreated');
      notifyFileUpdatedSpy = vi.spyOn(notificationManager, 'notifyFileUpdated');
      notifyFileDeletedSpy = vi.spyOn(notificationManager, 'notifyFileDeleted');
      notifyCacheInvalidationSpy = vi.spyOn(notificationManager, 'notifyCacheInvalidation');
    });

    describe('createFile notifications', () => {
      it('should trigger FILE_CREATED and CACHE_INVALIDATED events on successful file creation', async () => {
        vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

        await client.createFile('new.md', 'Content');

        expect(notifyFileCreatedSpy).toHaveBeenCalledWith('new.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('new.md', expect.any(Object));
      });

      it('should not trigger notifications if file creation fails', async () => {
        vi.mocked(mockAxiosInstance.put).mockRejectedValue(new Error('Creation failed'));

        await expect(client.createFile('new.md', 'Content')).rejects.toThrow();

        expect(notifyFileCreatedSpy).not.toHaveBeenCalled();
        expect(notifyCacheInvalidationSpy).not.toHaveBeenCalled();
      });
    });

    describe('updateFile notifications', () => {
      it('should trigger FILE_UPDATED and CACHE_INVALIDATED events on successful file update', async () => {
        vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

        await client.updateFile('existing.md', 'New Content');

        expect(notifyFileUpdatedSpy).toHaveBeenCalledWith('existing.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('existing.md', expect.any(Object));
      });
    });

    describe('deleteFile notifications', () => {
      it('should trigger FILE_DELETED and CACHE_INVALIDATED events on successful file deletion', async () => {
        vi.mocked(mockAxiosInstance.delete).mockResolvedValue({ data: {} });

        await client.deleteFile('old.md');

        expect(notifyFileDeletedSpy).toHaveBeenCalledWith('old.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('old.md', expect.any(Object));
      });

      it('should not trigger notifications if file deletion fails', async () => {
        vi.mocked(mockAxiosInstance.delete).mockRejectedValue(new Error('Deletion failed'));

        await expect(client.deleteFile('old.md')).rejects.toThrow();

        expect(notifyFileDeletedSpy).not.toHaveBeenCalled();
        expect(notifyCacheInvalidationSpy).not.toHaveBeenCalled();
      });
    });

    describe('appendContent notifications', () => {
      it('should trigger FILE_UPDATED and CACHE_INVALIDATED events on successful append', async () => {
        vi.mocked(mockAxiosInstance.post).mockResolvedValue({ data: {} });

        await client.appendContent('test.md', 'Additional content');

        expect(notifyFileUpdatedSpy).toHaveBeenCalledWith('test.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('test.md', expect.any(Object));
      });
    });

    describe('patchContent notifications', () => {
      it('should trigger FILE_UPDATED and CACHE_INVALIDATED events on successful patch', async () => {
        vi.mocked(mockAxiosInstance.patch).mockResolvedValue({ data: {} });

        await client.patchContent('test.md', 'New content', {
          targetType: 'heading',
          target: 'My Heading'
        });

        expect(notifyFileUpdatedSpy).toHaveBeenCalledWith('test.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('test.md', expect.any(Object));
      });
    });

    describe('copyFile notifications', () => {
      it('should trigger FILE_CREATED and CACHE_INVALIDATED events on successful copy', async () => {
        // Mock source file read
        vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: 'Content' });
        // Mock destination check (should not exist)
        const notFoundError = Object.assign(new Error('Not found'), {
          isAxiosError: true,
          response: { status: 404, data: {} }
        });
        vi.mocked(mockAxiosInstance.get).mockRejectedValueOnce(notFoundError);
        vi.mocked(axios.isAxiosError).mockReturnValue(true);
        // Mock destination file creation
        vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

        await client.copyFile('source.md', 'dest.md');

        expect(notifyFileCreatedSpy).toHaveBeenCalledWith('dest.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('dest.md', expect.any(Object));
      });
    });

    describe('moveFile notifications', () => {
      it('should trigger FILE_UPDATED and CACHE_INVALIDATED events on successful move', async () => {
        vi.mocked(mockAxiosInstance.patch).mockResolvedValue({ data: {} });

        await client.moveFile('old.md', 'new.md');

        expect(notifyFileUpdatedSpy).toHaveBeenCalledWith('old.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('old.md', expect.any(Object));
      });
    });

    describe('renameFile notifications', () => {
      it('should trigger FILE_UPDATED and CACHE_INVALIDATED events on successful rename', async () => {
        vi.mocked(mockAxiosInstance.patch).mockResolvedValue({ data: {} });

        await client.renameFile('old.md', 'new.md');

        expect(notifyFileUpdatedSpy).toHaveBeenCalledWith('old.md', expect.any(Object));
        expect(notifyCacheInvalidationSpy).toHaveBeenCalledWith('old.md', expect.any(Object));
      });
    });

    describe('notification error handling', () => {
      it('should not fail file operations if notifications throw errors', async () => {
        // Make notifications throw errors
        notifyFileCreatedSpy.mockImplementation(() => {
          throw new Error('Notification failed');
        });
        notifyCacheInvalidationSpy.mockImplementation(() => {
          throw new Error('Cache invalidation failed');
        });

        vi.mocked(mockAxiosInstance.put).mockResolvedValue({ data: {} });

        // File operation should still succeed despite notification errors
        await expect(client.createFile('new.md', 'Content')).resolves.not.toThrow();
      });
    });
  });
});