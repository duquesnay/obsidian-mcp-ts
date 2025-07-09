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
  description = `Smart content modification with progressive complexity. Start simple - the tool handles complexity automatically.

🎯 IMMEDIATE SUCCESS - Use these patterns for first-attempt success:
• Append text: { filepath: "notes.md", append: "text to add" }
• Find & replace: { filepath: "notes.md", replace: { find: "old", with: "new" } }
• Insert after heading: { filepath: "notes.md", insertAfterHeading: { heading: "Title", content: "text" } }
• Update metadata: { filepath: "notes.md", updateFrontmatter: { key: "value" } }

📝 WORKING EXAMPLES (copy-paste ready):
1. Add daily task: { filepath: "daily/2025-01-09.md", append: "- Task completed" }
2. Update status: { filepath: "project.md", updateFrontmatter: { status: "completed" } }
3. Insert content: { filepath: "readme.md", insertAfterHeading: { heading: "Installation", content: "New setup guide" } }
4. Fix typos: { filepath: "doc.md", replace: { find: "teh", with: "the" } }
5. Add at start: { filepath: "notes.md", prepend: "## Summary\\nOverview..." }

✅ CONTENT HANDLING (100% reliability):
• Use plain strings: "your text here" (recommended)
• Auto-handles any format internally
• No type specifications needed
• Strings always work on first try

🔧 ADVANCED: For complex multi-location edits, use operation: { type: 'insert'/'replace'/'update_frontmatter', ... }

💡 TIP: For simple appending, obsidian_append_content is even simpler!`;
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to file (relative to vault root)'
      },
      // Simple shortcuts - the most common operations
      append: {
        type: 'string',
        description: 'Append text to end of document. Example: "- New task\\n- Another item"'
      },
      prepend: {
        type: 'string',
        description: 'Add text to beginning of document. Example: "## Summary\\nThis document..."'
      },
      replace: {
        type: 'object',
        properties: {
          find: { type: 'string', description: 'Text to find (exact match)' },
          with: { type: 'string', description: 'Replacement text' }
        },
        required: ['find', 'with'],
        description: 'Simple find and replace. Example: { find: "TODO", with: "DONE" }'
      },
      insertAfterHeading: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'Heading text (without #)' },
          content: { type: 'string', description: 'Content to insert after heading' }
        },
        required: ['heading', 'content'],
        description: 'Insert after heading. Example: { heading: "Introduction", content: "\\n### Overview\\n..." }'
      },
      insertBeforeHeading: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'Heading text (without #)' },
          content: { type: 'string', description: 'Content to insert before heading' }
        },
        required: ['heading', 'content'],
        description: 'Insert before heading. Example: { heading: "References", content: "\\n## Notes\\n..." }'
      },
      updateFrontmatter: {
        type: 'object',
        additionalProperties: true,
        description: 'Update frontmatter fields. Example: { tags: ["done"], status: "completed" }'
      },
      // Advanced operation - for complex use cases
      operation: {
        type: 'object',
        description: 'Advanced format for complex operations requiring precise control',
        properties: {
          type: {
            type: 'string',
            enum: ['replace', 'insert', 'update_frontmatter'],
            description: 'Operation type'
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
      // Early validation and intelligent parameter detection
      const detectedIntent = this.detectUserIntent(args);
      if (detectedIntent.suggestion) {
        return {
          success: false,
          error: {
            code: 'PARAMETER_SUGGESTION',
            message: detectedIntent.message || 'Parameter format could be improved',
            hint: detectedIntent.suggestion,
            example: detectedIntent.example
          }
        };
      }
      
      // Enhanced error-first approach: provide immediate success patterns
      // Only suggest quick wins if user provided complex operations that have simple equivalents
      const quickWin = this.getQuickWinSuggestion(args);
      if (quickWin && args.operation && !this.hasSimpleParameters(args)) {
        return {
          success: false,
          error: {
            code: 'QUICK_WIN_AVAILABLE',
            message: 'Simple approach available for your task',
            hint: quickWin.hint,
            example: quickWin.example
          }
        };
      }
      
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      
      // Check if file exists first (except when creating or in dry run)
      const createIfMissing = args.options?.create_file_if_missing || false;
      const isDryRun = args.options?.dry_run || false;
      
      if (!createIfMissing && !isDryRun) {
        try {
          await client.getFileContents(args.filepath);
        } catch (error: any) {
          if (error.response?.status === 404) {
            return {
              success: false,
              error: {
                code: 'FILE_NOT_FOUND',
                message: `File not found: ${args.filepath}`,
                hint: 'Check the file path. To create a new file, use options: { create_file_if_missing: true }',
                example: {
                  createNew: { 
                    filepath: args.filepath, 
                    append: 'Initial content',
                    options: { create_file_if_missing: true }
                  }
                }
              }
            };
          }
          throw error;
        }
      }
      
      // For dry run, we would parse and validate but not execute
      if (args.options?.dry_run) {
        const operation = this.detectOperation(args);
        if (!operation) {
          return {
            success: false,
            error: this.getNoOperationError()
          };
        }
        
        const advancedOp = this.convertToAdvancedOperation(operation);
        return {
          success: true,
          message: 'Dry run - no changes made',
          changes: {
            type: 'dry_run',
            preview: `Would perform ${advancedOp.type} operation`
          }
        };
      }
      
      // Detect operation type
      const operation = this.detectOperation(args);
      if (!operation) {
        return {
          success: false,
          error: this.getNoOperationError()
        };
      }
      
      // Convert simple operations to advanced format
      const advancedOp = this.convertToAdvancedOperation(operation);
      
      // Handle file creation if needed
      if (createIfMissing && advancedOp.type === 'insert') {
        try {
          await client.getFileContents(args.filepath);
        } catch (error: any) {
          if (error.response?.status === 404) {
            // File doesn't exist, create it with empty content
            // Use updateFile which creates if not exists
            await client.updateFile(args.filepath, '');
          }
        }
      }
      
      // Execute using the same logic as V2
      switch (advancedOp.type) {
        case 'replace':
          return await this.handleReplace(client, args.filepath, advancedOp.replace!, args);
          
        case 'insert':
          return await this.handleInsert(client, args.filepath, advancedOp.insert!, args);
          
        case 'update_frontmatter':
          return await this.handleFrontmatter(client, args.filepath, advancedOp.update_frontmatter!, args);
          
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
      // Enhanced error handling with better context and examples
      const enhancedError = this.enhanceErrorWithContext(error, args);
      if (enhancedError) {
        return enhancedError;
      }
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          hint: this.getErrorHint(error, args),
          example: this.getRelevantExample(args)
        }
      };
    }
  }
  
  private getNoOperationError(): any {
    return {
      code: 'NO_OPERATION',
      message: 'No operation specified',
      hint: '🚀 QUICK START: Choose one of these working patterns:',
      example: {
        immediate_use: {
          append: { 
            description: 'Add text to end of file (90% of use cases)',
            usage: { filepath: 'daily/2025-01-09.md', append: '\\n- Completed task X' }
          },
          replace: { 
            description: 'Find and replace text',
            usage: { filepath: 'notes.md', replace: { find: 'TODO', with: 'DONE' } }
          },
          insertAfterHeading: {
            description: 'Insert after a specific heading',
            usage: { filepath: 'doc.md', insertAfterHeading: { heading: 'Overview', content: '\\n### Details\\nContent here' } }
          }
        },
        structured: {
          updateFrontmatter: {
            description: 'Update metadata fields',
            usage: { filepath: 'note.md', updateFrontmatter: { status: 'completed', tags: ['done'] } }
          },
          prepend: {
            description: 'Add text to beginning of file',
            usage: { filepath: 'note.md', prepend: '## Summary\\nOverview...' }
          }
        },
        tip: '💡 For simple appending, you can also use the append_content tool which is even simpler!'
      }
    };
  }
  
  private detectOperation(args: PatchContentArgs): SimpleOperation | AdvancedOperation | null {
    // Check for simple operations first (in order of common usage)
    if (args.append !== undefined) return { append: args.append };
    if (args.prepend !== undefined) return { prepend: args.prepend };
    if (args.replace) return { replace: args.replace };
    if (args.insertAfterHeading) return { insertAfterHeading: args.insertAfterHeading };
    if (args.insertBeforeHeading) return { insertBeforeHeading: args.insertBeforeHeading };
    if (args.updateFrontmatter) return { updateFrontmatter: args.updateFrontmatter };
    
    // Check for advanced operation
    if (args.operation) {
      // Try to detect if user is attempting a simple operation in complex format
      if (this.isSimpleOperationInComplexFormat(args.operation)) {
        console.warn('Simple operation detected in complex format. Consider using shortcuts.');
      }
      return args.operation;
    }
    
    // Legacy format support and intelligent detection
    if (args.content && args.target) {
      // Legacy patch_content format
      return { append: args.content };
    }
    
    // Try to infer from partial parameters
    if (args.content && !args.operation) {
      // User provided content but no clear operation
      console.warn('Content provided without clear operation. Assuming append.');
      return { append: args.content };
    }
    
    return null;
  }
  
  private isSimpleOperationInComplexFormat(operation: any): boolean {
    if (operation.type === 'insert' && operation.insert?.location?.type === 'document') {
      const pos = operation.insert.location.document?.position;
      if (pos === 'end' || pos === 'start') {
        return true; // This could be a simple append/prepend
      }
    }
    return false;
  }
  
  private convertToAdvancedOperation(op: SimpleOperation | AdvancedOperation): AdvancedOperation {
    // If already advanced, return as-is
    if ('type' in op) {
      // Validate and normalize content in advanced operations
      if (op.type === 'insert' && op.insert) {
        op.insert.content = this.normalizeContent(op.insert.content);
      }
      return op;
    }
    
    // Convert simple operations
    if ('append' in op) {
      return {
        type: 'insert',
        insert: {
          content: this.normalizeContent(op.append),
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
          content: this.normalizeContent(op.prepend),
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
          content: this.normalizeContent(op.insertAfterHeading.content),
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
          content: this.normalizeContent(op.insertBeforeHeading.content),
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
    operation: any,
    args?: PatchContentArgs
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
            hint: 'Check your search pattern. Ensure exact match including case. For flexible matching, use advanced operation with regex: true.',
            suggestions: this.getSimilarPatterns(content, operation.pattern)
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
    operation: any,
    args?: PatchContentArgs
  ): Promise<PatchContentResult> {
    const { location } = operation;
    
    try {
      
      // Handle simple document operations first
      if (location.type === 'document') {
        const content = await client.getFileContents(filepath);
        let newContent: string;
        
        // Check document position first, then fall back to generic position
        const position = location.document?.position;
        const normalizedContent = this.normalizeContent(operation.content);
        
        if (position === 'start' || (!position && location.position === 'before')) {
          newContent = normalizedContent + '\n' + content;
        } else if (position === 'end' || (!position && location.position === 'after')) {
          newContent = content + (content.endsWith('\n') ? '' : '\n') + normalizedContent;
        } else if (position === 'after_frontmatter') {
          // Find end of frontmatter
          const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
          if (frontmatterMatch) {
            const endIndex = frontmatterMatch[0].length;
            // Insert content directly after frontmatter without extra newline
            newContent = content.slice(0, endIndex) + normalizedContent + '\n' + content.slice(endIndex);
          } else {
            // No frontmatter, insert at start
            newContent = normalizedContent + '\n' + content;
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
      
      await client.patchContent(filepath, this.normalizeContent(operation.content), {
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
          hint: this.getInsertErrorHint(error, location, args),
          example: this.getInsertErrorExample(location, args),
          suggestions: await this.getInsertSuggestions(client, filepath, location, error)
        }
      };
    }
  }
  
  private async handleFrontmatter(
    client: any,
    filepath: string,
    operation: any,
    args?: PatchContentArgs
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
          hint: 'Ensure frontmatter values are valid YAML. Arrays need brackets, strings with colons need quotes.',
          example: {
            correct: { updateFrontmatter: { tags: ['tag1', 'tag2'], title: 'My Note: A Guide' } },
            incorrect: { updateFrontmatter: { tags: 'tag1, tag2', title: 'My Note: A Guide' } }
          }
        }
      };
    }
  }
  
  private getErrorHint(error: any, args: PatchContentArgs): string {
    // Provide context-aware hints based on the error and attempted operation
    if (error.message?.includes('content') && error.message?.includes('type')) {
      return 'Content should be a simple string. If you see type errors, use the simple operation format like { append: "text" }';
    }
    
    if (args.operation && 'type' in args.operation) {
      return 'Advanced operation detected. Ensure all required fields are present for the operation type.';
    }
    
    return 'Try using one of the simple operations: append, prepend, replace, insertAfterHeading, or updateFrontmatter.';
  }
  
  private getRelevantExample(args: PatchContentArgs): any {
    // Return an example most relevant to what the user was trying to do
    if (args.operation && 'type' in args.operation) {
      const opType = args.operation.type;
      if (opType === 'insert') {
        return {
          simple: { filepath: 'note.md', append: 'Text to add' },
          advanced: { 
            filepath: 'note.md', 
            operation: { 
              type: 'insert',
              insert: {
                content: 'Text to insert',
                location: {
                  type: 'heading',
                  heading: { path: ['Section Name'] },
                  position: 'after'
                }
              }
            }
          }
        };
      }
    }
    
    // Default to showing simple examples
    return {
      append: { filepath: 'daily.md', append: '\\n- New task' },
      replace: { filepath: 'notes.md', replace: { find: 'old text', with: 'new text' } },
      heading: { filepath: 'doc.md', insertAfterHeading: { heading: 'Overview', content: '\\nNew section content' } }
    };
  }
  
  private getSimilarPatterns(content: string, pattern: string): any[] {
    // Provide suggestions for similar text that might have been intended
    const suggestions = [];
    
    // Case-insensitive match
    const caseInsensitiveRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
    const matches = content.match(caseInsensitiveRegex);
    if (matches && matches.length > 0) {
      suggestions.push({
        found: matches[0],
        hint: 'Found with different case',
        fix: {
          simple: `Use exact case: { replace: { find: "${matches[0]}", with: "..." } }`,
          advanced: 'Or use case_sensitive: false in advanced operation'
        }
      });
    }
    
    // Partial matches
    const words = pattern.split(/\\s+/);
    if (words.length > 1) {
      for (const word of words) {
        if (word.length > 3 && content.includes(word)) {
          // Find the context around the word
          const index = content.indexOf(word);
          const start = Math.max(0, index - 20);
          const end = Math.min(content.length, index + word.length + 20);
          const context = content.substring(start, end).trim();
          
          suggestions.push({
            found: word,
            context: `...${context}...`,
            hint: 'Found partial match. Check the full phrase in context.'
          });
          break;
        }
      }
    }
    
    // Suggest checking for common variations
    if (suggestions.length === 0) {
      suggestions.push({
        hint: 'Pattern not found. Common issues:',
        tips: [
          'Check for extra spaces or punctuation',
          'Verify exact spelling',
          'Use obsidian_simple_search to find the text first'
        ]
      });
    }
    
    return suggestions;
  }
  
  private getInsertErrorHint(error: any, location: any, args?: PatchContentArgs): string {
    if (error.message?.includes('not found')) {
      if (location.type === 'heading') {
        const heading = location.heading?.path?.[0] || 'Unknown';
        return `Heading "${heading}" not found. Tips:\\n` +
               '1. Use exact heading text without # symbols\\n' +
               '2. Check capitalization and spelling\\n' +
               '3. Use obsidian_query_structure to list all headings first';
      } else if (location.type === 'block') {
        return 'Block ID not found. Tips:\\n' +
               '1. Ensure the block reference (^blockid) exists\\n' +
               '2. Use obsidian_query_structure with type: "blocks" to list all blocks';
      }
    }
    
    // Check for common mistakes
    if (location.type === 'heading' && location.heading?.path?.[0]?.includes('#')) {
      return '⚠️ Remove # symbols from heading text. Use "Introduction" not "## Introduction"';
    }
    
    return 'Check that the target location exists. For headings, use the text without # symbols.';
  }
  
  private getInsertErrorExample(location: any, args?: PatchContentArgs): any {
    if (location.type === 'heading') {
      return {
        correct: { insertAfterHeading: { heading: 'Introduction', content: 'New text' } },
        incorrect: { insertAfterHeading: { heading: '## Introduction', content: 'New text' } }
      };
    } else if (location.type === 'block') {
      return {
        correct: { 
          operation: {
            type: 'insert',
            insert: {
              content: 'New text',
              location: { type: 'block', block: { id: 'myBlockId' }, position: 'after' }
            }
          }
        }
      };
    }
    return this.getRelevantExample(args || { filepath: '' });
  }
  
  private async getInsertSuggestions(client: any, filepath: string, location: any, error: any): Promise<any[]> {
    if (location.type === 'heading' && error.message?.includes('not found')) {
      try {
        // Query the document structure to find similar headings
        const structure = await client.queryStructure(filepath, {
          type: 'headings',
          filter: { text: location.heading?.path?.[0] }
        });
        
        if (structure?.headings?.length > 0) {
          return structure.headings.slice(0, 3).map((h: any) => ({
            heading: h.text,
            hint: `Did you mean "${h.text}"?`
          }));
        }
      } catch (e) {
        // Ignore errors in suggestion generation
      }
    }
    return [];
  }
  
  private normalizeContent(content: any): string {
    // Ensure content is always a string, handling various input formats
    
    // String content - most common case, handle directly
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle array format that might come from some clients
    if (Array.isArray(content)) {
      // Extract text from array of content blocks
      return content
        .map(block => {
          if (typeof block === 'string') return block;
          if (block?.type === 'text' && block?.text) return block.text;
          if (block?.text) return block.text;
          if (block?.content) return block.content;
          if (block?.value) return block.value;
          return '';
        })
        .filter(text => text !== '') // Remove empty strings
        .join('\n');
    }
    
    // Handle object with text property (common in complex operations)
    if (content && typeof content === 'object') {
      if (content.type === 'text' && content.text) return content.text;
      if (content.text) return content.text;
      if (content.content) return content.content;
      if (content.value) return content.value; // Legacy support
    }
    
    // Handle null/undefined gracefully
    if (content === null || content === undefined) {
      return '';
    }
    
    // Handle numbers and other primitive types
    if (typeof content === 'number' || typeof content === 'boolean') {
      return String(content);
    }
    
    // Fallback to string conversion with enhanced logging
    console.info('Content format auto-normalized. Original:', JSON.stringify(content, null, 2));
    return String(content);
  }
  
  private detectUserIntent(args: any): { suggestion?: string; message?: string; example?: any } {
    // Detect common mistakes and provide immediate guidance
    
    // Check if user is trying to use array format for content
    if (args.append && Array.isArray(args.append)) {
      return {
        message: 'Content should be a simple string, not an array',
        suggestion: 'For append operation, just use a string: { append: "your text" }',
        example: {
          yourAttempt: { append: args.append },
          correct: { append: args.append.map((item: any) => item.text || item).join('\n') }
        }
      };
    }
    
    // Check if user is mixing simple and complex formats
    if (args.operation && (args.append || args.prepend || args.replace)) {
      return {
        message: 'Mixed operation formats detected',
        suggestion: 'Use either simple shortcuts (append, prepend, etc.) OR the operation field, not both',
        example: {
          simple: { filepath: args.filepath, append: 'text' },
          advanced: { filepath: args.filepath, operation: args.operation }
        }
      };
    }
    
    // Check for common operation type with wrong structure
    if (args.operation && args.operation.type === 'insert' && !args.operation.insert) {
      return {
        message: 'Insert operation missing required fields',
        suggestion: 'For simple append, use { append: "text" } instead of complex operation',
        example: {
          simple: { filepath: args.filepath, append: 'Your text here' },
          complex: {
            filepath: args.filepath,
            operation: {
              type: 'insert',
              insert: {
                content: 'Your text here',
                location: { type: 'document', document: { position: 'end' }, position: 'after' }
              }
            }
          }
        }
      };
    }
    
    // Check for content field without operation context (legacy format)
    if (args.content && !args.target && !args.operation && !args.append) {
      return {
        message: 'Ambiguous content field detected',
        suggestion: 'Specify the operation clearly. Did you mean to append?',
        example: {
          append: { filepath: args.filepath, append: args.content },
          prepend: { filepath: args.filepath, prepend: args.content },
          replace: { filepath: args.filepath, replace: { find: 'old', with: args.content } }
        }
      };
    }
    
    return {};
  }

  private getQuickWinSuggestion(args: any): { hint?: string; example?: any } | null {
    // Provide immediate success patterns for common scenarios
    
    // If user has operation.type but no simple parameters, suggest shortcuts
    if (args.operation?.type === 'insert' && args.operation.insert?.location?.type === 'document') {
      const position = args.operation.insert.location.document?.position;
      if (position === 'end') {
        return {
          hint: '🚀 Quick win: Use the simple append shortcut instead of complex operation',
          example: {
            instead_of_complex: args.operation,
            use_simple: { 
              filepath: args.filepath, 
              append: args.operation.insert.content || 'your text here' 
            }
          }
        };
      }
      if (position === 'start') {
        return {
          hint: '🚀 Quick win: Use the simple prepend shortcut instead of complex operation',
          example: {
            instead_of_complex: args.operation,
            use_simple: { 
              filepath: args.filepath, 
              prepend: args.operation.insert.content || 'your text here' 
            }
          }
        };
      }
    }
    
    // If user has operation.type = 'insert' with heading location
    if (args.operation?.type === 'insert' && args.operation.insert?.location?.type === 'heading') {
      const heading = args.operation.insert.location.heading?.path?.[0];
      const position = args.operation.insert.location.position;
      if (heading && position === 'after') {
        return {
          hint: '🚀 Quick win: Use the simple insertAfterHeading shortcut',
          example: {
            instead_of_complex: args.operation,
            use_simple: {
              filepath: args.filepath,
              insertAfterHeading: {
                heading: heading,
                content: args.operation.insert.content || 'your text here'
              }
            }
          }
        };
      }
    }
    
    return null;
  }

  private getSimpleEquivalent(operation: any): any {
    // Convert complex operations to simple equivalents when possible
    if (operation.type === 'insert' && operation.insert?.location?.type === 'document') {
      const position = operation.insert.location.document?.position;
      if (position === 'end') {
        return { append: operation.insert.content };
      }
      if (position === 'start') {
        return { prepend: operation.insert.content };
      }
    }
    
    if (operation.type === 'insert' && operation.insert?.location?.type === 'heading') {
      const heading = operation.insert.location.heading?.path?.[0];
      const position = operation.insert.location.position;
      if (heading && position === 'after') {
        return { insertAfterHeading: { heading, content: operation.insert.content } };
      }
    }
    
    return null;
  }

  private getValidationFixExamples(args: any): any {
    // Provide immediate working examples based on what the user attempted
    const baseExamples = {
      append: { filepath: args.filepath || 'file.md', append: 'Text to add at end' },
      prepend: { filepath: args.filepath || 'file.md', prepend: 'Text to add at start' },
      replace: { filepath: args.filepath || 'file.md', replace: { find: 'old text', with: 'new text' } },
      insertAfterHeading: { 
        filepath: args.filepath || 'file.md', 
        insertAfterHeading: { heading: 'Section Title', content: 'New content' } 
      }
    };
    
    // If user attempted a complex operation, show both simple and complex examples
    if (args.operation) {
      return {
        simple_shortcuts: baseExamples,
        tip: 'The simple shortcuts above are easier than complex operations for most tasks'
      };
    }
    
    return baseExamples;
  }

  private hasSimpleParameters(args: any): boolean {
    // Check if user provided any simple parameter shortcuts
    return !!(args.append || args.prepend || args.replace || args.insertAfterHeading || args.insertBeforeHeading || args.updateFrontmatter);
  }
  
  private enhanceErrorWithContext(error: any, args: PatchContentArgs): PatchContentResult | null {
    // Content format errors - the most common issue
    if (error.message?.includes('content') && error.message?.includes('type')) {
      const attemptedOp = this.detectOperation(args);
      const opType = attemptedOp && 'type' in attemptedOp ? attemptedOp.type : 'simple';
      
      return {
        success: false,
        error: {
          code: 'CONTENT_FORMAT_ERROR',
          message: 'Content should be a simple string',
          hint: '✅ This tool accepts plain text strings. No arrays or type specifications needed.\n\n❌ Error suggests you might be using: [{type: "text", text: "..."}]\n✅ Just use: "your text here"\n\n🎯 IMMEDIATE FIX: Try the working examples below',
          example: this.getContentFormatExample(args, opType),
          suggestions: [
            {
              preview: 'For simple append: { filepath: "file.md", append: "your text" }'
            },
            {
              preview: 'For heading insert: { filepath: "file.md", insertAfterHeading: { heading: "Title", content: "your text" } }'
            },
            {
              preview: 'Alternative: Use append_content tool for simple appending'
            }
          ]
        }
      };
    }
    
    // Validation errors - provide immediate recovery
    if (error.message?.includes('validation') || error.message?.includes('invalid_union')) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          hint: '🔧 QUICK FIX: Use one of these working patterns that match your intent:',
          example: this.getValidationFixExamples(args),
          suggestions: [
            {
              preview: 'Most common: { filepath: "file.md", append: "text to add" }',
              line: 1
            },
            {
              preview: 'For headings: { filepath: "file.md", insertAfterHeading: { heading: "Section", content: "text" } }',
              line: 2
            },
            {
              preview: 'For replacement: { filepath: "file.md", replace: { find: "old", with: "new" } }',
              line: 3
            }
          ]
        }
      };
    }
    
    // Heading not found errors
    if (error.message?.toLowerCase().includes('heading') && error.message?.toLowerCase().includes('not found')) {
      return {
        success: false,
        error: {
          code: 'HEADING_NOT_FOUND',
          message: error.message,
          hint: '🔍 Check the heading text (without # symbols). The heading must exist in the document.\n\n💡 Tips:\n- Use "Introduction" not "# Introduction"\n- Check exact spelling and capitalization\n- Use obsidian_query_structure to list all headings first',
          example: {
            correct: { insertAfterHeading: { heading: 'Introduction', content: 'New content here' } },
            incorrect: { insertAfterHeading: { heading: '## Introduction', content: 'New content here' } },
            debug: { tool: 'obsidian_query_structure', args: { filepath: args.filepath, query: { type: 'headings' } } }
          }
        }
      };
    }
    
    // File not found with wrong options
    if (error.response?.status === 404 && args.options?.create_file_if_missing) {
      return {
        success: false,
        error: {
          code: 'FILE_CREATION_FAILED',
          message: 'File not found and creation failed',
          hint: '📁 The file creation option might not work with all operations. Try creating the file first.',
          example: {
            quickFix: { tool: 'obsidian_append_content', args: { filepath: args.filepath, content: '', createIfNotExists: true } },
            thenRetry: { tool: 'obsidian_patch_content_v2', args: { ...args, options: { ...args.options, create_file_if_missing: false } } }
          }
        }
      };
    }
    
    // Network/connection errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: 'Cannot connect to Obsidian',
          hint: '🔌 Check that Obsidian is running and the Local REST API plugin is enabled.\n\n🛠️ Troubleshooting:\n- Ensure Obsidian is open\n- Check Local REST API plugin is active\n- Verify API key is correct',
          example: {
            testConnection: { tool: 'obsidian_list_files_in_vault', args: {} }
          }
        }
      };
    }
    
    return null;
  }
  
  private getContentFormatExample(args: PatchContentArgs, opType: string): any {
    const baseExample = {
      whatYouMightHaveTried: {
        wrongFormat1: { append: [{type: 'text', text: 'content'}] },
        wrongFormat2: { content: [{type: 'text', text: 'content'}] }
      },
      correctFormats: {
        append: { filepath: 'note.md', append: 'Your text here' },
        insertAfter: { filepath: 'note.md', insertAfterHeading: { heading: 'Title', content: 'Your text' } },
        replace: { filepath: 'note.md', replace: { find: 'old', with: 'new' } }
      }
    };
    
    // Add operation-specific guidance
    if (opType === 'insert') {
      (baseExample as any).tip = 'For inserting at document end, use append instead of complex insert operation';
    }
    
    return baseExample;
  }
}