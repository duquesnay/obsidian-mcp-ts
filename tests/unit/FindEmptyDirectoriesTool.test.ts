import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FindEmptyDirectoriesTool } from '../../src/tools/FindEmptyDirectoriesTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock the ObsidianClient module
vi.mock('../../src/obsidian/ObsidianClient.js');

describe('FindEmptyDirectoriesTool', () => {
  let tool: FindEmptyDirectoriesTool;
  let mockClient: any;
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up environment variables
    process.env = { ...originalEnv, OBSIDIAN_API_KEY: 'test-key' };
    
    // Create mock client methods
    mockClient = {
      listFilesInVault: vi.fn(),
      listFilesInDir: vi.fn(),
      checkPathExists: vi.fn(),
    };
    
    // Mock the ObsidianClient constructor to return our mock
    vi.mocked(ObsidianClient).mockImplementation(() => mockClient as any);
    
    tool = new FindEmptyDirectoriesTool();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('obsidian_find_empty_directories');
    expect(tool.description).toContain('Find all empty directories');
    expect(tool.inputSchema.properties).toHaveProperty('searchPath');
    expect(tool.inputSchema.properties).toHaveProperty('includeHiddenFiles');
  });

  it('should find empty directories in vault', async () => {
    // Mock vault listing with some files and directories
    mockClient.listFilesInVault.mockResolvedValue([
      'docs/README.md',
      'docs/guide.md',
      'empty-folder/',
      'templates/',
      'archive/old-notes.md',
      'another-empty/'
    ]);

    // Mock directory listings
    mockClient.listFilesInDir.mockImplementation((dir: string) => {
      if (dir === 'empty-folder/' || dir === 'another-empty/') {
        return Promise.reject(new Error('Error 404: Not Found'));
      }
      if (dir === 'templates/') {
        return Promise.resolve([]);
      }
      return Promise.resolve(['some-file.md']);
    });

    // Mock path existence checks
    mockClient.checkPathExists.mockImplementation((path: string) => {
      if (path === 'empty-folder/' || path === 'another-empty/' || path === 'templates/') {
        return Promise.resolve({ exists: true, type: 'directory' });
      }
      return Promise.resolve({ exists: false, type: null });
    });

    const result = await tool.execute({});
    
    expect(result.type).toBe('text');
    const parsed = JSON.parse(result.text);
    expect(parsed.emptyDirectories).toContain('empty-folder/');
    expect(parsed.emptyDirectories).toContain('another-empty/');
    expect(parsed.emptyDirectories).toContain('templates/');
    expect(parsed.count).toBe(3);
  });

  it('should filter hidden files when includeHiddenFiles is false', async () => {
    mockClient.listFilesInVault.mockResolvedValue([
      'folder-with-hidden/',
      'folder-with-hidden/.DS_Store'
    ]);

    mockClient.listFilesInDir.mockResolvedValue(['.DS_Store']);

    const result = await tool.execute({ includeHiddenFiles: false });
    
    const parsed = JSON.parse(result.text);
    expect(parsed.emptyDirectories).toContain('folder-with-hidden/');
    expect(parsed.includeHiddenFiles).toBe(false);
  });

  it('should search within specific path when searchPath is provided', async () => {
    // Mock initial listing of projects directory
    mockClient.listFilesInDir.mockImplementation((dir: string) => {
      if (dir === 'projects/') {
        return Promise.resolve([
          'project1/',
          'project1/README.md',
          'empty-project/',
          'project2/src/main.ts'
        ]);
      }
      if (dir === 'empty-project/') {
        // This is an empty directory
        return Promise.resolve([]);
      }
      if (dir === 'project1/') {
        return Promise.resolve(['README.md']);
      }
      return Promise.resolve(['some-file.md']);
    });

    mockClient.checkPathExists.mockResolvedValue({ exists: true, type: 'directory' });

    const result = await tool.execute({ searchPath: 'projects/' });
    
    const parsed = JSON.parse(result.text);
    expect(parsed.searchPath).toBe('projects/');
    expect(parsed.emptyDirectories).toContain('projects/empty-project/');
  });

  it('should handle errors gracefully', async () => {
    mockClient.listFilesInVault.mockRejectedValue(new Error('API Error'));

    const result = await tool.execute({});
    
    expect(result.text).toContain('Error');
    expect(result.text).toContain('API Error');
  });
});