import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetFileMetadataTool } from '../../src/tools/GetFileMetadataTool.js';
import { GetFileFrontmatterTool } from '../../src/tools/GetFileFrontmatterTool.js';
import { GetFileFormattedTool } from '../../src/tools/GetFileFormattedTool.js';
import { GetFileContentsTool } from '../../src/tools/GetFileContentsTool.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js');

describe('Content Negotiation Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getFileContents: vi.fn()
    };
    
    // Mock the getClient method for all tools
    vi.spyOn(GetFileMetadataTool.prototype as any, 'getClient').mockReturnValue(mockClient);
    vi.spyOn(GetFileFrontmatterTool.prototype as any, 'getClient').mockReturnValue(mockClient);
    vi.spyOn(GetFileFormattedTool.prototype as any, 'getClient').mockReturnValue(mockClient);
    vi.spyOn(GetFileContentsTool.prototype as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('GetFileMetadataTool', () => {
    let tool: GetFileMetadataTool;

    beforeEach(() => {
      tool = new GetFileMetadataTool();
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('obsidian_get_file_metadata');
      expect(tool.description).toContain('metadata');
      expect(tool.description).toContain('Efficient for large notes');
    });

    it('should call getFileContents with metadata format', async () => {
      const mockMetadata = {
        path: 'test.md',
        stat: { size: 1024, mtime: 1234567890, ctime: 1234567890 },
        frontmatter: { title: 'Test' },
        tags: ['tag1']
      };
      
      mockClient.getFileContents.mockResolvedValue(mockMetadata);

      const result = await tool.execute({ filepath: 'test.md' });

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md', 'metadata');
      expect(result.type).toBe('text');
      expect(JSON.parse(result.text)).toEqual({
        success: true,
        filepath: 'test.md',
        metadata: mockMetadata
      });
    });

    it('should validate file path', async () => {
      const result = await tool.execute({ filepath: '../invalid/path.md' });

      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('contains dangerous pattern');
      expect(mockClient.getFileContents).not.toHaveBeenCalled();
    });

    it('should handle client errors', async () => {
      mockClient.getFileContents.mockRejectedValue(new Error('File not found'));

      const result = await tool.execute({ filepath: 'nonexistent.md' });

      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('File not found');
    });
  });

  describe('GetFileFrontmatterTool', () => {
    let tool: GetFileFrontmatterTool;

    beforeEach(() => {
      tool = new GetFileFrontmatterTool();
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('obsidian_get_file_frontmatter');
      expect(tool.description).toContain('frontmatter');
      expect(tool.description).toContain('Returns YAML metadata only');
    });

    it('should call getFileContents with frontmatter format', async () => {
      const mockFrontmatter = {
        title: 'Test Note',
        tags: ['important', 'work'],
        created: '2024-01-01'
      };
      
      mockClient.getFileContents.mockResolvedValue(mockFrontmatter);

      const result = await tool.execute({ filepath: 'note.md' });

      expect(mockClient.getFileContents).toHaveBeenCalledWith('note.md', 'frontmatter');
      expect(result.type).toBe('text');
      expect(JSON.parse(result.text)).toEqual({
        success: true,
        filepath: 'note.md',
        frontmatter: mockFrontmatter
      });
    });
  });

  describe('GetFileFormattedTool', () => {
    let tool: GetFileFormattedTool;

    beforeEach(() => {
      tool = new GetFileFormattedTool();
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('obsidian_get_file_formatted');
      expect(tool.description).toContain('different formats');
      expect(tool.description).toContain('Plain text, HTML, or markdown');
    });

    it('should support all format options in schema', () => {
      expect(tool.inputSchema.properties.format.enum).toEqual(['plain', 'html', 'content']);
    });

    it('should call getFileContents with specified format', async () => {
      const mockContent = '<h1>Test</h1><p>This is HTML content.</p>';
      mockClient.getFileContents.mockResolvedValue(mockContent);

      const result = await tool.execute({ filepath: 'test.md', format: 'html' });

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md', 'html');
      expect(result.type).toBe('text');
      expect(JSON.parse(result.text)).toEqual({
        success: true,
        filepath: 'test.md',
        format: 'html',
        content: mockContent
      });
    });

    it('should handle plain text format', async () => {
      const mockPlainText = 'This is plain text without markdown formatting.';
      mockClient.getFileContents.mockResolvedValue(mockPlainText);

      const result = await tool.execute({ filepath: 'test.md', format: 'plain' });

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md', 'plain');
      expect(result.type).toBe('text');
      const parsedResult = JSON.parse(result.text);
      expect(parsedResult.content).toBe(mockPlainText);
    });
  });

  describe('Enhanced GetFileContentsTool', () => {
    let tool: GetFileContentsTool;

    beforeEach(() => {
      tool = new GetFileContentsTool();
    });

    it('should support format parameter in schema', () => {
      expect(tool.inputSchema.properties.format).toBeDefined();
      expect(tool.inputSchema.properties.format.enum).toEqual(['content', 'metadata', 'frontmatter', 'plain', 'html']);
    });

    it('should call getFileContents without format by default', async () => {
      const mockContent = '# Test\n\nDefault content';
      mockClient.getFileContents.mockResolvedValue(mockContent);

      const result = await tool.execute({ filepath: 'test.md' });

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md', undefined);
      expect(result.type).toBe('text');
      expect(result.text).toBe(mockContent);
    });

    it('should pass format parameter when provided', async () => {
      const mockMetadata = { size: 1024, modified: '2024-01-01' };
      mockClient.getFileContents.mockResolvedValue(mockMetadata);

      const result = await tool.execute({ filepath: 'test.md', format: 'metadata' });

      expect(mockClient.getFileContents).toHaveBeenCalledWith('test.md', 'metadata');
      expect(result.type).toBe('text');
      expect(result.text).toBe(JSON.stringify(mockMetadata, null, 2));
    });
  });
});