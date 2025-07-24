import { BaseTool, ToolResponse, ToolMetadata } from './base.js';
import { AppendStrategy } from './strategies/AppendStrategy.js';
import { FindReplaceStrategy } from './strategies/FindReplaceStrategy.js';
import { HeadingInsertStrategy } from './strategies/HeadingInsertStrategy.js';
import { IEditStrategy, EditContext, AppendOperation, ReplaceOperation, HeadingInsertOperation } from './strategies/IEditStrategy.js';

interface SimpleEdit {
  append?: string;
}

interface StructureEdit {
  after?: string;
  before?: string;
  add?: string;
}

interface TextEdit {
  find?: string;
  replace?: string;
}

type BatchOperation = {
  after?: string;
  before?: string;
  add?: string;
  find?: string;
  replace?: string;
  at?: 'start' | 'end';
  append?: string;
};

interface BatchEdit {
  batch?: BatchOperation[];
}

interface NewSectionEdit {
  new_section?: string;
  at?: 'start' | 'end' | string;
  content?: string;
}

type UnifiedEditArgs = {
  file: string;
} & (SimpleEdit | StructureEdit | TextEdit | BatchEdit | NewSectionEdit);

export class UnifiedEditTool extends BaseTool<UnifiedEditArgs> {
  name = 'obsidian_edit';
  description = 'Edit Obsidian vault notes with smart operations (vault-only - NOT filesystem files). Supports append, find/replace, and heading-based insertions.';
  
  private appendStrategy: IEditStrategy = new AppendStrategy();
  private findReplaceStrategy: IEditStrategy = new FindReplaceStrategy();
  private headingInsertStrategy: IEditStrategy = new HeadingInsertStrategy();

  metadata: ToolMetadata = {
    category: 'editing',
    keywords: ['edit', 'modify', 'update', 'append', 'replace', 'insert'],
    version: '2.0.0'
  };

