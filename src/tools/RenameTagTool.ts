import { BaseTool, ToolMetadata } from './base.js';

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
      oldTagName: {
        type: 'string',
        description: 'The current tag name to rename (with or without # prefix).'
      },
      newTagName: {
        type: 'string',
        description: 'The new tag name (with or without # prefix).'
      }
    },
    required: ['oldTagName', 'newTagName']
  };

  async executeTyped(args: { oldTagName: string; newTagName: string }): Promise<any> {
    try {
      if (!args.oldTagName) {
        throw new Error('oldTagName argument missing in arguments');
      }
      if (!args.newTagName) {
        throw new Error('newTagName argument missing in arguments');
      }
      
      // Normalize tag names (remove # if present)
      const oldTag = args.oldTagName.startsWith('#') ? args.oldTagName.substring(1) : args.oldTagName;
      const newTag = args.newTagName.startsWith('#') ? args.newTagName.substring(1) : args.newTagName;
      
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