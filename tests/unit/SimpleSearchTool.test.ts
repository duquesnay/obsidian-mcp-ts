import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleSearchTool } from '../../src/tools/SimpleSearchTool.js';
import { ObsidianClient } from '../../src/obsidian/ObsidianClient.js';

// Mock ObsidianClient
vi.mock('../../src/obsidian/ObsidianClient.js', () => ({
  ObsidianClient: vi.fn()
}));

describe('SimpleSearchTool', () => {
  let tool: SimpleSearchTool;
  let mockClient: Partial<ObsidianClient>;

  beforeEach(() => {
    mockClient = {
      search: vi.fn()
    };

    tool = new SimpleSearchTool();
    // Mock the getClient method to return our mock
    vi.spyOn(tool as any, 'getClient').mockReturnValue(mockClient);
  });

  describe('success scenarios', () => {
    it('should perform simple search with default parameters', async () => {
      const args = {
        query: 'test search'
      };

      const mockResults = {
        results: [
          {
            filename: 'note1.md',
            matches: [
              {
                text: 'This is a test search example',
                context: 'Before text... This is a test search example... After text'
              }
            ]
          }
        ],
        total: 1,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toEqual(mockResults);
      expect(mockClient.search).toHaveBeenCalledWith('test search', 100, 50, 0);
    });

    it('should perform search with custom parameters', async () => {
      const args = {
        query: 'custom search',
        contextLength: 150,
        limit: 25,
        offset: 10
      };

      const mockResults = {
        results: [
          {
            filename: 'note2.md',
            matches: [
              {
                text: 'custom search result',
                context: 'Extended context around custom search result with more details'
              }
            ]
          }
        ],
        total: 35,
        limit: 25,
        offset: 10
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toEqual(mockResults);
      expect(mockClient.search).toHaveBeenCalledWith('custom search', 150, 25, 10);
    });

    it('should handle multiple search results across files', async () => {
      const args = {
        query: 'important concept'
      };

      const mockResults = {
        results: [
          {
            filename: 'chapter1.md',
            matches: [
              {
                text: 'important concept definition',
                context: 'The important concept definition is explained here'
              },
              {
                text: 'another important concept mention',
                context: 'We also see another important concept mention later'
              }
            ]
          },
          {
            filename: 'chapter2.md',
            matches: [
              {
                text: 'important concept application',
                context: 'How to apply the important concept application in practice'
              }
            ]
          }
        ],
        total: 3,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toEqual(mockResults);
      expect(response.results).toHaveLength(2);
      expect(response.total).toBe(3);
    });

    it('should handle empty search results', async () => {
      const args = {
        query: 'nonexistent term'
      };

      const mockResults = {
        results: [],
        total: 0,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toEqual(mockResults);
      expect(response.results).toHaveLength(0);
      expect(response.total).toBe(0);
    });

    it('should enforce maximum limit of 200', async () => {
      const args = {
        query: 'test',
        limit: 500 // Should be capped at 200
      };

      const mockResults = {
        results: [],
        total: 0,
        limit: 200,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      expect(mockClient.search).toHaveBeenCalledWith('test', 100, 200, 0);
    });

    it('should handle pagination correctly', async () => {
      const args = {
        query: 'paginated search',
        limit: 10,
        offset: 20
      };

      const mockResults = {
        results: [
          {
            filename: 'page3.md',
            matches: [
              {
                text: 'paginated search result 21',
                context: 'This is paginated search result 21 from the third page'
              }
            ]
          }
        ],
        total: 100,
        limit: 10,
        offset: 20
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response).toEqual(mockResults);
      expect(mockClient.search).toHaveBeenCalledWith('paginated search', 100, 10, 20);
    });
  });

  describe('error scenarios - input validation', () => {
    it('should handle missing query parameter', async () => {
      const args = {};

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('query argument missing in arguments');
      expect(response.tool).toBe('obsidian_simple_search');
    });

    it('should handle empty query parameter', async () => {
      const args = {
        query: ''
      };

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('query argument missing in arguments');
    });

    it('should handle null query parameter', async () => {
      const args = {
        query: null
      };

      const result = await tool.execute(args as any);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('query argument missing in arguments');
    });

    it('should handle negative limit values (passes through as-is)', async () => {
      const args = {
        query: 'test',
        limit: -5
      };

      const mockResults = { results: [], total: 0, limit: -5, offset: 0 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      // Note: The tool doesn't validate negative limits, passes them through
      expect(mockClient.search).toHaveBeenCalledWith('test', 100, -5, 0);
    });

    it('should handle negative offset values (passes through as-is)', async () => {
      const args = {
        query: 'test',
        offset: -10
      };

      const mockResults = { results: [], total: 0, limit: 50, offset: -10 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      // Note: The tool doesn't validate negative offsets, passes them through
      expect(mockClient.search).toHaveBeenCalledWith('test', 100, 50, -10);
    });
  });

  describe('error scenarios - search operations', () => {
    it('should handle API connection errors', async () => {
      const args = {
        query: 'test search'
      };

      const error = new Error('Connection refused');
      vi.mocked(mockClient.search!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Connection refused');
      expect(response.tool).toBe('obsidian_simple_search');
    });

    it('should handle permission errors', async () => {
      const args = {
        query: 'restricted search'
      };

      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };
      vi.mocked(mockClient.search!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Authentication failed');
    });

    it('should handle timeout errors', async () => {
      const args = {
        query: 'slow search'
      };

      const error = new Error('Request timeout');
      vi.mocked(mockClient.search!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Request timeout');
    });

    it('should handle search service errors', async () => {
      const args = {
        query: 'problematic search'
      };

      const error = new Error('Search index unavailable');
      vi.mocked(mockClient.search!).mockRejectedValue(error);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Search index unavailable');
    });
  });

  describe('parameter validation and defaults', () => {
    it('should apply default values for optional parameters', async () => {
      const args = {
        query: 'default test'
      };

      const mockResults = { results: [], total: 0, limit: 50, offset: 0 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      expect(mockClient.search).toHaveBeenCalledWith('default test', 100, 50, 0);
    });

    it('should respect custom contextLength parameter', async () => {
      const args = {
        query: 'context test',
        contextLength: 200
      };

      const mockResults = { results: [], total: 0, limit: 50, offset: 0 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      expect(mockClient.search).toHaveBeenCalledWith('context test', 200, 50, 0);
    });

    it('should handle zero contextLength (gets converted to default)', async () => {
      const args = {
        query: 'zero context',
        contextLength: 0
      };

      const mockResults = { results: [], total: 0, limit: 50, offset: 0 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      // Note: 0 is falsy, so args.contextLength || 100 becomes 100
      expect(mockClient.search).toHaveBeenCalledWith('zero context', 100, 50, 0);
    });

    it('should handle minimum valid limit', async () => {
      const args = {
        query: 'min limit test',
        limit: 1
      };

      const mockResults = { results: [], total: 0, limit: 1, offset: 0 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      expect(mockClient.search).toHaveBeenCalledWith('min limit test', 100, 1, 0);
    });

    it('should handle maximum valid limit', async () => {
      const args = {
        query: 'max limit test',
        limit: 200
      };

      const mockResults = { results: [], total: 0, limit: 200, offset: 0 };
      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      await tool.execute(args);

      expect(mockClient.search).toHaveBeenCalledWith('max limit test', 100, 200, 0);
    });
  });

  describe('response format validation', () => {
    it('should return structured search results', async () => {
      const args = {
        query: 'structure test'
      };

      const mockResults = {
        results: [
          {
            filename: 'test.md',
            matches: [
              {
                text: 'structure test match',
                context: 'This is a structure test match with context'
              }
            ]
          }
        ],
        total: 1,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      
      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('limit');
      expect(response).toHaveProperty('offset');
      expect(Array.isArray(response.results)).toBe(true);
    });

    it('should preserve match structure for each result', async () => {
      const args = {
        query: 'match structure'
      };

      const mockResults = {
        results: [
          {
            filename: 'detailed.md',
            matches: [
              {
                text: 'exact match text',
                context: 'surrounding context for exact match text with more details',
                lineNumber: 42
              }
            ]
          }
        ],
        total: 1,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.results[0]).toHaveProperty('filename');
      expect(response.results[0]).toHaveProperty('matches');
      expect(response.results[0].matches[0]).toHaveProperty('text');
      expect(response.results[0].matches[0]).toHaveProperty('context');
      expect(response.results[0].filename).toBe('detailed.md');
    });

    it('should handle search results with special characters', async () => {
      const args = {
        query: 'special "characters" & symbols'
      };

      const mockResults = {
        results: [
          {
            filename: 'symbols.md',
            matches: [
              {
                text: 'special "characters" & symbols found',
                context: 'Text with special "characters" & symbols found in content'
              }
            ]
          }
        ],
        total: 1,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      expect(response.results[0].matches[0].text).toBe('special "characters" & symbols found');
    });
  });

  describe('LLM ergonomics', () => {
    it('should provide easily parseable search results', async () => {
      const args = {
        query: 'ergonomic search'
      };

      const mockResults = {
        results: [
          {
            filename: 'ergonomics.md',
            matches: [
              {
                text: 'ergonomic search interface',
                context: 'The ergonomic search interface makes it easy to find content'
              }
            ]
          }
        ],
        total: 1,
        limit: 50,
        offset: 0
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // Should be easy for LLMs to iterate through and process
      expect(response.results).toBeInstanceOf(Array);
      expect(typeof response.total).toBe('number');
      expect(typeof response.limit).toBe('number');
      expect(typeof response.offset).toBe('number');
      
      // Each result should have consistent structure
      response.results.forEach((result: any) => {
        expect(result).toHaveProperty('filename');
        expect(result).toHaveProperty('matches');
        expect(Array.isArray(result.matches)).toBe(true);
        
        result.matches.forEach((match: any) => {
          expect(match).toHaveProperty('text');
          expect(match).toHaveProperty('context');
        });
      });
    });

    it('should provide pagination information for large result sets', async () => {
      const args = {
        query: 'large dataset',
        limit: 20,
        offset: 40
      };

      const mockResults = {
        results: [
          {
            filename: 'dataset1.md',
            matches: [
              {
                text: 'large dataset entry 41',
                context: 'This large dataset entry 41 is part of the collection'
              }
            ]
          }
        ],
        total: 500,
        limit: 20,
        offset: 40
      };

      vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

      const result = await tool.execute(args);
      const response = JSON.parse(result.text);

      // Pagination metadata should help LLMs understand result context
      expect(response.total).toBe(500);
      expect(response.limit).toBe(20);
      expect(response.offset).toBe(40);
      
      // LLM can calculate pagination: showing results 41-60 of 500
      const currentStart = response.offset + 1;
      const currentEnd = Math.min(response.offset + response.limit, response.total);
      expect(currentStart).toBe(41);
      expect(currentEnd).toBe(60);
    });

    it('should handle search queries with various complexities', async () => {
      const testQueries = [
        'simple',
        'multi word query',
        'query with "quotes"',
        'query-with-dashes',
        'query_with_underscores',
        'query with & special chars!'
      ];

      for (const query of testQueries) {
        const args = { query };
        
        const mockResults = {
          results: [
            {
              filename: 'test.md',
              matches: [
                {
                  text: `Found: ${query}`,
                  context: `Context around found: ${query} with surrounding text`
                }
              ]
            }
          ],
          total: 1,
          limit: 50,
          offset: 0
        };

        vi.mocked(mockClient.search!).mockResolvedValue(mockResults);

        const result = await tool.execute(args);
        const response = JSON.parse(result.text);

        expect(response.results[0].matches[0].text).toContain(query);
        expect(mockClient.search).toHaveBeenCalledWith(query, 100, 50, 0);
      }
    });
  });

  describe('tool metadata', () => {
    it('should have appropriate tool name and description', () => {
      expect(tool.name).toBe('obsidian_simple_search');
      expect(tool.description).toContain('Search text in Obsidian vault notes');
      expect(tool.description).toContain('vault');
      expect(tool.description).toContain('paginated results');
    });

    it('should have proper input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.query).toBeDefined();
      expect(tool.inputSchema.properties.contextLength).toBeDefined();
      expect(tool.inputSchema.properties.limit).toBeDefined();
      expect(tool.inputSchema.properties.offset).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['query']);
    });

    it('should specify parameter constraints correctly', () => {
      const schema = tool.inputSchema.properties;
      
      expect(schema.query.type).toBe('string');
      expect(schema.contextLength.type).toBe('integer');
      expect(schema.contextLength.default).toBe(100);
      expect(schema.limit.type).toBe('integer');
      expect(schema.limit.default).toBe(50);
      expect(schema.limit.minimum).toBe(1);
      expect(schema.limit.maximum).toBe(200);
      expect(schema.offset.type).toBe('integer');
      expect(schema.offset.default).toBe(0);
      expect(schema.offset.minimum).toBe(0);
    });

    it('should provide helpful parameter descriptions', () => {
      const schema = tool.inputSchema.properties;
      
      expect(schema.query.description).toBe('Search query');
      expect(schema.contextLength.description).toContain('characters to include around each match');
      expect(schema.limit.description).toContain('Maximum number of results');
      expect(schema.offset.description).toContain('skip');
    });
  });
});