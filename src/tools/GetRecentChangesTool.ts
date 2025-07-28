import { GetRecentChangesArgs } from './types/GetRecentChangesArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA } from '../utils/validation.js';

export class GetRecentChangesTool extends BaseTool<GetRecentChangesArgs> {
  name = 'obsidian_get_recent_changes';
  description = 'Get recently modified files in the vault. For better performance, consider using the vault://recent resource which provides cached results (30 seconds cache).';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['recent', 'changes', 'modified', 'files', 'history'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directory: {
        type: 'string',
        description: 'Specific directory to check for recent changes (optional).'
      },
      limit: {
        ...PAGINATION_SCHEMA.limit,
        default: OBSIDIAN_DEFAULTS.PAGE_SIZE
      },
      offset: PAGINATION_SCHEMA.offset,
      contentLength: {
        type: 'integer',
        description: 'Number of characters of content to include for each file.',
        default: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
      }
    },
    required: []
  };

  async executeTyped(args: GetRecentChangesArgs): Promise<ToolResponse> {
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