import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { discoverTools, getToolMetadata } from './discovery.js';
import { AnyTool } from './base.js';
import { isTestEnvironment } from '../utils/environment.js';

// Tools will be loaded dynamically
let tools: AnyTool[] = [];

export async function registerTools(server: Server): Promise<void> {
  // Discover all available tools
  tools = await discoverTools();
  
  if (!isTestEnvironment()) {
    console.error(`Discovered ${tools.length} tools`);
  }
  
  // Validate that we have at least some tools
  if (tools.length === 0) {
    console.error('WARNING: No tools were discovered!');
  }
  
  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(getToolMetadata),
    };
  });

  // Register call_tool handler with enhanced type checking
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    // Type validation for tool name
    if (typeof name !== 'string' || name.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Tool name must be a non-empty string'
      );
    }
    
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    }

    try {
      // Ensure args is an object
      const toolArgs = args && typeof args === 'object' ? args : {};
      
      const result = await tool.execute(toolArgs);
      
      // Validate result structure
      if (!result || typeof result !== 'object' || !('type' in result) || !('text' in result)) {
        throw new Error('Tool returned invalid response format');
      }
      
      return {
        content: Array.isArray(result) ? result : [result],
      };
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      
      // Convert to MCP error for better client handling
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}