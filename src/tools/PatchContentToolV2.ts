import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

interface ReplaceOperation {
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
}

interface HeadingLocation {
  path: string[];
  level?: number;
  occurrence?: number;
  create_if_missing?: boolean;
}

interface BlockLocation {
  id: string;
  create_if_missing?: boolean;
}

interface PatternLocation {
  text: string;
  regex?: boolean;
  occurrence?: number;
}

interface DocumentLocation {
  position: 'start' | 'end' | 'after_frontmatter';
}

interface InsertOperation {
  content: string;
  location: {
    type: 'heading' | 'block' | 'pattern' | 'document';
    heading?: HeadingLocation;
    block?: BlockLocation;
    pattern?: PatternLocation;
    document?: DocumentLocation;
    position: 'before' | 'after' | 'replace';
  };
}

interface FrontmatterOperation {
  changes: {
    set?: Record<string, any>;
    append?: Record<string, any[]>;
    remove?: string[];
    merge?: Record<string, any>;
  };
  create_if_missing?: boolean;
}

interface PatchContentArgs {
  filepath: string;
  operation: {
    type: 'replace' | 'insert' | 'update_frontmatter';
    replace?: ReplaceOperation;
    insert?: InsertOperation;
    update_frontmatter?: FrontmatterOperation;
  };
  options?: {
    create_file_if_missing?: boolean;
    backup?: boolean;
    dry_run?: boolean;
  };
}

interface PatchContentResult {
  success: boolean;
  changes?: {
    type: 'replace' | 'insert' | 'frontmatter' | 'update_frontmatter';
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
  };
}

