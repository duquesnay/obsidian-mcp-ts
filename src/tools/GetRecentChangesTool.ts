import { BaseTool } from './base.js';

export class GetRecentChangesTool extends BaseTool {
  name = 'obsidian_get_recent_changes';
  description = 'Get recently modified files in the vault.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directory: {
        type: 'string',
        description: 'Specific directory to check for recent changes (optional).'
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of files to return.',
        default: 10
      },
      offset: {
        type: 'integer',
        description: 'Number of files to skip.',
        default: 0
      },
      contentLength: {
        type: 'integer',
        description: 'Number of characters of content to include for each file.',
        default: 100
      }
    },
    required: []
  };

  async executeTyped(args: {
    directory?: string;
    limit?: number;
    offset?: number;
    contentLength?: number;
  }): Promise<any> {
    try {
      const client = this.getClient();
      const result = await client.getRecentChanges(
        args.directory,
        args.limit,
        args.offset,
        args.contentLength
      );
      
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}