import { BaseTool } from './base.js';

export class GetFilesByTagTool extends BaseTool {
  name = 'obsidian_get_files_by_tag';
  description = 'Get all files that contain a specific tag. Searches both inline tags (#tag) and frontmatter tags.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      tagName: {
        type: 'string',
        description: 'The tag name to search for (with or without # prefix).'
      }
    },
    required: ['tagName']
  };

  async executeTyped(args: { tagName: string }): Promise<any> {
    try {
      if (!args.tagName) {
        throw new Error('tagName argument missing in arguments');
      }
      
      // Normalize tag name (remove # if present)
      const tagName = args.tagName.startsWith('#') ? args.tagName.substring(1) : args.tagName;
      
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