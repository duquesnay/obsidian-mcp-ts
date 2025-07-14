import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdvancedSearchTool } from '../../src/tools/AdvancedSearchTool.js';

vi.mock('../../src/obsidian/ObsidianClient.js');

describe('AdvancedSearchTool', () => {
  let tool: AdvancedSearchTool;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      advancedSearch: vi.fn()
    };
    
    tool = new AdvancedSearchTool();
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  it('should have correct name and description', () => {
    expect(tool.name).toBe('obsidian_advanced_search');
    expect(tool.description).toContain('Advanced search');
    expect(tool.description).toContain('Filter by content, metadata, tags');
  });

  it('should have comprehensive input schema', () => {
    const schema = tool.inputSchema;
    
    expect(schema.properties.filters).toBeDefined();
    expect(schema.properties.options).toBeDefined();
    expect(schema.required).toEqual(['filters']);
    
    // Check filter types
    const filters = schema.properties.filters.properties;
    expect(filters.content).toBeDefined();
    expect(filters.frontmatter).toBeDefined();
    expect(filters.file).toBeDefined();
    expect(filters.tags).toBeDefined();
  });

  it('should perform content search', async () => {
    const mockResults = {
      totalResults: 5,
      results: [
        {
          path: 'test.md',
          score: 0.95,
          matches: [
            { type: 'content', context: 'found TODO here', lineNumber: 10 }
          ]
        }
      ],
      hasMore: false
    };
    
    mockClient.advancedSearch.mockResolvedValue(mockResults);

    const filters = {
      content: {
        query: 'TODO',
        caseSensitive: false
      }
    };
    
    const options = {
      limit: 10,
      includeContent: false
    };

    const result = await tool.execute({ filters, options });

    expect(mockClient.advancedSearch).toHaveBeenCalledWith(filters, options);
    expect(result.type).toBe('text');
    expect(JSON.parse(result.text)).toEqual({
      success: true,
      totalResults: 5,
      results: mockResults.results,
      hasMore: false
    });
  });

  it('should perform frontmatter search', async () => {
    const mockResults = {
      totalResults: 3,
      results: [
        {
          path: 'project.md',
          matches: [
            { type: 'frontmatter', field: 'status', context: 'in-progress' }
          ]
        }
      ],
      hasMore: false
    };
    
    mockClient.advancedSearch.mockResolvedValue(mockResults);

    const filters = {
      frontmatter: {
        status: {
          operator: 'equals',
          value: 'in-progress'
        }
      }
    };

    const result = await tool.execute({ filters });

    expect(mockClient.advancedSearch).toHaveBeenCalledWith(filters, {});
    expect(result.type).toBe('text');
    const parsedResult = JSON.parse(result.text);
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.totalResults).toBe(3);
  });

  it('should perform file metadata search', async () => {
    const mockResults = {
      totalResults: 10,
      results: [
        {
          path: 'large-file.md',
          metadata: {
            size: 15000,
            modified: '2024-01-01T00:00:00Z'
          }
        }
      ],
      hasMore: true
    };
    
    mockClient.advancedSearch.mockResolvedValue(mockResults);

    const filters = {
      file: {
        size: { min: 10000 },
        extension: ['md'],
        modified: {
          after: '2023-12-01T00:00:00Z'
        }
      }
    };

    const result = await tool.execute({ filters });

    expect(result.type).toBe('text');
    const parsedResult = JSON.parse(result.text);
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.hasMore).toBe(true);
  });

  it('should perform tag search', async () => {
    const mockResults = {
      totalResults: 7,
      results: [
        {
          path: 'tagged-note.md',
          tags: ['project', 'important'],
          matches: [
            { type: 'tag', context: '#project' }
          ]
        }
      ],
      hasMore: false
    };
    
    mockClient.advancedSearch.mockResolvedValue(mockResults);

    const filters = {
      tags: {
        include: ['project'],
        exclude: ['archived'],
        mode: 'any'
      }
    };

    const result = await tool.execute({ filters });

    expect(result.type).toBe('text');
    const parsedResult = JSON.parse(result.text);
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.results[0].tags).toContain('project');
  });

  it('should perform regex search', async () => {
    const mockResults = {
      totalResults: 2,
      results: [
        {
          path: 'code-notes.md',
          matches: [
            { type: 'content', context: 'TODO: fix this bug', lineNumber: 25 }
          ]
        }
      ],
      hasMore: false
    };
    
    mockClient.advancedSearch.mockResolvedValue(mockResults);

    const filters = {
      content: {
        regex: 'TODO|FIXME',
        caseSensitive: false
      }
    };

    const result = await tool.execute({ filters });

    expect(result.type).toBe('text');
    const parsedResult = JSON.parse(result.text);
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.results[0].matches[0].context).toContain('TODO');
  });

  it('should require at least one filter', async () => {
    const result = await tool.execute({ filters: {} });

    expect(result.type).toBe('text');
    const response = JSON.parse(result.text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('At least one filter must be specified');
    expect(mockClient.advancedSearch).not.toHaveBeenCalled();
  });

  it('should handle search errors', async () => {
    mockClient.advancedSearch.mockRejectedValue(new Error('Search service unavailable'));

    const filters = {
      content: { query: 'test' }
    };

    const result = await tool.execute({ filters });

    expect(result.type).toBe('text');
    const response = JSON.parse(result.text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('Search service unavailable');
  });

  it('should support pagination and sorting options', async () => {
    const mockResults = {
      totalResults: 100,
      results: [],
      hasMore: true
    };
    
    mockClient.advancedSearch.mockResolvedValue(mockResults);

    const filters = { content: { query: 'test' } };
    const options = {
      limit: 25,
      offset: 50,
      sort: {
        field: 'modified',
        direction: 'desc'
      },
      includeContent: true,
      contextLength: 200
    };

    const result = await tool.execute({ filters, options });

    expect(mockClient.advancedSearch).toHaveBeenCalledWith(filters, options);
    expect(result.type).toBe('text');
    const parsedResult = JSON.parse(result.text);
    expect(parsedResult.success).toBe(true);
  });
});