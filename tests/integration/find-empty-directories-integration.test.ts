import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FindEmptyDirectoriesTool } from '../../src/tools/FindEmptyDirectoriesTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

describe('FindEmptyDirectoriesTool Integration', () => {
  let tool: FindEmptyDirectoriesTool;
  let client: ObsidianClient;

  beforeAll(async () => {
    if (!process.env.OBSIDIAN_API_KEY) {
      throw new Error('OBSIDIAN_API_KEY environment variable is required for integration tests');
    }

    tool = new FindEmptyDirectoriesTool();
    client = new ObsidianClient();
    
    // Test connection
    try {
      await client.listFilesInVault();
    } catch (error) {
      console.error('Cannot connect to Obsidian REST API:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up any test directories created during tests
    try {
      await client.deleteDirectory('test-empty-dir-integration/', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should find empty directories in real vault', async () => {
    // Create an empty directory for testing
    await client.createDirectory('test-empty-dir-integration/');

    const result = await tool.execute({});
    
    expect(result.type).toBe('text');
    const response = JSON.parse(result.text);
    expect(response).toHaveProperty('emptyDirectories');
    expect(response).toHaveProperty('count');
    expect(response.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(response.emptyDirectories)).toBe(true);
    
    // Our test directory should be in the results
    expect(response.emptyDirectories).toContain('test-empty-dir-integration/');
  });

  it('should respect includeHiddenFiles parameter', async () => {
    // Create a directory with only hidden files
    await client.createDirectory('test-hidden-files/');
    
    // Note: We can't directly create hidden files via the API,
    // but we can test the parameter handling
    const result = await tool.execute({ includeHiddenFiles: false });
    
    expect(result.type).toBe('text');
    const response = JSON.parse(result.text);
    expect(response.includeHiddenFiles).toBe(false);
    
    // Clean up
    try {
      await client.deleteDirectory('test-hidden-files/', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should search within specific path', async () => {
    // Create nested structure for testing
    await client.createDirectory('test-search-path/empty-subdir/');
    await client.createDirectory('test-search-path/non-empty-subdir/');
    await client.createFile('test-search-path/non-empty-subdir/test-file.md', '# Test File\n\nContent here.');

    const result = await tool.execute({ searchPath: 'test-search-path/' });
    
    expect(result.type).toBe('text');
    const response = JSON.parse(result.text);
    expect(response.searchPath).toBe('test-search-path/');
    expect(response.emptyDirectories).toContain('empty-subdir/');
    expect(response.emptyDirectories).not.toContain('non-empty-subdir/');
    
    // Clean up
    try {
      await client.deleteDirectory('test-search-path/', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle errors gracefully', async () => {
    const result = await tool.execute({ searchPath: 'non-existent-path/' });
    
    // Should either return empty results or handle the error gracefully
    expect(result.type).toBe('text');
    const response = JSON.parse(result.text);
    
    // Either empty results or error message, both are acceptable
    if (response.emptyDirectories) {
      expect(Array.isArray(response.emptyDirectories)).toBe(true);
    } else {
      expect(response).toHaveProperty('error');
    }
  });
});