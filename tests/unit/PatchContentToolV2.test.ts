import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatchContentToolV2 } from '../../src/tools/PatchContentToolV2.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';
import { ConfigLoader } from '../../src/utils/configLoader.js';

// Mock the ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient');
vi.mock('../../src/utils/configLoader.js');

describe('PatchContentToolV2', () => {
  let tool: PatchContentToolV2;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock client with necessary methods
    mockClient = {
      getFileContents: vi.fn(),
      updateFile: vi.fn(),
      patchContent: vi.fn(),
    };
    
    // Mock the ObsidianClient constructor to return our mock
    vi.mocked(ObsidianClient).mockImplementation(() => mockClient as any);
    
    // Mock ConfigLoader
    vi.mocked(ConfigLoader.getInstance).mockReturnValue({
      getApiKey: () => 'test-key',
      getHost: () => '127.0.0.1'
    } as any);
    
    // Create tool instance
    tool = new PatchContentToolV2();
  });

  describe('Simple Operations', () => {
    it('should append text to document', async () => {
      mockClient.getFileContents.mockResolvedValue('Existing content');
      
      const result = await tool.execute({
        filepath: 'test.md',
        append: 'New content'
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'Existing content\nNew content');
    });

    it('should prepend text to document', async () => {
      mockClient.getFileContents.mockResolvedValue('Existing content');
      
      const result = await tool.execute({
        filepath: 'test.md',
        prepend: 'New content'
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'New content\nExisting content');
    });

    it('should perform simple find and replace', async () => {
      mockClient.getFileContents.mockResolvedValue('Hello world! Hello everyone!');
      
      const result = await tool.execute({
        filepath: 'test.md',
        replace: { find: 'Hello', with: 'Hi' }
      });
      
      expect(result.success).toBe(true);
      expect(result.changes?.count).toBe(2);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'Hi world! Hi everyone!');
    });

    it('should insert after heading', async () => {
      mockClient.patchContent.mockResolvedValue({ success: true });
      
      const result = await tool.execute({
        filepath: 'test.md',
        insertAfterHeading: { heading: 'Introduction', content: 'New content' }
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'New content', {
        targetType: 'heading',
        target: 'Introduction',
        insertAfter: true,
        insertBefore: false
      });
    });

    it('should insert before heading', async () => {
      mockClient.patchContent.mockResolvedValue({ success: true });
      
      const result = await tool.execute({
        filepath: 'test.md',
        insertBeforeHeading: { heading: 'Conclusion', content: 'New content' }
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', 'New content', {
        targetType: 'heading',
        target: 'Conclusion',
        insertAfter: false,
        insertBefore: true
      });
    });

    it('should update frontmatter fields', async () => {
      mockClient.patchContent.mockResolvedValue({ success: true });
      
      const result = await tool.execute({
        filepath: 'test.md',
        updateFrontmatter: { title: 'New Title', tags: ['tag1', 'tag2'] }
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', '"New Title"', {
        targetType: 'frontmatter',
        target: 'title'
      });
      expect(mockClient.patchContent).toHaveBeenCalledWith('test.md', '["tag1","tag2"]', {
        targetType: 'frontmatter',
        target: 'tags'
      });
    });
  });

  describe('Advanced Operations', () => {
    it('should handle advanced insert operation', async () => {
      mockClient.getFileContents.mockResolvedValue('Content');
      
      const result = await tool.execute({
        filepath: 'test.md',
        operation: {
          type: 'insert',
          insert: {
            content: 'New content',
            location: {
              type: 'document',
              document: { position: 'end' },
              position: 'after'
            }
          }
        }
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'Content\nNew content');
    });

    it('should handle advanced replace with options', async () => {
      mockClient.getFileContents.mockResolvedValue('Hello HELLO hello');
      
      const result = await tool.execute({
        filepath: 'test.md',
        operation: {
          type: 'replace',
          replace: {
            pattern: 'hello',
            replacement: 'hi',
            options: {
              case_sensitive: false
            }
          }
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.changes?.count).toBe(3);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'hi hi hi');
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error when no operation specified', async () => {
      const result = await tool.execute({
        filepath: 'test.md'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_OPERATION');
      expect(result.error?.hint).toContain('append, prepend, replace');
      expect(result.error?.example).toBeDefined();
    });

    it('should provide helpful error when pattern not found', async () => {
      mockClient.getFileContents.mockResolvedValue('Hello world');
      
      const result = await tool.execute({
        filepath: 'test.md',
        replace: { find: 'Goodbye', with: 'Hi' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PATTERN_NOT_FOUND');
      expect(result.error?.hint).toContain('Check your search pattern');
    });

    it('should handle file read errors gracefully', async () => {
      mockClient.getFileContents.mockRejectedValue(new Error('File not found'));
      
      const result = await tool.execute({
        filepath: 'test.md',
        append: 'New content'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSERT_ERROR');
      expect(result.error?.message).toContain('File not found');
    });
  });

  describe('Special Cases', () => {
    it('should handle append when content already ends with newline', async () => {
      mockClient.getFileContents.mockResolvedValue('Content\n');
      
      const result = await tool.execute({
        filepath: 'test.md',
        append: 'New content'
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'Content\nNew content');
    });

    it('should insert after frontmatter correctly', async () => {
      const content = '---\ntitle: Test\n---\n\nContent';
      mockClient.getFileContents.mockResolvedValue(content);
      
      const result = await tool.execute({
        filepath: 'test.md',
        operation: {
          type: 'insert',
          insert: {
            content: 'New content',
            location: {
              type: 'document',
              document: { position: 'after_frontmatter' },
              position: 'after'
            }
          }
        }
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith(
        'test.md', 
        '---\ntitle: Test\n---\nNew content\n\nContent'
      );
    });

    it('should handle regex special characters in find/replace', async () => {
      mockClient.getFileContents.mockResolvedValue('Price is $10.50');
      
      const result = await tool.execute({
        filepath: 'test.md',
        replace: { find: '$10.50', with: '$15.75' }
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.updateFile).toHaveBeenCalledWith('test.md', 'Price is $15.75');
    });
  });

  describe('Dry Run Mode', () => {
    it('should not make changes in dry run mode', async () => {
      const result = await tool.execute({
        filepath: 'test.md',
        append: 'New content',
        options: { dry_run: true }
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Dry run');
      expect(mockClient.updateFile).not.toHaveBeenCalled();
      expect(mockClient.getFileContents).not.toHaveBeenCalled();
    });
  });
});