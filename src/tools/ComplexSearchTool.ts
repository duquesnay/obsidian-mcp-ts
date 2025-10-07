import { ComplexSearchArgs } from './types/ComplexSearchArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { JsonLogicQuery } from '../types/jsonlogic.js';

/**
 * Validates if an object appears to be a JsonLogic query
 * Note: The Obsidian API may support extended JsonLogic operators beyond the standard set
 * @param query - The query object to validate
 * @returns true if it looks like a JsonLogic structure
 */
function isValidJsonLogic(query: unknown): boolean {
  if (!query || typeof query !== 'object') return false;
  
  // Standard JsonLogic operators
  const standardOps = [
    // Logic
    'and', 'or', 'not', '!', '!!', 'if',
    // Comparison
    '==', '===', '!=', '!==', '>', '>=', '<', '<=',
    // Array/String
    'in', 'cat', 'substr', 'merge',
    // Math
    '+', '-', '*', '/', '%', 'min', 'max',
    // Variable/Data
    'var', 'missing', 'missing_some', 'method',
    // Array operations
    'map', 'filter', 'reduce', 'all', 'some', 'none'
  ];
  
  // Extended operators that Obsidian API might support
  const extendedOps = ['contains', 'startsWith', 'endsWith'];
  
  const allOps = [...standardOps, ...extendedOps];
  const keys = Object.keys(query);
  
  // Check if at least one key is an operator
  const hasOperator = keys.some(key => allOps.includes(key));
  
  // Also allow queries with nested objects (for complex structures)
  if (!hasOperator && keys.length > 0) {
    // Check if it's a data object (not an operator object)
    // In JsonLogic, if no operator is found, it's treated as data
    // But we should reject simple key-value pairs that don't look like JsonLogic
    return false;
  }
  
  return hasOperator;
}

export class ComplexSearchTool extends BaseTool<ComplexSearchArgs> {
  name = 'obsidian_complex_search';
  description = 'Complex search in Obsidian vault using JsonLogic.';
  
  metadata: ToolMetadata = {
    category: 'search',
    keywords: ['search', 'complex', 'jsonlogic', 'query', 'advanced'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'object',
        description: 'JsonLogic query object for complex searches.'
      }
    },
    required: ['query']
  };

  async executeTyped(args: ComplexSearchArgs): Promise<ToolResponse> {
    try {
      if (!args.query) {
        throw new McpError(ErrorCode.InvalidParams, 'query argument is required');
      }
      
      // Validate JsonLogic structure
      if (!isValidJsonLogic(args.query)) {
        throw new McpError(
          ErrorCode.InvalidParams, 
          'Invalid JsonLogic query. Query must be an object with valid JsonLogic operators. Example: {"and": [{"contains": ["content", "project"]}, {"contains": ["content", "deadline"]}]}'
        );
      }
      
      const client = this.getClient();
      const results = await client.complexSearch(args.query);
      return this.formatResponse(results);
    } catch (error) {
      return this.handleError(error);
    }
  }
}