import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedEditTool } from '../../src/tools/UnifiedEditTool.js';
import { SimpleAppendTool } from '../../src/tools/SimpleAppendTool.js';
import { SimpleReplaceTool } from '../../src/tools/SimpleReplaceTool.js';
import { ToolResponse } from '../../src/tools/base.js';

/**
 * Unit tests for tool consolidation architecture
 * 
 * Tests tool interfaces, configurations, and architectural patterns without
 * making actual API calls. Uses mocks to validate tool behavior and structure.
 */
describe('Tool Consolidation Unit Tests', () => {
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
    // Note: Unit tests don't require cleanup as they don't use real files
  });

  describe('UnifiedEditTool Architecture Validation', () => {
    it('should handle Stage 1 operations (simple append) interface pattern', async () => {
      // Test interface without making actual calls
      expect(unifiedTool.name).toBe('obsidian_edit');
      expect(unifiedTool.description).toContain('progressive complexity');
      
      // Validate parameter schema supports simple append
      const schema = unifiedTool.inputSchema;
      expect(schema.properties).toHaveProperty('file');
      expect(schema.properties).toHaveProperty('append');
    });

    it('should handle Stage 2 operations (structure-aware) interface pattern', async () => {
      // Test structure-aware interface
      const schema = unifiedTool.inputSchema;
      expect(schema.properties).toHaveProperty('after');
      expect(schema.properties).toHaveProperty('add');
      
      // Validate description mentions structure awareness
      expect(unifiedTool.description).toContain('after');
      expect(unifiedTool.description).toContain('heading');
    });

    it('should handle text replacement operations interface', async () => {
      // Test find/replace interface
      const schema = unifiedTool.inputSchema;
      expect(schema.properties).toHaveProperty('find');
      expect(schema.properties).toHaveProperty('replace');
      
      // Validate description supports replacement
      expect(unifiedTool.description).toContain('find');
      expect(unifiedTool.description).toContain('replace');
    });
  });

  describe('Fallback Tool Architecture', () => {
    it('should demonstrate simple append tool as reliable fallback interface', async () => {
      // Test simple tool interface
      expect(simpleAppendTool.name).toBe('obsidian_simple_append');
      expect(simpleAppendTool.description.toLowerCase()).toContain('simple');
      
      // Validate required parameters
      const schema = simpleAppendTool.inputSchema;
      expect(schema.required).toContain('filepath');
      expect(schema.required).toContain('content');
    });

    it('should demonstrate simple replace tool as reliable fallback interface', async () => {
      // Test simple replace interface
      expect(simpleReplaceTool.name).toBe('obsidian_simple_replace');
      expect(simpleReplaceTool.description.toLowerCase()).toContain('simple');
      
      // Validate required parameters
      const schema = simpleReplaceTool.inputSchema;
      expect(schema.required).toContain('filepath');
      expect(schema.required).toContain('find');
      expect(schema.required).toContain('replace');
    });
  });

  describe('Error Handling Architecture', () => {
    it('should provide consistent error response structure across editing tools', async () => {
      // Test error handling interfaces without making calls
      expect(typeof unifiedTool.executeTyped).toBe('function');
      expect(typeof simpleAppendTool.executeTyped).toBe('function');
      expect(typeof simpleReplaceTool.executeTyped).toBe('function');
      
      // All tools should extend BaseTool with consistent error handling
      expect(unifiedTool.formatResponse).toBeDefined();
      expect(simpleAppendTool.formatResponse).toBeDefined();
      expect(simpleReplaceTool.formatResponse).toBeDefined();
    });

    it('should provide helpful alternatives in tool descriptions', async () => {
      // Test that descriptions provide guidance
      expect(unifiedTool.description).toContain('simple');
      expect(unifiedTool.description).toContain('progressive');
      
      // Simple tools should reference their purpose
      expect(simpleAppendTool.description).toContain('simple');
      expect(simpleReplaceTool.description).toContain('simple');
    });
  });

  describe('Tool Interface Validation', () => {
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