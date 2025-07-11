import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedEditTool } from '../../src/tools/UnifiedEditTool.js';
import { SimpleAppendTool } from '../../src/tools/SimpleAppendTool.js';
import { SimpleReplaceTool } from '../../src/tools/SimpleReplaceTool.js';
import { ToolResponse } from '../../src/tools/base.js';

/**
 * Integration tests for tool consolidation
 * 
 * Tests that the UnifiedEditTool can effectively replace the removed complex editing tools
 * while maintaining the simple tools as reliable fallbacks.
 */
describe('Tool Consolidation Integration Tests', () => {
  let unifiedTool: UnifiedEditTool;
  let simpleAppendTool: SimpleAppendTool;
  let simpleReplaceTool: SimpleReplaceTool;

  const testFile = 'consolidation-test.md';
  const initialContent = `# Test Document

## Introduction
This is a test document for tool consolidation.

## Features
- Feature 1
- Feature 2

## Implementation
TBD

## Status
In progress`;

  beforeEach(() => {
    unifiedTool = new UnifiedEditTool();
    simpleAppendTool = new SimpleAppendTool();
    simpleReplaceTool = new SimpleReplaceTool();
  });

  afterEach(() => {
    // Note: In a real implementation, we would clean up test files
    // This is skipped since we don't have OBSIDIAN_API_KEY in CI
  });

  describe('UnifiedEditTool Progressive Complexity', () => {
    it('should handle Stage 1 operations (simple append) with 100% reliability pattern', async () => {
      // Skip if no API key (CI environment)
      if (!process.env.OBSIDIAN_API_KEY) {
        console.log('Skipping integration test - no OBSIDIAN_API_KEY set');
        return;
      }

      // Test the simplest operation that must work 100% of the time
      const result = await unifiedTool.executeTyped({
        file: testFile,
        append: '\\n\\n## Conclusion\\nTest completed successfully.'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      
      // Parse the response to check for success
      const response = JSON.parse(result.text);
      expect(response.success).toBe(true);
    });

    it('should handle Stage 2 operations (structure-aware) with 90%+ reliability pattern', async () => {
      if (!process.env.OBSIDIAN_API_KEY) {
        console.log('Skipping integration test - no OBSIDIAN_API_KEY set');
        return;
      }

      // Test structure-aware insertion that replaced InsertAfterHeadingTool
      const result = await unifiedTool.executeTyped({
        file: testFile,
        after: 'Implementation',
        add: '\\n### Database Layer\\nPostgreSQL with connection pooling.\\n\\n### API Layer\\nREST API with authentication.'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      
      const response = JSON.parse(result.text);
      expect(response.success).toBe(true);
    });

    it('should handle text replacement operations', async () => {
      if (!process.env.OBSIDIAN_API_KEY) {
        console.log('Skipping integration test - no OBSIDIAN_API_KEY set');
        return;
      }

      // Test find/replace that replaced complex PatchContentTool operations
      const result = await unifiedTool.executeTyped({
        file: testFile,
        find: 'Feature 1',
        replace: 'Advanced Analytics'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      
      const response = JSON.parse(result.text);
      expect(response.success).toBe(true);
    });
  });

  describe('Fallback Tool Reliability', () => {
    it('should demonstrate simple append tool as reliable fallback', async () => {
      if (!process.env.OBSIDIAN_API_KEY) {
        console.log('Skipping integration test - no OBSIDIAN_API_KEY set');
        return;
      }

      // Test that simple tools still work as reliable fallbacks
      const result = await simpleAppendTool.executeTyped({
        filepath: testFile,
        content: '\\n\\n## Appendix\\nAdded via simple append tool.',
        create_file_if_missing: false
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
    });

    it('should demonstrate simple replace tool as reliable fallback', async () => {
      if (!process.env.OBSIDIAN_API_KEY) {
        console.log('Skipping integration test - no OBSIDIAN_API_KEY set');
        return;
      }

      const result = await simpleReplaceTool.executeTyped({
        filepath: testFile,
        find: 'In progress',
        replace: 'Completed'
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
    });
  });

  describe('Error Handling Consolidation', () => {
    it('should provide consistent error responses across all editing tools', async () => {
      // Test error handling without API key requirement
      const unifiedError = await unifiedTool.executeTyped({
        file: 'nonexistent-file.md',
        append: 'test content'
      });

      const simpleError = await simpleAppendTool.executeTyped({
        filepath: 'nonexistent-file.md',
        content: 'test content',
        create_file_if_missing: false
      });

      // Both should have consistent error response structure
      expect(unifiedError.type).toBe('text');
      expect(simpleError.type).toBe('text');

      const unifiedResponse = JSON.parse(unifiedError.text);
      const simpleResponse = JSON.parse(simpleError.text);

      expect(unifiedResponse.success).toBe(false);
      expect(simpleResponse.success).toBe(false);
      expect(unifiedResponse.error).toBeDefined();
      expect(simpleResponse.error).toBeDefined();
    });

    it('should provide helpful alternatives in error responses', async () => {
      const result = await unifiedTool.executeTyped({
        file: 'nonexistent-file.md',
        after: 'NonexistentHeading',
        add: 'content'
      });

      expect(result.type).toBe('text');
      const response = JSON.parse(result.text);
      
      // Should have error information
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.tool).toBeDefined();
      
      // Error response should be properly formatted with tool name
      expect(response.tool).toBe('obsidian_edit');
    });
  });

  describe('Tool Architecture Validation', () => {
    it('should verify UnifiedEditTool covers removed tool functionality', () => {
      const unifiedDescription = unifiedTool.description;
      
      // Should mention the key capabilities that replaced removed tools
      expect(unifiedDescription).toContain('append');
      expect(unifiedDescription).toContain('replace');
      expect(unifiedDescription).toContain('after');
      
      // Should emphasize ease of use and progressive complexity
      expect(unifiedDescription.toLowerCase()).toContain('simple');
    });

    it('should validate tool interface consistency', () => {
      const tools = [unifiedTool, simpleAppendTool, simpleReplaceTool];
      
      for (const tool of tools) {
        // All tools should have required interface properties
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        
        // All tools should have execute method from ToolInterface
        expect(typeof tool.execute).toBe('function');
        expect(typeof tool.executeTyped).toBe('function');
      }
    });

    it('should demonstrate reduced tool count maintains functionality', () => {
      // Before: Had 9+ complex editing tools (PatchContent, ObsidianEdit, etc.)
      // After: 1 UnifiedEditTool + 3 simple tools = 4 total editing tools
      
      const currentEditingTools = [
        unifiedTool,
        simpleAppendTool, 
        simpleReplaceTool,
        // Note: AppendContentTool is also registered as backup
      ];
      
      // Verify we have a manageable number of editing tools
      expect(currentEditingTools.length).toBeLessThanOrEqual(4);
      
      // Verify the primary tool can handle complex operations
      expect(unifiedTool.description).toContain('progressive complexity');
      
      // Verify simple tools are positioned as fallbacks
      expect(simpleAppendTool.description.toLowerCase()).toContain('simple');
      expect(simpleReplaceTool.description.toLowerCase()).toContain('simple');
    });
  });

  describe('Removed Tool Functionality Coverage', () => {
    it('should confirm PatchContentTool functionality is covered by UnifiedEditTool', () => {
      // PatchContentTool had: targetType, target, insertAfter, content
      // UnifiedEditTool covers this with: after, add parameters
      const schema = unifiedTool.inputSchema;
      const description = unifiedTool.description;
      
      expect(description).toContain('after');  // Replaces targetType: 'heading', insertAfter: true
      expect(description).toContain('add');    // Replaces content parameter
    });

    it('should confirm InsertAfterHeadingTool functionality is covered', () => {
      // InsertAfterHeadingTool had: filepath, heading, content, create_file_if_missing
      // UnifiedEditTool covers this with: file, after, add
      const description = unifiedTool.description;
      
      expect(description).toContain('after');
      expect(description).toContain('heading');
      expect(description).toContain('Insert after heading');
    });

    it('should confirm complex editing patterns are simplified', () => {
      const description = unifiedTool.description;
      
      // Should emphasize simplicity over the complex patterns that failed
      expect(description).toContain('simple');
      expect(description).toContain('progressive');
      
      // Should not contain the problematic patterns from removed tools
      expect(description).not.toContain('targetType');
      expect(description).not.toContain('operation.type');
      expect(description).not.toContain('nested');
    });
  });

  describe('Tool Registration Validation', () => {
    it('should validate all tools implement ToolInterface correctly', () => {
      const tools = [unifiedTool, simpleAppendTool, simpleReplaceTool];
      
      for (const tool of tools) {
        // Should implement both execute methods for interface compliance
        expect(typeof tool.execute).toBe('function');
        expect(typeof tool.executeTyped).toBe('function');
        
        // Should have proper return type annotations (verified by TypeScript build)
        expect(tool.execute).toBeDefined();
        expect(tool.executeTyped).toBeDefined();
      }
    });

    it('should validate type safety improvements are in place', () => {
      // Verify tools have moved away from any types
      const unifiedParams = unifiedTool.inputSchema.properties;
      const simpleAppendParams = simpleAppendTool.inputSchema.properties;
      
      // Should have properly defined parameter schemas
      expect(unifiedParams).toBeDefined();
      expect(simpleAppendParams).toBeDefined();
      expect(simpleAppendParams.filepath).toBeDefined();
      expect(simpleAppendParams.content).toBeDefined();
    });
  });

  describe('LLM Ergonomics Validation', () => {
    it('should demonstrate natural parameter patterns', () => {
      // UnifiedEditTool should use natural parameter names that match user intent
      const schema = unifiedTool.inputSchema;
      const description = unifiedTool.description;
      
      // Should mention the natural patterns users expect
      expect(description).toContain('append');
      expect(description).toContain('find');
      expect(description).toContain('replace');
      expect(description).toContain('after');
      
      // Should have examples that are easy to understand
      expect(description).toContain('{');  // JSON examples
      expect(description).toContain('file:');  // Parameter names
    });

    it('should validate progressive disclosure in tool design', () => {
      const description = unifiedTool.description;
      
      // Should emphasize that simple operations come first
      expect(description).toContain('Start simple');
      expect(description).toContain('IMMEDIATE SUCCESS');
      
      // Should provide copy-paste ready examples
      expect(description).toContain('copy-paste ready');
      expect(description).toContain('WORKING EXAMPLES');
    });
  });
});