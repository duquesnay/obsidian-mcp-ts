import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class PatchContentTool extends BaseTool {
  name = 'obsidian_patch_content';
  description = 'Insert or replace content in a note. Supports find/replace operations, inserting at headings/blocks, and frontmatter updates. Examples: Replace text: use oldText/newText. Insert at heading: use heading + content. Update frontmatter: use targetType="frontmatter".';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to existing file to patch (relative to vault root).'
      },
      content: {
        type: 'string',
        description: 'The new content to insert (not needed when using oldText/newText for find/replace).'
      },
      oldText: {
        type: 'string',
        description: 'Optional: Text to find and replace. Must be used with newText.'
      },
      newText: {
        type: 'string',
        description: 'Optional: Text to replace oldText with. Must be used with oldText.'
      },
      targetType: {
        type: 'string',
        enum: ['text', 'heading', 'block', 'frontmatter'],
        description: 'Optional: Type of operation - "text" for find/replace, "heading" for heading operations, "block" for block references, "frontmatter" for frontmatter updates.'
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
    required: ['filepath']
  };

  async execute(args: {
    filepath: string;
    content?: string;
    oldText?: string;
    newText?: string;
    targetType?: 'text' | 'heading' | 'block' | 'frontmatter';
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
      
      // Validate based on operation mode
      if (args.oldText !== undefined || args.newText !== undefined) {
        if (args.oldText === undefined || args.newText === undefined) {
          throw new Error('Both oldText and newText must be provided for find/replace operations');
        }
        // For find/replace, content is in newText
      } else if (!args.content) {
        throw new Error('content argument missing in arguments (unless using oldText/newText)');
      }
      
      // Validate the filepath
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const result = await client.patchContent(
        args.filepath, 
        args.content || '', // Empty string when using oldText/newText
        {
          heading: args.heading,
          insertAfter: args.insertAfter,
          insertBefore: args.insertBefore,
          createIfNotExists: args.createIfNotExists,
          blockRef: args.blockRef,
          oldText: args.oldText,
          newText: args.newText,
          targetType: args.targetType
        }
      );
      
      const message = args.oldText !== undefined 
        ? 'Content replaced successfully' 
        : 'Content patched successfully';
      
      return this.formatResponse({ success: true, message });
    } catch (error) {
      return this.handleError(error);
    }
  }
}