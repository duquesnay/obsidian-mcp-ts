import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

// Simple operation types for common tasks
type SimpleOperation = 
  | { append: string }
  | { prepend: string }
  | { replace: { find: string; with: string } }
  | { insertAfterHeading: { heading: string; content: string } }
  | { insertBeforeHeading: { heading: string; content: string } }
  | { updateFrontmatter: { [key: string]: any } };

// Advanced operation types (current V2 style)
interface AdvancedOperation {
  type: 'replace' | 'insert' | 'update_frontmatter';
  replace?: {
    pattern: string;
    replacement: string;
    options?: {
      case_sensitive?: boolean;
      whole_word?: boolean;
      regex?: boolean;
      max_replacements?: number;
      scope?: {
        type: 'document' | 'section';
        section_path?: string[];
      };
    };
  };
  insert?: {
    content: string;
    location: {
      type: 'heading' | 'block' | 'pattern' | 'document';
      heading?: {
        path: string[];
        level?: number;
        occurrence?: number;
        create_if_missing?: boolean;
      };
      block?: {
        id: string;
        create_if_missing?: boolean;
      };
      pattern?: {
        text: string;
        regex?: boolean;
        occurrence?: number;
      };
      document?: {
        position: 'start' | 'end' | 'after_frontmatter';
      };
      position: 'before' | 'after' | 'replace';
    };
  };
  update_frontmatter?: {
    changes: {
      set?: Record<string, any>;
      append?: Record<string, any[]>;
      remove?: string[];
      merge?: Record<string, any>;
    };
    create_if_missing?: boolean;
  };
}

interface PatchContentArgs {
  filepath: string;
  // Allow both simple and advanced operations
  operation?: SimpleOperation | AdvancedOperation;
  // Simple operation shortcuts
  append?: string;
  prepend?: string;
  replace?: { find: string; with: string };
  insertAfterHeading?: { heading: string; content: string };
  insertBeforeHeading?: { heading: string; content: string };
  updateFrontmatter?: Record<string, any>;
  // Legacy simple fields for backwards compatibility
  content?: string;
  target?: string;
  // Options
  options?: {
    create_file_if_missing?: boolean;
    backup?: boolean;
    dry_run?: boolean;
  };
}

interface PatchContentResult {
  success: boolean;
  message?: string;
  changes?: {
    type: string;
    count?: number;
    location?: {
      line: number;
      column?: number;
    };
    preview?: string;
  };
  error?: {
    code: string;
    message: string;
    suggestions?: Array<{
      path?: string[];
      line?: number;
      preview?: string;
    }>;
    example?: any;
    hint?: string;
  };
}

