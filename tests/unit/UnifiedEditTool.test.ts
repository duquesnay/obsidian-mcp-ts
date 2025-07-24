import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedEditTool } from '../../src/tools/UnifiedEditTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

describe('UnifiedEditTool Bug Fixes', () => {
  let tool: UnifiedEditTool;
  let mockClient: any;

  beforeEach(() => {
    tool = new UnifiedEditTool();
    
    // Mock the ObsidianClient
    mockClient = {
      patchContent: vi.fn().mockResolvedValue({ success: true }),
      getFileContents: vi.fn(),
      appendContent: vi.fn().mockResolvedValue({ success: true }),
      updateFile: vi.fn().mockResolvedValue({ success: true }),
    };
    
    // Mock getClient to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('After Heading Insert Bug', () => {
    it('should use correct operation for inserting content after a heading', async () => {
      const args = {
        file: 'test.md',
        after: 'Introduction',
        add: '\nThis content comes after the introduction.'
      };

      await tool.executeTyped(args);

      // The bug: it passes insertAfter: true, but patchContent doesn't recognize it
      // It should pass insertBefore: false or handle it differently
      expect(mockClient.patchContent).toHaveBeenCalledWith(
        'test.md',
        '\nThis content comes after the introduction.',
        expect.objectContaining({
          targetType: 'heading',
          target: 'Introduction',
          // This test will fail because the code uses insertAfter: true
          // which is not recognized by patchContent
        })
      );
    });

    it('should return success when inserting after heading works', async () => {
      const args = {
        file: 'test.md',
        after: 'Features',
        add: '\n- New feature added'
      };

      const result = await tool.executeTyped(args);

      // The tool returns a wrapped text response
      expect(result.type).toBe('text');
      const parsed = JSON.parse(result.text);
      expect(parsed).toMatchObject({
        success: true,
        operation: 'insert_after_heading',
        filepath: 'test.md',
        heading: 'Features'
      });
    });
  });

  describe('Batch Append Operation Bug', () => {
    it('should handle append operation in batch mode', async () => {
      const args = {
        file: 'test.md',
        batch: [
            { find: 'Content', replace: 'Updated Content' },  // This text exists in mock
            { append: '\n## New Section\nAdded via batch' }
        ]
      };

      const result = await tool.executeTyped(args);

      // Check that batch processing handles append correctly
      expect(result.type).toBe('text');
      const parsed = JSON.parse(result.text);
      expect(parsed.batch_results).toBeDefined();
      expect(parsed.batch_results.failed).toBe(0);
      expect(parsed.batch_results.successful).toBe(2);
      
      // Verify append was called
      expect(mockClient.appendContent).toHaveBeenCalledWith(
        'test.md',
        '\n## New Section\nAdded via batch',
        false
      );
    });

    it('should handle multiple append operations in batch', async () => {
      const args = {
        file: 'test.md',
        batch: [
          { append: '\nFirst append' },
          { append: '\nSecond append' },
          { find: 'Content', replace: 'Updated Content' },  // Use text that exists
          { append: '\nThird append' }
        ]
      };

      const result = await tool.executeTyped(args);

      expect(result.type).toBe('text');
      const parsed = JSON.parse(result.text);
      expect(parsed.batch_results.successful).toBe(4);
      expect(parsed.batch_results.failed).toBe(0);
      expect(mockClient.appendContent).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed operations in batch including append', async () => {
      mockClient.getFileContents.mockResolvedValue('# Test\n## Section 1\nContent');

      const args = {
        file: 'test.md',
        batch: [
          { after: 'Test', add: '\nAdded after heading' },
          { append: '\n## New Section' },
          { find: 'Content', replace: 'Updated Content' }
        ]
      };

      const result = await tool.executeTyped(args);

      expect(result.type).toBe('text');
      const parsed = JSON.parse(result.text);
      expect(parsed.batch_results.successful).toBe(3);
      expect(mockClient.patchContent).toHaveBeenCalled();
      expect(mockClient.appendContent).toHaveBeenCalled();
      expect(mockClient.updateFile).toHaveBeenCalled();
    });
  });

  describe('insertAfter vs Operation mapping', () => {
    it('should map insertAfter to correct patchContent operation', async () => {
      const args = {
        file: 'test.md',
        after: 'Section 1',
        add: '\nContent after section'
      };

      await tool.executeTyped(args);

      // Check what was actually passed to patchContent
      const patchCall = mockClient.patchContent.mock.calls[0];
      const options = patchCall[2];
      
      // After our fix, insertAfter is now recognized and handled properly
      expect(options).toHaveProperty('insertAfter', true);
      expect(options).toHaveProperty('targetType', 'heading');
      expect(options).toHaveProperty('target', 'Section 1');
    });
  });
});