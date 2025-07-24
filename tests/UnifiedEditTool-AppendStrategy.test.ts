import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedEditTool } from '../src/tools/UnifiedEditTool.js';
import { AppendStrategy } from '../src/tools/strategies/AppendStrategy.js';
import type { IObsidianClient } from '../src/obsidian/interfaces/IObsidianClient.js';

describe('UnifiedEditTool with AppendStrategy', () => {
  let tool: UnifiedEditTool;
  let mockClient: IObsidianClient;

  beforeEach(() => {
    tool = new UnifiedEditTool();
    mockClient = {
      appendContent: vi.fn(),
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      patchContent: vi.fn(),
    } as any;
    
    // Mock getClient to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  it('should use AppendStrategy for append operations', async () => {
    const args = {
      file: 'test.md',
      append: 'New content to append'
    };

    const result = await tool.executeTyped(args);

    expect(mockClient.appendContent).toHaveBeenCalledWith('test.md', 'New content to append', false);
    expect(result.text).toContain('Successfully appended content to test.md');
  });

  it('should handle append errors with AppendStrategy', async () => {
    const args = {
      file: 'test.md',
      append: 'New content'
    };

    vi.mocked(mockClient.appendContent).mockRejectedValue(new Error('Append failed'));

    const result = await tool.executeTyped(args);

    expect(result.text).toContain('Append failed');
    expect(result.text).toContain('Try using obsidian_simple_append instead');
  });
});