/**
 * Test to reproduce CreateDirectoryTool bug where it reports success 
 * when directory creation actually fails
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateDirectoryTool } from '../../src/tools/CreateDirectoryTool.js';
import type { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

describe('CreateDirectoryTool Bug Reproduction', () => {
  let tool: CreateDirectoryTool;
  let mockClient: ObsidianClient;

  beforeEach(() => {
    // Create a mock client that simulates API failure but doesn't throw
    mockClient = {
      createDirectory: vi.fn().mockResolvedValue({
        created: true,
        message: 'Directory successfully created',
        parentsCreated: false
      }),
      checkPathExists: vi.fn().mockResolvedValue({
        exists: false,
        type: null
      })
    } as any;

    tool = new CreateDirectoryTool();
    // Inject mock client
    (tool as any).getClient = () => mockClient;
  });

  it('should detect when directory creation claims success but path does not exist', async () => {
    const result = await tool.executeTyped({
      directoryPath: 'test-directory'
    });

    // After fix: Tool now detects the issue and reports failure
    const parsedResult = JSON.parse(result.text as string);
    expect(parsedResult.success).toBe(false);
    expect(parsedResult.error).toContain('Directory creation failed');

    // Verification that directory check was called
    expect(mockClient.checkPathExists).toHaveBeenCalledWith('test-directory');
  });

  it('should handle API errors that are not properly propagated', async () => {
    // Simulate an API that returns success but directory is not created
    // (This might happen with authentication issues, permission problems, etc.)
    
    mockClient.createDirectory = vi.fn().mockResolvedValue({
      created: true, // API lies about success
      message: 'Directory successfully created'
    });

    const result = await tool.executeTyped({
      directoryPath: 'fake-success-directory'
    });

    const parsedResult = JSON.parse(result.text as string);
    
    // After fix: detects the issue and reports failure
    expect(parsedResult.success).toBe(false);
    expect(parsedResult.error).toContain('Directory creation failed');
    
    // Verification step was performed
    expect(mockClient.checkPathExists).toHaveBeenCalledWith('fake-success-directory');
  });

  it('should verify directory creation after API call (proposed fix)', async () => {
    // This test describes the desired behavior after fixing the bug
    
    // Mock API returns success but verification shows directory doesn't exist
    mockClient.createDirectory = vi.fn().mockResolvedValue({
      created: true,
      message: 'Directory successfully created'
    });
    
    mockClient.checkPathExists = vi.fn().mockResolvedValue({
      exists: false, // Directory doesn't actually exist
      type: null
    });

    const result = await tool.executeTyped({
      directoryPath: 'verify-test-directory'
    });

    const parsedResult = JSON.parse(result.text as string);
    
    // After fix: should detect the mismatch and report error
    expect(parsedResult.success).toBe(false);
    expect(parsedResult.error).toContain('Directory creation failed');
    
    // Should verify the directory existence
    expect(mockClient.checkPathExists).toHaveBeenCalledWith('verify-test-directory');
  });
});