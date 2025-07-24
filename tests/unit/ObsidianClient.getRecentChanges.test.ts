import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { FileOperationsClient } from '../../src/obsidian/services/FileOperationsClient.js';
import type { RecentChange } from '../../src/types/obsidian.js';

// Mock FileOperationsClient
vi.mock('../../src/obsidian/services/FileOperationsClient.js');

describe('ObsidianClient.getRecentChanges', () => {
  let client: ObsidianClient;
  let mockFileOpsClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock FileOperationsClient
    mockFileOpsClient = {
      getRecentChanges: vi.fn(),
    };

    // Mock the FileOperationsClient constructor
    vi.mocked(FileOperationsClient).mockImplementation(() => mockFileOpsClient);

    client = new ObsidianClient({
      apiKey: 'test-api-key',
      host: '127.0.0.1',
      port: 27124
    });
  });

  it('should delegate getRecentChanges to FileOperationsClient', async () => {
    const mockChanges: RecentChange[] = [
      { path: 'file1.md', mtime: Date.now() },
      { path: 'file2.md', mtime: Date.now() }
    ];

    mockFileOpsClient.getRecentChanges.mockResolvedValue(mockChanges);

    const result = await client.getRecentChanges('projects', 10, 0, 100);

    expect(mockFileOpsClient.getRecentChanges).toHaveBeenCalledWith('projects', 10, 0, 100);
    expect(result).toEqual(mockChanges);
  });

  it('should handle getRecentChanges with no parameters', async () => {
    const mockChanges: RecentChange[] = [
      { path: 'file1.md', mtime: Date.now() }
    ];

    mockFileOpsClient.getRecentChanges.mockResolvedValue(mockChanges);

    const result = await client.getRecentChanges();

    expect(mockFileOpsClient.getRecentChanges).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
    expect(result).toEqual(mockChanges);
  });
});