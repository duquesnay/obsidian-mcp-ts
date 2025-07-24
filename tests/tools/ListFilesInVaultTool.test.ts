import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListFilesInVaultTool } from '../../src/tools/ListFilesInVaultTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

describe('ListFilesInVaultTool', () => {
  let tool: ListFilesInVaultTool;
  let mockClient: any;

  beforeEach(() => {
    tool = new ListFilesInVaultTool();
    mockClient = {
      listFilesInVault: vi.fn()
    };
    tool.getClient = vi.fn().mockReturnValue(mockClient);
  });

  describe('Large vault optimization', () => {
    it('should handle pagination for large vaults', async () => {
      // Generate mock data for a large vault
      const totalFiles = 15000;
      const allFiles = Array.from({ length: totalFiles }, (_, i) => `note-${i}.md`);
      
      mockClient.listFilesInVault.mockResolvedValue(allFiles);

      // Test with pagination parameters
      const result = await tool.executeTyped({ 
        limit: 1000,
        offset: 0 
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.files).toHaveLength(1000);
      expect(data.totalCount).toBe(totalFiles);
      expect(data.hasMore).toBe(true);
      expect(data.nextOffset).toBe(1000);
    });

    it('should return all files when no pagination is requested', async () => {
      const files = ['file1.md', 'file2.md', 'file3.md'];
      mockClient.listFilesInVault.mockResolvedValue(files);

      const result = await tool.executeTyped({});

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.files).toEqual(files);
      expect(data.count).toBe(3);
      expect(data.hasMore).toBeUndefined();
    });

    it('should handle offset beyond total files', async () => {
      const files = Array.from({ length: 100 }, (_, i) => `note-${i}.md`);
      mockClient.listFilesInVault.mockResolvedValue(files);

      const result = await tool.executeTyped({ 
        limit: 50,
        offset: 150 
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.files).toHaveLength(0);
      expect(data.totalCount).toBe(100);
      expect(data.hasMore).toBe(false);
    });

    it('should validate pagination parameters', async () => {
      const result = await tool.executeTyped({ 
        limit: -1,
        offset: -5 
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/limit must be a positive integer|offset must be non-negative/);
    });

    it('should apply maximum limit constraint', async () => {
      const files = Array.from({ length: 10000 }, (_, i) => `note-${i}.md`);
      mockClient.listFilesInVault.mockResolvedValue(files);

      const result = await tool.executeTyped({ 
        limit: 10000 // Too high
      });

      expect(result.type).toBe('text');
      const data = JSON.parse(result.text);
      expect(data.files).toHaveLength(5000); // Should be capped at MAX_LIST_LIMIT
      expect(data.hasMore).toBe(true);
    });
  });
});