  inputSchema = {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string' as const,
        description: 'Path to file (relative to vault root)'
      },
      // Simple operations
      append: {
        type: 'string' as const,
        description: 'Append text to end of document. Example: "- New task\\n- Another item"'
      },
      // Structure operations
      after: {
        type: 'string' as const,
        description: 'Heading text to insert after (without heading marks like ##)'
      },
      before: {
        type: 'string' as const,
        description: 'Heading text to insert before (without heading marks like ##)'
      },
      add: {
        type: 'string' as const,
        description: 'Content to add (used with after/before)'
      },
      // Text operations
      find: {
        type: 'string' as const,
        description: 'Text to find (exact match)'
      },
      replace: {
        type: 'string' as const,
        description: 'Replacement text (used with find)'
      },
      // Section operations
      new_section: {
        type: 'string' as const,
        description: 'Title for new section'
      },
      at: {
        type: 'string' as const,
        description: 'Position for new section: "start", "end", or heading name'
      },
      content: {
        type: 'string' as const,
        description: 'Content for new section'
      },
      // Batch operations
      batch: {
        type: 'array' as const,
        description: 'Array of edit operations for complex multi-point edits',
        items: {
          type: 'object' as const,
          properties: {
            after: { type: 'string' as const },
            before: { type: 'string' as const },
            add: { type: 'string' as const },
            find: { type: 'string' as const },
            replace: { type: 'string' as const },
            at: { type: 'string' as const }
          }
        }
      }
    },
    required: ['file']
  };

  async executeTyped(args: UnifiedEditArgs): Promise<ToolResponse> {
    try {
      const client = this.getClient();
      
      // Stage 1: Dead simple operations (must work 100%)
      if ('append' in args && args.append !== undefined) {
        return await this.handleAppend(args.file, args.append);
      }
      
      // Stage 2: Structure-aware operations (90%+ reliability)
      if (('after' in args || 'before' in args) && 'add' in args) {
        return await this.handleHeadingInsert(args.file, args);
      }
      
      // Text replacement operations
      if ('find' in args && 'replace' in args) {
        return await this.handleReplace(args.file, args.find!, args.replace!);
      }
      
      // New section operations
      if ('new_section' in args) {
        return await this.handleNewSection(args.file, args);
      }
      
      // Stage 3: Complex operations (80%+ reliability acceptable)
      if ('batch' in args && args.batch) {
        return await this.handleBatch(args.file, args.batch);
      }
      
      // If no recognized pattern, provide helpful guidance
      return this.formatResponse({
        error: "No valid operation specified",
        examples: {
          simple_append: { file: args.file, append: "your text here" },
          after_heading: { file: args.file, after: "Heading Name", add: "your content" },
          replace_text: { file: args.file, find: "old text", replace: "new text" }
        },
        help: "Use one of the patterns above. For questions, check the tool description."
      });
      
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  private async handleAppend(filepath: string, content: string): Promise<ToolResponse> {
    const operation: AppendOperation = {
      type: 'append',
      content
    };
    
    const context: EditContext = {
      filepath,
      client: this.getClient()
    };
    
    const result = await this.appendStrategy.execute(operation, context);
    return this.formatResponse(result);
  }

  private async handleHeadingInsert(filepath: string, args: StructureEdit): Promise<ToolResponse> {
    if (!args.add || (!args.after && !args.before)) {
      return this.formatResponse({
        error: "Heading insert requires 'add' content and either 'after' or 'before' heading",
        example: { file: filepath, after: "Heading Name", add: "Your content" }
      });
    }

    const operation: HeadingInsertOperation = {
      type: 'heading-insert',
      position: args.after ? 'after' : 'before',
      heading: (args.after || args.before)!,
      content: args.add
    };

    const context: EditContext = {
      filepath,
      client: this.getClient()
    };

    const result = await this.headingInsertStrategy.execute(operation, context);
    return this.formatResponse(result);
  }

  private async handleReplace(filepath: string, find: string, replace: string): Promise<ToolResponse> {
    const operation: ReplaceOperation = {
      type: 'replace',
      find,
      replace
    };
    
    const context: EditContext = {
      filepath,
      client: this.getClient()
    };
    
    const result = await this.findReplaceStrategy.execute(operation, context);
    return this.formatResponse(result);
  }

  private async handleNewSection(filepath: string, args: NewSectionEdit): Promise<ToolResponse> {
    try {
      const client = this.getClient();
      const sectionTitle = args.new_section!;
      const sectionContent = args.content || "";
      const position = args.at || "end";
      
      // Build the new section
      const newSection = `\n## ${sectionTitle}\n${sectionContent}`;
      
      if (position === "end") {
        // Simple append for end position
        await client.appendContent(filepath, newSection, false);
      } else if (position === "start") {
        // Prepend to start
        const currentContent = await client.getFileContents(filepath);
        const newContent = newSection + "\n\n" + currentContent;
        await client.updateFile(filepath, newContent);
      } else {
        // Insert after specified heading
        await client.patchContent(filepath, newSection, {
          targetType: 'heading',
          target: position,
          insertAfter: true,
          createIfNotExists: false
        });
      }
      
      return this.formatResponse({
        success: true,
        message: `Successfully created section "${sectionTitle}" in ${filepath}`,
        operation: 'new_section',
        filepath,
        section: sectionTitle,
        position
      });
      
    } catch (error: unknown) {
      return this.formatResponse({
        error: `New section creation failed: ${error instanceof Error ? error.message : String(error)}`,
        working_alternative: {
          description: "Try appending the section to the end",
          example: { file: filepath, append: `\n## ${args.new_section}\n${args.content || ""}` }
        }
      });
    }
  }

  private async handleBatch(filepath: string, operations: BatchOperation[]): Promise<ToolResponse> {
    interface BatchResult {
      operation: number;
      result: ToolResponse | { error: string };
    }
    
    interface BatchError {
      operation: number;
      error: string;
      attempted: BatchOperation;
    }
    
    const results: BatchResult[] = [];
    const errors: BatchError[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      try {
        let result;
        
        if ((op.after || op.before) && op.add) {
          result = await this.handleHeadingInsert(filepath, { 
            after: op.after, 
            before: op.before, 
            add: op.add 
          });
        } else if (op.find && op.replace) {
          result = await this.handleReplace(filepath, op.find, op.replace);
        } else if (op.append) {
          result = await this.handleAppend(filepath, op.append);
        } else if (op.at === 'end' && op.add) {
          result = await this.handleAppend(filepath, op.add);
        } else {
          result = { error: `Unknown operation pattern in batch item ${i}` };
        }
        
        results.push({ operation: i, result });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ operation: i, error: errorMessage, attempted: op });
      }
    }
    
    return this.formatResponse({
      batch_results: {
        total_operations: operations.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Batch operation completed: ${results.length}/${operations.length} successful`
    });
  }
}