export class PatchContentToolV2 extends BaseTool {
  name = 'obsidian_patch_content_v2';
  description = 'LLM-ergonomic content modification with explicit operations and deterministic targeting. Use query_structure first for unambiguous references.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to file (relative to vault root)'
      },
      operation: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['replace', 'insert', 'update_frontmatter'],
            description: 'The type of operation to perform'
          },
          replace: {
            type: 'object',
            properties: {
              pattern: { type: 'string' },
              replacement: { type: 'string' },
              options: {
                type: 'object',
                properties: {
                  case_sensitive: { type: 'boolean' },
                  whole_word: { type: 'boolean' },
                  regex: { type: 'boolean' },
                  max_replacements: { type: 'number' },
                  scope: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['document', 'section'] },
                      section_path: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            required: ['pattern', 'replacement']
          },
          insert: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['heading', 'block', 'pattern', 'document']
                  },
                  heading: {
                    type: 'object',
                    properties: {
                      path: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      level: { type: 'number' },
                      occurrence: { type: 'number' },
                      create_if_missing: { type: 'boolean' }
                    },
                    required: ['path']
                  },
                  block: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      create_if_missing: { type: 'boolean' }
                    },
                    required: ['id']
                  },
                  pattern: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      regex: { type: 'boolean' },
                      occurrence: { type: 'number' }
                    },
                    required: ['text']
                  },
                  document: {
                    type: 'object',
                    properties: {
                      position: {
                        type: 'string',
                        enum: ['start', 'end', 'after_frontmatter']
                      }
                    },
                    required: ['position']
                  },
                  position: {
                    type: 'string',
                    enum: ['before', 'after', 'replace']
                  }
                },
                required: ['type', 'position']
              }
            },
            required: ['content', 'location']
          },
          update_frontmatter: {
            type: 'object',
            properties: {
              changes: {
                type: 'object',
                properties: {
                  set: { type: 'object' },
                  append: { type: 'object' },
                  remove: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  merge: { type: 'object' }
                }
              },
              create_if_missing: { type: 'boolean' }
            },
            required: ['changes']
          }
        },
        required: ['type']
      },
      options: {
        type: 'object',
        properties: {
          create_file_if_missing: { type: 'boolean' },
          backup: { type: 'boolean' },
          dry_run: { type: 'boolean' }
        }
      }
    },
    required: ['filepath', 'operation']
  };

  async execute(args: PatchContentArgs): Promise<PatchContentResult> {
    try {
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      
      // For dry run, we would parse and validate but not execute
      if (args.options?.dry_run) {
        return {
          success: true,
          changes: {
            type: args.operation.type,
            preview: 'Dry run - no changes made'
          }
        };
      }
      
      switch (args.operation.type) {
        case 'replace':
          return await this.handleReplace(client, args.filepath, args.operation.replace!);
          
        case 'insert':
          return await this.handleInsert(client, args.filepath, args.operation.insert!);
          
        case 'update_frontmatter':
          return await this.handleFrontmatter(client, args.filepath, args.operation.update_frontmatter!);
          
        default:
          return {
            success: false,
            error: {
              code: 'INVALID_OPERATION_TYPE',
              message: `Unknown operation type: ${(args.operation as any).type}`
            }
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred'
        }
      };
    }
  }
  
  private async handleReplace(
    client: any,
    filepath: string,
    operation: ReplaceOperation
  ): Promise<PatchContentResult> {
    try {
      // For now, we'll use the existing patch mechanism
      // In a real implementation, this would be more sophisticated
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
        // For now, simplified implementation
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Section-scoped replacement not yet implemented'
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
            message: `Pattern "${operation.pattern}" not found in document`
          }
        };
      }
      
      await client.updateFile(filepath, newContent);
      
      return {
        success: true,
        changes: {
          type: 'replace',
          count,
          preview: `Replaced ${count} occurrence(s) of "${operation.pattern}"`
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
    operation: InsertOperation
  ): Promise<PatchContentResult> {
    try {
      const { location } = operation;
      
      // Build the appropriate headers and body for the REST API
      let headers: any = {};
      let targetSpecifier = '';
      
      switch (location.type) {
        case 'heading':
          if (!location.heading) {
            throw new Error('Heading location details required');
          }
          
          headers['Target-Type'] = 'heading';
          // For heading paths, we need to find the exact heading text
          // This is a simplified version - real implementation would parse the document
          targetSpecifier = location.heading.path[location.heading.path.length - 1];
          
          if (location.heading.occurrence && location.heading.occurrence > 1) {
            // Would need to handle occurrence in the actual implementation
            return {
              success: false,
              error: {
                code: 'NOT_IMPLEMENTED',
                message: 'Heading occurrence disambiguation not yet implemented in this version'
              }
            };
          }
          
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
          
        case 'document':
          if (!location.document) {
            throw new Error('Document location details required');
          }
          
          // For document-level operations, we might need different approach
          if (location.document.position === 'end') {
            const content = await client.getFileContents(filepath);
            await client.updateFile(filepath, content + '\n' + operation.content);
            return {
              success: true,
              changes: {
                type: 'insert',
                preview: 'Content appended to end of document'
              }
            };
          }
          break;
          
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_LOCATION_TYPE',
              message: `Location type "${location.type}" not yet supported`
            }
          };
      }
      
      // Use the patch API for heading/block operations
      if (location.type === 'heading' || location.type === 'block') {
        await client.patchContent(filepath, operation.content, {
          targetType: location.type,
          target: targetSpecifier,
          // Map our position to the API's expectation
          insertAfter: location.position === 'after',
          insertBefore: location.position === 'before'
        });
        
        return {
          success: true,
          changes: {
            type: 'insert',
            preview: `Content inserted ${location.position} ${location.type}: ${targetSpecifier}`
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'This insert operation is not yet implemented'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: error.message
        }
      };
    }
  }
  
  private async handleFrontmatter(
    client: any,
    filepath: string,
    operation: FrontmatterOperation
  ): Promise<PatchContentResult> {
    try {
      // For frontmatter updates, we'll use the patch API
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
            message: 'Frontmatter append/remove/merge operations not yet implemented'
          }
        };
      }
      
      return {
        success: true,
        changes: {
          type: 'update_frontmatter',
          preview: 'Frontmatter updated successfully'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FRONTMATTER_ERROR',
          message: error.message
        }
      };
    }
  }
}