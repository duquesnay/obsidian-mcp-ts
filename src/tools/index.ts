import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { discoverTools, getToolMetadata } from './discovery.js';
import { AnyTool } from './base.js';

// Tools will be loaded dynamically
let tools: AnyTool[] = [];

export async function registerTools(server: Server): Promise<void> {
  // Discover all available tools
  tools = await discoverTools();
  console.error(`Discovered ${tools.length} tools`);
  
  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(getToolMetadata),
    };
  });

  // Register call_tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.execute(args || {});
      return {
        content: Array.isArray(result) ? result : [result],
      };
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  });
}