import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedEditTool } from '../src/tools/UnifiedEditTool.js';
import type { IObsidianClient } from '../src/obsidian/interfaces/IObsidianClient.js';

describe('UnifiedEditTool - HeadingInsert Strategy Integration', () => {
  let tool: UnifiedEditTool;
  let mockClient: IObsidianClient;

  beforeEach(() => {
    mockClient = {
      patchContent: vi.fn(),
    } as any;

    tool = new UnifiedEditTool();
    tool['getClient'] = () => mockClient;
  });

  it('should use HeadingInsertStrategy for after heading operations', async () => {
    const args = {
      file: 'test.md',
      after: 'My Heading',
      add: 'New content to add'
    };

    const result = await tool.executeTyped(args);

    expect(mockClient.patchContent).toHaveBeenCalledWith(
      'test.md',
      'New content to add',
      {
        targetType: 'heading',
        target: 'My Heading',
        insertAfter: true,
        insertBefore: false,
        createIfNotExists: false
      }
    );

    const response = JSON.parse(result.text);
    expect(response.success).toBe(true);
    expect(response.operation).toBe('insert_after_heading');
    expect(response.heading).toBe('My Heading');
  });

  it('should use HeadingInsertStrategy for before heading operations', async () => {
    const args = {
      file: 'test.md',
      before: 'Another Heading',
      add: 'Content before heading'
    };

    const result = await tool.executeTyped(args);

    expect(mockClient.patchContent).toHaveBeenCalledWith(
      'test.md',
      'Content before heading',
      {
        targetType: 'heading',
        target: 'Another Heading',
        insertAfter: false,
        insertBefore: true,
        createIfNotExists: false
      }
    );

    const response = JSON.parse(result.text);
    expect(response.success).toBe(true);
    expect(response.operation).toBe('insert_before_heading');
    expect(response.heading).toBe('Another Heading');
  });

  it('should handle errors with working alternatives', async () => {
    const args = {
      file: 'test.md',
      after: 'Non-existent Heading',
      add: 'Some content'
    };

    vi.mocked(mockClient.patchContent).mockRejectedValueOnce(
      new Error('Heading not found')
    );

    const result = await tool.executeTyped(args);
    const response = JSON.parse(result.text);

    expect(response.success).toBe(false);
    expect(response.error).toContain('Heading insertion failed');
    expect(response.possible_causes).toBeDefined();
    expect(response.working_alternatives).toBeDefined();
    expect(response.working_alternatives[0].example).toEqual({
      file: 'test.md',
      append: 'Some content'
    });
  });

  it('should handle batch operations with heading inserts', async () => {
    const args = {
      file: 'test.md',
      batch: [
        { after: 'First Heading', add: 'Content 1' },
        { before: 'Second Heading', add: 'Content 2' }
      ]
    };

    const result = await tool.executeTyped(args);

    expect(mockClient.patchContent).toHaveBeenCalledTimes(2);
    
    const response = JSON.parse(result.text);
    expect(response.batch_results.successful).toBe(2);
    expect(response.batch_results.total_operations).toBe(2);
  });

  it('should require both heading and content for heading operations', async () => {
    const args1 = {
      file: 'test.md',
      after: 'Heading',
      // missing 'add'
    };

    const result1 = await tool.executeTyped(args1 as any);
    const response1 = JSON.parse(result1.text);
    // When 'add' is missing, it falls through to "No valid operation"
    expect(response1.error).toContain("No valid operation specified");

    const args2 = {
      file: 'test.md',
      add: 'Content',
      // missing 'after' or 'before'
    };

    const result2 = await tool.executeTyped(args2 as any);
    const response2 = JSON.parse(result2.text);
    expect(response2.error).toContain("No valid operation specified");
    
    // Test the actual validation in handleHeadingInsert
    const args3 = {
      file: 'test.md',
      after: 'Heading',
      add: ''  // empty content
    };

    const result3 = await tool.executeTyped(args3 as any);
    const response3 = JSON.parse(result3.text);
    expect(response3.error).toContain("Heading insert requires");
  });
});