import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListFilesInDirTool } from '../../src/tools/ListFilesInDirTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ObsidianError } from '../../src/types/errors.js';

// Mock the ObsidianClient module
vi.mock('../../src/obsidian/ObsidianClient.js');

describe('ListFilesInDirTool', () => {
  let tool: ListFilesInDirTool;
  let mockClient: any;
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up environment variables
    process.env = { ...originalEnv, OBSIDIAN_API_KEY: 'test-key' };
    
    // Create mock client methods
    mockClient = {
      listFilesInDir: vi.fn(),
      checkPathExists: vi.fn(),
    };
    
    // Mock the ObsidianClient constructor to return our mock
    vi.mocked(ObsidianClient).mockImplementation(() => mockClient as any);
    
    tool = new ListFilesInDirTool();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('obsidian_list_files_in_dir');
    expect(tool.description).toContain('List notes and folders in a specific');
    expect(tool.inputSchema.properties.dirpath.description).toContain('empty directories will not be returned');
  });

  it('should list files in a directory with content', async () => {
    const testFiles = ['file1.md', 'file2.md', 'subfolder/'];
    mockClient.listFilesInDir.mockResolvedValue(testFiles);

    const result = await tool.execute({ dirpath: 'test-dir/' });
    
    expect(mockClient.listFilesInDir).toHaveBeenCalledWith('test-dir/');
    expect(result.type).toBe('text');
    const resultData = JSON.parse(result.text);
    expect(resultData).toEqual(testFiles);
  });

  it('should return empty array for empty directories', async () => {
    // Mock 404 error for empty directory
    mockClient.listFilesInDir.mockRejectedValue(
      new ObsidianError('Error 404: Not Found', 404)
    );
    
    // Mock that the path exists and is a directory
    mockClient.checkPathExists.mockResolvedValue({
      exists: true,
      type: 'directory'
    });

    const result = await tool.execute({ dirpath: 'empty-dir/' });
    
    expect(mockClient.checkPathExists).toHaveBeenCalledWith('empty-dir/');
    expect(result.text).toContain('[]');
  });

  it('should return error for non-existent paths', async () => {
    // Mock 404 error
    mockClient.listFilesInDir.mockRejectedValue(
      new ObsidianError('Error 404: Not Found', 404)
    );
    
    // Mock that the path doesn't exist
    mockClient.checkPathExists.mockResolvedValue({
      exists: false,
      type: null
    });

    const result = await tool.execute({ dirpath: 'non-existent/' });
    
    expect(result.text).toContain('Error');
    expect(result.text).toContain('404');
  });

  it('should handle other errors normally', async () => {
    mockClient.listFilesInDir.mockRejectedValue(
      new Error('Network error')
    );

    const result = await tool.execute({ dirpath: 'test-dir/' });
    
    const response = JSON.parse(result.text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('Network error');
  });

  it('should validate missing dirpath argument', async () => {
    const result = await tool.execute({} as any);
    
    const response = JSON.parse(result.text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('dirpath argument missing');
  });

  it('should validate path format', async () => {
    const result = await tool.execute({ dirpath: '../../../etc/passwd' });
    
    const response = JSON.parse(result.text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('dirpath contains parent directory traversal');
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_list_files_in_dir');
      expect(tool.description).toContain('List notes and folders in a specific');
      expect(tool.description).toContain('vault');
    });

    it('should mention the vault://folder/{path} resource with 2min cache', () => {
      expect(tool.description).toContain('vault://folder/{path}');
      expect(tool.description).toMatch(/2\s*min(?:ute)?s?\s*cache/i);
      expect(tool.description).toContain('resource');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.dirpath).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['dirpath']);
    });
  });
});