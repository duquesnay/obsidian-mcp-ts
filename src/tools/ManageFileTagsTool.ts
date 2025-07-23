import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';

export class ManageFileTagsTool extends BaseTool {
  name = 'obsidian_manage_file_tags';
  description = 'Add or remove tags from a specific file. Can modify both inline tags and frontmatter tags.';
  
  metadata: ToolMetadata = {
    category: 'tags',
    keywords: ['tags', 'manage', 'add', 'remove', 'file', 'frontmatter'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to modify (relative to vault root).'
      },
      operation: {
        type: 'string',
        enum: ['add', 'remove'],
        description: 'Whether to add or remove tags.'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
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

  async executeTyped(args: { 
    filePath: string; 
    operation: 'add' | 'remove'; 
    tags: string[];
    location?: 'frontmatter' | 'inline' | 'both'
  }): Promise<ToolResponse> {
    try {
      if (!args.filePath) {
        throw new Error('filePath argument missing in arguments');
      }
      if (!args.operation) {
        throw new Error('operation argument missing in arguments');
      }
      if (!args.tags || !Array.isArray(args.tags) || args.tags.length === 0) {
        throw new Error('tags argument must be a non-empty array');
      }
      
      // Validate the file path
      PathValidationUtil.validate(args.filePath, 'filePath', { type: PathValidationType.FILE });
      
      // Normalize tags (remove # if present)
      const normalizedTags = args.tags.map(tag => 
        tag.startsWith('#') ? tag.substring(1) : tag
      );
      
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