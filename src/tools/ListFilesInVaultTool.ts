import { BaseTool } from './base.js';

export class ListFilesInVaultTool extends BaseTool {
  name = 'obsidian_list_files_in_vault';
  description = 'Lists all files and directories in the root directory of your Obsidian vault.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {},
    required: []
  };

  async execute(args: any): Promise<any> {
    try {
      const client = this.getClient();
      const files = await client.listFilesInVault();
      return this.formatResponse(files);
    } catch (error) {
      return this.handleError(error);
    }
  }
}