export class PatchContentToolV2 extends BaseTool {
  name = 'obsidian_patch_content_v2';
  description = `Enhanced content modification with simple shortcuts and advanced options. 

Common operations:
- Append text: { append: "text" }
- Prepend text: { prepend: "text" }
- Replace text: { replace: { find: "old", with: "new" } }
- Insert after heading: { insertAfterHeading: { heading: "Title", content: "text" } }
- Update frontmatter: { updateFrontmatter: { key: "value" } }

For complex operations, use the advanced format with operation.type = 'insert'/'replace'/'update_frontmatter'.`;
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to file (relative to vault root)'
      },
      // Simple shortcuts
      append: {
        type: 'string',
        description: 'Text to append to the end of the document'
      },
      prepend: {
        type: 'string',
        description: 'Text to prepend to the beginning of the document'
      },
      replace: {
        type: 'object',
        properties: {
          find: { type: 'string', description: 'Text to find' },
          with: { type: 'string', description: 'Text to replace with' }
        },
        required: ['find', 'with'],
        description: 'Simple find and replace'
      },
      insertAfterHeading: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'Heading text to insert after' },
          content: { type: 'string', description: 'Content to insert' }
        },
        required: ['heading', 'content'],
        description: 'Insert content after a heading'
      },
      insertBeforeHeading: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'Heading text to insert before' },
          content: { type: 'string', description: 'Content to insert' }
        },
        required: ['heading', 'content'],
        description: 'Insert content before a heading'
      },
      updateFrontmatter: {
        type: 'object',
        additionalProperties: true,
        description: 'Update frontmatter fields (merges with existing)'
      },
      // Advanced operation
      operation: {
        type: 'object',
        description: 'Advanced operation format (see V2 schema)',
        properties: {
          type: {
            type: 'string',
            enum: ['replace', 'insert', 'update_frontmatter']
          }
        }
      },
      // Options
      options: {
        type: 'object',
        properties: {
          create_file_if_missing: { 
            type: 'boolean',
            description: 'Create file if it doesn\'t exist (default: false)'
          },
          backup: { 
            type: 'boolean',
            description: 'Create backup before modification (default: false)'
          },
          dry_run: { 
            type: 'boolean',
            description: 'Preview changes without applying (default: false)'
          }
        }
      }
    },
    required: ['filepath'],
    additionalProperties: false
  };

  async execute(args: PatchContentArgs): Promise<PatchContentResult> {
    try {
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      
      // For dry run, we would parse and validate but not execute
      if (args.options?.dry_run) {
        return {
          success: true,
          message: 'Dry run - no changes made',
          changes: {
            type: 'dry_run',
            preview: 'Would apply the requested changes'
          }
        };
      }
      
      // Detect operation type
      const operation = this.detectOperation(args);
      if (!operation) {
        return {
          success: false,
          error: {
            code: 'NO_OPERATION',
            message: 'No operation specified',
            hint: 'Specify an operation like append, prepend, replace, or use the advanced operation format',
            example: {
              simple: { filepath: 'notes.md', append: 'New content' },
              advanced: { 
                filepath: 'notes.md', 
                operation: { 
                  type: 'insert', 
                  insert: { 
                    content: 'text', 
                    location: { type: 'document', document: { position: 'end' }, position: 'after' } 
                  } 
                } 
              }
            }
          }
        };
      }
      
      // Convert simple operations to advanced format
      const advancedOp = this.convertToAdvancedOperation(operation);
      
      // Execute using the same logic as V2
      switch (advancedOp.type) {
        case 'replace':
          return await this.handleReplace(client, args.filepath, advancedOp.replace!);
          
        case 'insert':
          return await this.handleInsert(client, args.filepath, advancedOp.insert!);
          
        case 'update_frontmatter':
          return await this.handleFrontmatter(client, args.filepath, advancedOp.update_frontmatter!);
          
        default:
          return {
            success: false,
            error: {
              code: 'INVALID_OPERATION_TYPE',
              message: `Unknown operation type: ${(advancedOp as any).type}`
            }
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          hint: 'Check that your operation format is correct. Use simple shortcuts like { append: "text" } for common tasks.'
        }
      };
    }
  }
  
  private detectOperation(args: PatchContentArgs): SimpleOperation | AdvancedOperation | null {
    // Check for simple operations first
    if (args.append) return { append: args.append };
    if (args.prepend) return { prepend: args.prepend };
    if (args.replace) return { replace: args.replace };
    if (args.insertAfterHeading) return { insertAfterHeading: args.insertAfterHeading };
    if (args.insertBeforeHeading) return { insertBeforeHeading: args.insertBeforeHeading };
    if (args.updateFrontmatter) return { updateFrontmatter: args.updateFrontmatter };
    
    // Check for advanced operation
    if (args.operation) return args.operation;
    
    // Legacy format support
    if (args.content && args.target) {
      return {
        append: args.content
      };
    }
    
    return null;
  }
  
  private convertToAdvancedOperation(op: SimpleOperation | AdvancedOperation): AdvancedOperation {
    // If already advanced, return as-is
    if ('type' in op) {
      return op;
    }
    
    // Convert simple operations
    if ('append' in op) {
      return {
        type: 'insert',
        insert: {
          content: op.append,
          location: {
            type: 'document',
            document: { position: 'end' },
            position: 'after'
          }
        }
      };
    }
    
    if ('prepend' in op) {
      return {
        type: 'insert',
        insert: {
          content: op.prepend,
          location: {
            type: 'document',
            document: { position: 'start' },
            position: 'before'
          }
        }
      };
    }
    
    if ('replace' in op) {
      return {
        type: 'replace',
        replace: {
          pattern: op.replace.find,
          replacement: op.replace.with
        }
      };
    }
    
    if ('insertAfterHeading' in op) {
      return {
        type: 'insert',
        insert: {
          content: op.insertAfterHeading.content,
          location: {
            type: 'heading',
            heading: {
              path: [op.insertAfterHeading.heading]
            },
            position: 'after'
          }
        }
      };
    }
    
    if ('insertBeforeHeading' in op) {
      return {
        type: 'insert',
        insert: {
          content: op.insertBeforeHeading.content,
          location: {
            type: 'heading',
            heading: {
              path: [op.insertBeforeHeading.heading]
            },
            position: 'before'
          }
        }
      };
    }
    
    if ('updateFrontmatter' in op) {
      return {
        type: 'update_frontmatter',
        update_frontmatter: {
          changes: {
            set: op.updateFrontmatter
          }
        }
      };
    }
    
    throw new Error('Unknown operation type');
  }
  
  private async handleReplace(
    client: any,
    filepath: string,
    operation: any
  ): Promise<PatchContentResult> {
    try {
      const content = await client.getFileContents(filepath);
      
      let pattern = operation.pattern;
      if (!operation.options?.regex) {
        // Escape special regex characters
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      
      if (operation.options?.whole_word) {
        pattern = `\\b${pattern}\\b`;
      }
      
      const flags = operation.options?.case_sensitive === false ? 'gi' : 'g';
      const regex = new RegExp(pattern, flags);
      
      let count = 0;
      let newContent = content;
      
      if (operation.options?.scope?.type === 'section' && operation.options.scope.section_path) {
        // Section-scoped replacement would require parsing the document structure
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Section-scoped replacement not yet implemented',
            hint: 'Use document-wide replacement for now'
          }
        };
      } else {
        // Document-wide replacement
        if (operation.options?.max_replacements && operation.options.max_replacements > 0) {
          let replacements = 0;
          newContent = content.replace(regex, (match: string) => {
            if (replacements < operation.options!.max_replacements!) {
              replacements++;
              count++;
              return operation.replacement;
            }
            return match;
          });
        } else {
          newContent = content.replace(regex, operation.replacement);
          count = (content.match(regex) || []).length;
        }
      }
      
      if (count === 0) {
        return {
          success: false,
          error: {
            code: 'PATTERN_NOT_FOUND',
            message: `Pattern "${operation.pattern}" not found in document`,
            hint: 'Check your search pattern. Use regex: true for regex patterns.'
          }
        };
      }
      
      await client.updateFile(filepath, newContent);
      
      return {
        success: true,
        message: `Replaced ${count} occurrence(s) of "${operation.pattern}"`,
        changes: {
          type: 'replace',
          count,
          preview: `Replaced ${count} occurrence(s)`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'REPLACE_ERROR',
          message: error.message
        }
      };
    }
  }
  
  private async handleInsert(
    client: any,
    filepath: string,
    operation: any
  ): Promise<PatchContentResult> {
    try {
      const { location } = operation;
      
      // Handle simple document operations first
      if (location.type === 'document') {
        const content = await client.getFileContents(filepath);
        let newContent: string;
        
        // Check document position first, then fall back to generic position
        const position = location.document?.position;
        
        if (position === 'start' || (!position && location.position === 'before')) {
          newContent = operation.content + '\n' + content;
        } else if (position === 'end' || (!position && location.position === 'after')) {
          newContent = content + (content.endsWith('\n') ? '' : '\n') + operation.content;
        } else if (position === 'after_frontmatter') {
          // Find end of frontmatter
          const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
          if (frontmatterMatch) {
            const endIndex = frontmatterMatch[0].length;
            // Insert content directly after frontmatter without extra newline
            newContent = content.slice(0, endIndex) + operation.content + '\n' + content.slice(endIndex);
          } else {
            // No frontmatter, insert at start
            newContent = operation.content + '\n' + content;
          }
        } else {
          throw new Error('Invalid document position');
        }
        
        await client.updateFile(filepath, newContent);
        return {
          success: true,
          message: `Content inserted at ${location.document?.position || location.position} of document`,
          changes: {
            type: 'insert',
            preview: 'Content inserted successfully'
          }
        };
      }
      
      // For heading/block operations, use the patch API
      let headers: any = {};
      let targetSpecifier = '';
      
      switch (location.type) {
        case 'heading':
          if (!location.heading) {
            throw new Error('Heading location details required');
          }
          
          headers['Target-Type'] = 'heading';
          targetSpecifier = location.heading.path[location.heading.path.length - 1];
          headers['Target'] = targetSpecifier;
          headers['Operation'] = location.position === 'before' ? 'prepend' : 
                                location.position === 'replace' ? 'replace' : 'append';
          break;
          
        case 'block':
          if (!location.block) {
            throw new Error('Block location details required');
          }
          
          headers['Target-Type'] = 'block';
          headers['Target'] = location.block.id;
          headers['Operation'] = location.position === 'before' ? 'prepend' : 
                                location.position === 'replace' ? 'replace' : 'append';
          break;
          
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_LOCATION_TYPE',
              message: `Location type "${location.type}" not yet supported`,
              hint: 'Use document, heading, or block location types'
            }
          };
      }
      
      await client.patchContent(filepath, operation.content, {
        targetType: location.type,
        target: targetSpecifier,
        insertAfter: location.position === 'after',
        insertBefore: location.position === 'before'
      });
      
      return {
        success: true,
        message: `Content inserted ${location.position} ${location.type}: ${targetSpecifier}`,
        changes: {
          type: 'insert',
          preview: `Content inserted successfully`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: error.message,
          hint: 'Check that the target heading or block exists in the document'
        }
      };
    }
  }
  
  private async handleFrontmatter(
    client: any,
    filepath: string,
    operation: any
  ): Promise<PatchContentResult> {
    try {
      const changes = operation.changes;
      
      // Process different change types
      if (changes.set) {
        for (const [field, value] of Object.entries(changes.set)) {
          await client.patchContent(filepath, JSON.stringify(value), {
            targetType: 'frontmatter',
            target: field
          });
        }
      }
      
      // Note: append, remove, and merge operations would need additional implementation
      if (changes.append || changes.remove || changes.merge) {
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Frontmatter append/remove/merge operations not yet implemented',
            hint: 'Use set operation to update individual fields'
          }
        };
      }
      
      return {
        success: true,
        message: 'Frontmatter updated successfully',
        changes: {
          type: 'update_frontmatter',
          preview: 'Frontmatter fields updated'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FRONTMATTER_ERROR',
          message: error.message,
          hint: 'Ensure frontmatter values are valid YAML'
        }
      };
    }
  }
}