import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { validateRequiredArgs, TAG_SCHEMA, normalizeTagName } from '../utils/validation.js';

export class RenameTagTool extends BaseTool {
  name = 'obsidian_rename_tag';
  description = 'Rename a tag across the entire vault. Updates both inline tags (#tag) and frontmatter tags.';
  
  metadata: ToolMetadata = {
    category: 'tags',
    keywords: ['tags', 'rename', 'refactor', 'vault', 'global'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      oldTagName: TAG_SCHEMA,
      newTagName: TAG_SCHEMA
    },
    required: ['oldTagName', 'newTagName']
  };

  async executeTyped(args: { oldTagName: string; newTagName: string }): Promise<ToolResponse> {
    try {
      // Validate required arguments
      validateRequiredArgs(args, ['oldTagName', 'newTagName']);
      
      // Normalize tag names (remove # if present)
      const oldTag = normalizeTagName(args.oldTagName);
      const newTag = normalizeTagName(args.newTagName);
      
      const client = this.getClient();
      const result = await client.renameTag(oldTag, newTag);
      
      return this.formatResponse({
        success: true,
        oldTag: oldTag,
        newTag: newTag,
        filesUpdated: result.filesUpdated || 0,
        message: result.message || `Renamed tag #${oldTag} to #${newTag} in ${result.filesUpdated || 0} files`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}