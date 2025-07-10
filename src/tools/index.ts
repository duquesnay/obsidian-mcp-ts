import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ListFilesInVaultTool } from './ListFilesInVaultTool.js';
import { ListFilesInDirTool } from './ListFilesInDirTool.js';
import { GetFileContentsTool } from './GetFileContentsTool.js';
import { BatchGetFileContentsTool } from './BatchGetFileContentsTool.js';
import { SimpleSearchTool } from './SimpleSearchTool.js';
import { ComplexSearchTool } from './ComplexSearchTool.js';
import { AppendContentTool } from './AppendContentTool.js';
import { DeleteFileTool } from './DeleteFileTool.js';
import { RenameFileTool } from './RenameFileTool.js';
import { MoveFileTool } from './MoveFileTool.js';
import { MoveDirectoryTool } from './MoveDirectoryTool.js';
import { CopyFileTool } from './CopyFileTool.js';
import { CopyDirectoryTool } from './CopyDirectoryTool.js';
import { CheckPathExistsTool } from './CheckPathExistsTool.js';
import { CreateDirectoryTool } from './CreateDirectoryTool.js';
import { DeleteDirectoryTool } from './DeleteDirectoryTool.js';
import { GetAllTagsTool } from './GetAllTagsTool.js';
import { GetFilesByTagTool } from './GetFilesByTagTool.js';
import { RenameTagTool } from './RenameTagTool.js';
import { ManageFileTagsTool } from './ManageFileTagsTool.js';
import { GetPeriodicNoteTool } from './GetPeriodicNoteTool.js';
import { GetRecentPeriodicNotesTool } from './GetRecentPeriodicNotesTool.js';
import { GetRecentChangesTool } from './GetRecentChangesTool.js';
import { AdvancedSearchTool } from './AdvancedSearchTool.js';
import { GetFileMetadataTool } from './GetFileMetadataTool.js';
import { GetFileFrontmatterTool } from './GetFileFrontmatterTool.js';
import { GetFileFormattedTool } from './GetFileFormattedTool.js';
import { FindEmptyDirectoriesTool } from './FindEmptyDirectoriesTool.js';
import { QueryStructureTool } from './QueryStructureTool.js';
import { SimpleAppendTool } from './SimpleAppendTool.js';
import { SimpleReplaceTool } from './SimpleReplaceTool.js';
import { UnifiedEditTool } from './UnifiedEditTool.js';
import { BaseTool } from './base.js';

const tools: BaseTool[] = [
  // File operations
  new ListFilesInVaultTool(),
  new ListFilesInDirTool(),
  new GetFileContentsTool(),
  new BatchGetFileContentsTool(),
  new DeleteFileTool(),
  new RenameFileTool(),
  new MoveFileTool(),
  new MoveDirectoryTool(),
  new CopyFileTool(),
  new CopyDirectoryTool(),
  new CheckPathExistsTool(),
  new CreateDirectoryTool(),
  new DeleteDirectoryTool(),
  new GetFileMetadataTool(),
  new GetFileFrontmatterTool(),
  new GetFileFormattedTool(),
  new FindEmptyDirectoriesTool(),
  
  // Search
  new SimpleSearchTool(),
  new ComplexSearchTool(),
  new AdvancedSearchTool(),
  new QueryStructureTool(),
  
  // Tag management
  new GetAllTagsTool(),
  new GetFilesByTagTool(),
  new RenameTagTool(),
  new ManageFileTagsTool(),
  
  // Periodic notes
  new GetPeriodicNoteTool(),
  new GetRecentPeriodicNotesTool(),
  new GetRecentChangesTool(),
  
  // Editing - only UnifiedEditTool and simple reliable backups after user testing
  new UnifiedEditTool(),       // Primary editing tool (tested successfully)
  new SimpleAppendTool(),      // 100% success rate backup
  new SimpleReplaceTool(),     // 100% success rate backup  
  new AppendContentTool()      // Additional append backup
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