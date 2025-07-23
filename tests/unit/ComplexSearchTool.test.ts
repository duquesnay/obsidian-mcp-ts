import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplexSearchTool } from '../../src/tools/ComplexSearchTool.js';

vi.mock('../../src/obsidian/ObsidianClient.js');

describe('ComplexSearchTool', () => {
  let tool: ComplexSearchTool;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      complexSearch: vi.fn()
    };
    
    tool = new ComplexSearchTool();
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  it('should have correct name and description', () => {
    expect(tool.name).toBe('obsidian_complex_search');
    expect(tool.description).toContain('JsonLogic');
  });

  it('should accept valid JsonLogic queries', async () => {
    const mockResults = {
      results: [{ path: 'test.md', content: 'test content' }],
      totalResults: 1
    };
    
    mockClient.complexSearch.mockResolvedValue(mockResults);

    // Valid JsonLogic query
    const query = {
      "and": [
        { "contains": ["content", "project"] },
        { "contains": ["content", "deadline"] }
      ]
    };

    const result = await tool.execute({ query });

    expect(mockClient.complexSearch).toHaveBeenCalledWith(query);
    expect(result.type).toBe('text');
    const parsed = JSON.parse(result.text);
    expect(parsed.results).toHaveLength(1);
  });

  it('should reject invalid JsonLogic queries', async () => {
    // Invalid query - not a JsonLogic structure
    const invalidQuery = {
      "invalidOperator": "value"
    };

    const result = await tool.execute({ query: invalidQuery });

    expect(result).toBeDefined();
    expect(result.type).toBe('text');
    expect(result.text).toBeDefined();
    const parsed = JSON.parse(result.text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('Invalid JsonLogic query');
    expect(mockClient.complexSearch).not.toHaveBeenCalled();
  });

  it('should accept comparison operators', async () => {
    const mockResults = { results: [], totalResults: 0 };
    mockClient.complexSearch.mockResolvedValue(mockResults);

    const query = {
      ">": ["mtime", Date.now() - 7 * 24 * 60 * 60 * 1000]
    };

    const result = await tool.execute({ query });

    expect(mockClient.complexSearch).toHaveBeenCalledWith(query);
    expect(result.type).toBe('text');
  });

  it('should require query parameter', async () => {
    const result = await tool.execute({});

    expect(result.type).toBe('text');
    const parsed = JSON.parse(result.text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('query argument is required');
    expect(mockClient.complexSearch).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockClient.complexSearch.mockRejectedValue(new Error('API error'));

    const query = { "==": ["status", "active"] };

    const result = await tool.execute({ query });

    expect(result.type).toBe('text');
    const parsed = JSON.parse(result.text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('API error');
  });
});