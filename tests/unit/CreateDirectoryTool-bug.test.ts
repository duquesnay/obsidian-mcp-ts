/**
 * Test for CreateDirectoryTool with fixed API
 * Now that the Obsidian REST API v4.0.0 properly handles empty directories,
 * we trust the API responses without additional verification.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateDirectoryTool } from '../../src/tools/CreateDirectoryTool.js';
import type { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

describe('CreateDirectoryTool with Fixed API', () => {
  let tool: CreateDirectoryTool;
  let mockClient: ObsidianClient;

  beforeEach(() => {
    // Create a mock client that simulates successful directory creation
    mockClient = {
      createDirectory: vi.fn().mockResolvedValue({
        created: true,
        message: 'Directory successfully created',
        parentsCreated: false
      })
    } as any;

    tool = new CreateDirectoryTool();
    // Inject mock client
    (tool as any).getClient = () => mockClient;
  });

  it('should trust API success response without verification', async () => {
    const result = await tool.executeTyped({
      directoryPath: 'test-directory'
    });

    // With fixed API: We trust the API response
    const parsedResult = JSON.parse(result.text as string);
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.message).toContain('Directory');
    expect(parsedResult.message).toContain('created');
    expect(parsedResult.directoryPath).toBe('test-directory');

    // No verification step needed
    expect(mockClient.createDirectory).toHaveBeenCalledWith('test-directory', true);
  });

  it('should handle API errors directly', async () => {
    // Simulate API error (e.g., permission denied)
    mockClient.createDirectory = vi.fn().mockRejectedValue(
      new Error('Permission denied')
    );

    const result = await tool.executeTyped({
      directoryPath: 'forbidden-directory'
    });

    const parsedResult = JSON.parse(result.text as string);

    // With fixed API: Real errors are thrown by the API
    expect(parsedResult.success).toBe(false);
    expect(parsedResult.error).toContain('Permission denied');
  });

  it('should create directory with parents when requested', async () => {
    mockClient.createDirectory = vi.fn().mockResolvedValue({
      created: true,
      message: 'Directory successfully created',
      parentsCreated: true
    });

    const result = await tool.executeTyped({
      directoryPath: 'parent/child/grandchild',
      createParents: true
    });

    const parsedResult = JSON.parse(result.text as string);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.parentsCreated).toBe(true);
    expect(mockClient.createDirectory).toHaveBeenCalledWith('parent/child/grandchild', true);
  });
});
