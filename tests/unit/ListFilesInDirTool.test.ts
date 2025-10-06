import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListFilesInDirTool } from '../../src/tools/ListFilesInDirTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ObsidianError } from '../../src/types/errors.js';
import { defaultCachedHandlers } from '../../src/resources/CachedConcreteHandlers.js';

// Mock the ObsidianClient module
vi.mock('../../src/obsidian/ObsidianClient.js');

// Mock the cached handlers
vi.mock('../../src/resources/CachedConcreteHandlers.js', () => ({
  defaultCachedHandlers: {
    folder: {
      handleRequest: vi.fn()
    }
  }
}));

describe('ListFilesInDirTool', () => {
  let tool: ListFilesInDirTool;
  let mockClient: any;
  let mockFolderHandler: any;
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up environment variables
    process.env = { ...originalEnv, OBSIDIAN_API_KEY: 'test-key' };
    
    // Create mock client methods
    mockClient = {
      listFilesInDir: vi.fn(),
      checkPathExists: vi.fn(),
    };
    
    // Mock the folder handler
    mockFolderHandler = vi.mocked(defaultCachedHandlers.folder.handleRequest);
    
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
    expect(tool.description).toContain('List notes and folders');
    expect(tool.inputSchema.properties.dirpath.description).toContain('empty directories will not be returned');
  });

  it('should list files in a directory with content', async () => {
    const testFiles = ['file1.md', 'file2.md', 'subfolder/'];
    const resourceResponse = {
      path: 'test-dir/',
      items: testFiles
    };
    
    mockFolderHandler.mockResolvedValue(resourceResponse);

    const result = await tool.execute({ dirpath: 'test-dir/' });
    
    expect(mockFolderHandler).toHaveBeenCalledWith('vault://folder/test-dir/');
    expect(result.type).toBe('text');
    const resultData = JSON.parse(result.text);
    expect(resultData).toEqual(testFiles);
  });

  it('should return empty array for empty directories', async () => {
    // With fixed API, empty directories return empty items array, not 404
    const resourceResponse = {
      path: 'empty-dir/',
      items: []
    };

    mockFolderHandler.mockResolvedValue(resourceResponse);

    const result = await tool.execute({ dirpath: 'empty-dir/' });

    expect(mockFolderHandler).toHaveBeenCalledWith('vault://folder/empty-dir/');
    expect(result.text).toContain('[]');
  });

  it('should return error for non-existent paths', async () => {
    // Mock 404 error from resource for truly non-existent path
    mockFolderHandler.mockRejectedValue(
      new ObsidianError('Error 404: Not Found', 404)
    );

    const result = await tool.execute({ dirpath: 'non-existent/' });

    expect(mockFolderHandler).toHaveBeenCalledWith('vault://folder/non-existent/');
    expect(result.text).toContain('404');
  });

  it('should handle other errors normally', async () => {
    mockFolderHandler.mockRejectedValue(
      new Error('Network error')
    );

    const result = await tool.execute({ dirpath: 'test-dir/' });
    
    expect(mockFolderHandler).toHaveBeenCalledWith('vault://folder/test-dir/');
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
      expect(tool.description).toContain('List notes and folders');
      expect(tool.description).toContain('vault');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.dirpath).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['dirpath']);
    });
  });

  describe('resource integration', () => {
    it('should use cached folder resource instead of direct client call', async () => {
      const testFiles = ['file1.md', 'file2.md', 'subfolder/'];
      const resourceResponse = {
        path: 'test-dir/',
        items: testFiles
      };
      
      mockFolderHandler.mockResolvedValue(resourceResponse);

      const result = await tool.execute({ dirpath: 'test-dir/' });
      
      // Should call the resource handler with the correct URI
      expect(mockFolderHandler).toHaveBeenCalledWith('vault://folder/test-dir/');
      
      // Should NOT call the direct client method
      expect(mockClient.listFilesInDir).not.toHaveBeenCalled();
      
      // Should return the files from the resource
      expect(result.type).toBe('text');
      const resultData = JSON.parse(result.text);
      expect(resultData).toEqual(testFiles);
    });

    it('should handle resource errors with proper fallback to error handling', async () => {
      const resourceError = new Error('Resource error');
      mockFolderHandler.mockRejectedValue(resourceError);

      const result = await tool.execute({ dirpath: 'test-dir/' });
      
      expect(mockFolderHandler).toHaveBeenCalledWith('vault://folder/test-dir/');
      expect(result.text).toContain('Resource error');
    });
  });
});