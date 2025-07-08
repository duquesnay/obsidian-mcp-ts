import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

export class PatchContentTool extends BaseTool {
  name = 'obsidian_patch_content';
  description = '[DEPRECATED - Use obsidian_patch_content_v2 with obsidian_query_structure for better LLM ergonomics] Insert or replace content in a note. Supports find/replace operations, inserting at headings/blocks, and frontmatter updates. Note: All operations require specifying a target (heading, block, or frontmatter field). Examples: Replace text in heading: use targetType="heading", target="Heading Name", oldText/newText. Insert at heading: use targetType="heading", target="Heading Name", content. Update frontmatter: use targetType="frontmatter", target="fieldname".';
  
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
        enum: ['heading', 'block', 'frontmatter'],
        description: 'Required: Type of target - "heading" for heading operations, "block" for block references, "frontmatter" for frontmatter updates.'
      },
      target: {
        type: 'string',
        description: 'Required: The target to operate on (heading name, block ID, or frontmatter field name)'
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
    required: ['filepath', 'targetType', 'target']
  };

  async execute(args: {
    filepath: string;
    content?: string;
    oldText?: string;
    newText?: string;
    targetType: 'heading' | 'block' | 'frontmatter';
    target: string;
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
      
      if (!args.targetType) {
        throw new Error('targetType argument missing - must be one of: heading, block, frontmatter');
      }
      
      if (!args.target) {
        throw new Error('target argument missing - specify the heading name, block ID, or frontmatter field');
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
          targetType: args.targetType,
          target: args.target
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