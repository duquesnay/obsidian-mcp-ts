import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class PatchContentTool extends BaseTool {
  name = 'obsidian_patch_content';
  description = 'Insert content into an existing note relative to a heading, block reference, or frontmatter field.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to existing file to patch (relative to vault root).'
      },
      content: {
        type: 'string',
        description: 'The new content to insert.'
      },
      heading: {
        type: 'string',
        description: 'Optional: The heading relative to which the content will be inserted.'
      },
      insertAfter: {
        type: 'boolean',
        description: 'Optional: Insert after the specified heading. Only valid with `heading`.',
        default: true
      },
      insertBefore: {
        type: 'boolean',
        description: 'Optional: Insert before the specified heading. Only valid with `heading`.',
        default: false
      },
      createIfNotExists: {
        type: 'boolean',
        description: 'Optional: Create file if it does not exist.',
        default: false
      },
      blockRef: {
        type: 'string',
        description: 'Optional: The block reference (^blockid) relative to which the content will be inserted.'
      }
    },
    required: ['filepath', 'content']
  };

  async execute(args: {
    filepath: string;
    content: string;
    heading?: string;
    insertAfter?: boolean;
    insertBefore?: boolean;
    createIfNotExists?: boolean;
    blockRef?: string;
  }): Promise<any> {
    try {
      if (!args.filepath) {
        throw new Error('filepath argument missing in arguments');
      }
      if (!args.content) {
        throw new Error('content argument missing in arguments');
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const result = await client.patchContent(args.filepath, args.content, {
        heading: args.heading,
        insertAfter: args.insertAfter,
        insertBefore: args.insertBefore,
        createIfNotExists: args.createIfNotExists,
        blockRef: args.blockRef
      });
      
      return this.formatResponse({ success: true, message: 'Content patched successfully' });
    } catch (error) {
      return this.handleError(error);
    }
  }
}