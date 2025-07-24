import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { validateRequiredArgs, TAG_SCHEMA, normalizeTagName } from '../utils/validation.js';
import { GetFilesByTagArgs } from './types/GetFilesByTagArgs.js';

export class GetFilesByTagTool extends BaseTool<GetFilesByTagArgs> {
  name = 'obsidian_get_files_by_tag';
  description = 'Get all files that contain a specific tag. Searches both inline tags (#tag) and frontmatter tags.';

  metadata: ToolMetadata = {
    category: 'tags',
    keywords: ['tags', 'find', 'files', 'search', 'filter'],
    version: '1.0.0'
  };

  inputSchema = {
    type: 'object' as const,
    properties: {
      tagName: TAG_SCHEMA
    },
    required: ['tagName']
  };

  async executeTyped(args: GetFilesByTagArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['tagName']);

      // Normalize tag name (remove # if present)
      const tagName = normalizeTagName(args.tagName);

      const client = this.getClient();
      const files = await client.getFilesByTag(tagName);

      return this.formatResponse({
        tag: tagName,
        fileCount: files.length,
        files: files,
        message: `Found ${files.length} files with tag #${tagName}`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}
