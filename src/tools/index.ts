import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ListFilesInVaultTool } from './ListFilesInVaultTool.js';
import { ListFilesInDirTool } from './ListFilesInDirTool.js';
import { GetFileContentsTool } from './GetFileContentsTool.js';
import { BatchGetFileContentsTool } from './BatchGetFileContentsTool.js';
import { SimpleSearchTool } from './SimpleSearchTool.js';
import { ComplexSearchTool } from './ComplexSearchTool.js';
import { PatchContentTool } from './PatchContentTool.js';
import { AppendContentTool } from './AppendContentTool.js';
import { DeleteFileTool } from './DeleteFileTool.js';
import { RenameFileTool } from './RenameFileTool.js';
import { MoveFileTool } from './MoveFileTool.js';
import { MoveDirectoryTool } from './MoveDirectoryTool.js';
import { CopyFileTool } from './CopyFileTool.js';
import { CheckPathExistsTool } from './CheckPathExistsTool.js';
import { CreateDirectoryTool } from './CreateDirectoryTool.js';
import { GetPeriodicNoteTool } from './GetPeriodicNoteTool.js';
import { GetRecentPeriodicNotesTool } from './GetRecentPeriodicNotesTool.js';
import { GetRecentChangesTool } from './GetRecentChangesTool.js';
import { BaseTool } from './base.js';

const tools: BaseTool[] = [
  new ListFilesInVaultTool(),
  new ListFilesInDirTool(),
  new GetFileContentsTool(),
  new BatchGetFileContentsTool(),
  new SimpleSearchTool(),
  new ComplexSearchTool(),
  new PatchContentTool(),
  new AppendContentTool(),
  new DeleteFileTool(),
  new RenameFileTool(),
  new MoveFileTool(),
  new MoveDirectoryTool(),
  new CopyFileTool(),
  new CheckPathExistsTool(),
  new CreateDirectoryTool(),
  new GetPeriodicNoteTool(),
  new GetRecentPeriodicNotesTool(),
  new GetRecentChangesTool(),
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