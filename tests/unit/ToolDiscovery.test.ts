import { describe, it, expect } from 'vitest';
import { discoverTools } from '../../src/tools/discovery.js';
import { BaseTool } from '../../src/tools/base.js';

describe('Tool Discovery', () => {
  it('should discover all tool classes', async () => {
    const tools = await discoverTools();
    
    expect(tools).toBeDefined();
    expect(tools.length).toBeGreaterThan(0);
    
    // All discovered items should be tool instances
    tools.forEach(tool => {
      expect(tool).toBeInstanceOf(BaseTool);
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    });
  });

  it('should not include base classes', async () => {
    const tools = await discoverTools();
    
    // Should not include BaseTool itself
    const baseToolNames = tools.map(t => t.constructor.name);
    expect(baseToolNames).not.toContain('BaseTool');
  });

  it('should discover tools in alphabetical order', async () => {
    const tools = await discoverTools();
    const toolNames = tools.map(t => t.name);
    
    const sortedNames = [...toolNames].sort();
    expect(toolNames).toEqual(sortedNames);
  });

  it('should only include files ending with Tool.ts', async () => {
    const tools = await discoverTools();
    
    // All tool constructors should end with "Tool"
    tools.forEach(tool => {
      expect(tool.constructor.name).toMatch(/Tool$/);
    });
  });
});