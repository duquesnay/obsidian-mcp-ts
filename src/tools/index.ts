import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Core 8 tools - prioritized for reliability and LLM ergonomics
import { ListFilesInVaultTool } from './ListFilesInVaultTool.js';
import { GetFileContentsTool } from './GetFileContentsTool.js';
import { SimpleSearchTool } from './SimpleSearchTool.js';
import { SimpleAppendTool } from './SimpleAppendTool.js';
import { SimpleReplaceTool } from './SimpleReplaceTool.js';
import { InsertAfterHeadingTool } from './InsertAfterHeadingTool.js';
import { AppendContentTool } from './AppendContentTool.js';
import { DeleteFileTool } from './DeleteFileTool.js';
import { BaseTool } from './base.js';

// Core 8 tools optimized for LLM ergonomics and reliability
const tools: BaseTool[] = [
  // File operations - essential and reliable
  new ListFilesInVaultTool(),
  new GetFileContentsTool(),
  new DeleteFileTool(),
  
  // Search - simple and effective
  new SimpleSearchTool(),
  
  // Editing - proven reliable tools from user feedback
  new SimpleAppendTool(),      // 100% success rate in testing
  new SimpleReplaceTool(),     // 100% success rate in testing  
  new AppendContentTool(),     // Backup append tool
  new InsertAfterHeadingTool() // Structure-aware editing (recently improved)
];

export async function registerTools(server: Server): Promise<void> {
  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
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