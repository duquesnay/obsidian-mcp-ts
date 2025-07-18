import { BaseTool, ToolMetadata, ToolResponse } from './base.js';

export class GetAllTagsTool extends BaseTool {
  name = 'obsidian_get_all_tags';
  description = 'List all unique tags in the vault with their usage counts. Includes both inline tags (#tag) and frontmatter tags.';
  
  metadata: ToolMetadata = {
    category: 'tags',
    keywords: ['tags', 'list', 'categories', 'labels', 'taxonomy'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {},
    required: []
  };

  async executeTyped(args: Record<string, never>): Promise<ToolResponse> {
    try {
      const client = this.getClient();
      const tags = await client.getAllTags();
      
      return this.formatResponse({
        totalTags: tags.length,
        tags: tags,
        message: `Found ${tags.length} unique tags in the vault`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}