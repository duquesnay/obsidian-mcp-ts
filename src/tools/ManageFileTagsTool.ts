import { ManageFileTagsArgs } from './types/ManageFileTagsArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { validateRequiredArgs, FILE_PATH_SCHEMA, TAGS_ARRAY_SCHEMA, normalizeTagName } from '../utils/validation.js';

export class ManageFileTagsTool extends BaseTool<ManageFileTagsArgs> {
  name = 'obsidian_manage_file_tags';
  description = 'Add or remove tags from vault note. Supports batch operations (multiple tags in one API call - 10x-100x faster). Can modify frontmatter tags, inline tags, or both.';

  metadata: ToolMetadata = {
    category: 'tags',
    keywords: ['tags', 'manage', 'add', 'remove', 'file', 'frontmatter', 'batch'],
    version: '2.0.0'  // Bumped version for batch API support
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filePath: FILE_PATH_SCHEMA,
      operation: {
        type: 'string',
        enum: ['add', 'remove'],
        description: 'Whether to add or remove tags.'
      },
      tags: {
        ...TAGS_ARRAY_SCHEMA,
        description: 'Array of tags to add or remove (with or without # prefix).'
      },
      location: {
        type: 'string',
        enum: ['frontmatter', 'inline', 'both'],
        description: 'Where to add/remove tags (default: frontmatter).',
        default: 'frontmatter'
      }
    },
    required: ['filePath', 'operation', 'tags']
  };

  async executeTyped(args: ManageFileTagsArgs): Promise<ToolResponse> {
    try {
      // Validate required arguments with tags as non-empty array
      validateRequiredArgs(args, ['filePath', 'operation', 'tags'], {
        tags: { notEmpty: true }
      });
      
      // Validate the file path
      PathValidationUtil.validate(args.filePath, 'filePath', { type: PathValidationType.FILE });
      
      // Normalize tags (remove # if present)
      const normalizedTags = args.tags.map(normalizeTagName);
      
      const client = this.getClient();
      const result = await client.manageFileTags(
        args.filePath, 
        args.operation, 
        normalizedTags,
        args.location || 'frontmatter'
      );
      
      return this.formatResponse({
        success: true,
        filePath: args.filePath,
        operation: args.operation,
        tags: normalizedTags,
        location: args.location || 'frontmatter',
        tagsModified: result.tagsModified || normalizedTags.length,
        message: result.message || `${args.operation === 'add' ? 'Added' : 'Removed'} ${normalizedTags.length} tags ${args.operation === 'add' ? 'to' : 'from'} ${args.filePath}`
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}