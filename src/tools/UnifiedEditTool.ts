import { BaseTool, ToolResponse, ToolMetadata } from './base.js';
import { AppendStrategy } from './strategies/AppendStrategy.js';
import { FindReplaceStrategy } from './strategies/FindReplaceStrategy.js';
import { HeadingInsertStrategy } from './strategies/HeadingInsertStrategy.js';
import { SectionEditStrategy } from './strategies/SectionEditStrategy.js';
import { BatchEditStrategy } from './strategies/BatchEditStrategy.js';
import { 
  IEditStrategy, 
  EditContext, 
  AppendOperation, 
  ReplaceOperation, 
  HeadingInsertOperation, 
  NewSectionOperation,
  BatchOperation
} from './strategies/IEditStrategy.js';
import { UnifiedEditArgs, BatchOperationInput } from './types/UnifiedEditArgs.js';


export class UnifiedEditTool extends BaseTool<UnifiedEditArgs> {
  name = 'obsidian_edit';
  description = 'Edit Obsidian vault notes with smart operations. Supports append, find/replace, and heading-based insertions.';
  
  private strategies: Map<string, IEditStrategy>;

  constructor() {
    super();
    
    // Initialize strategies
    const appendStrategy = new AppendStrategy();
    const findReplaceStrategy = new FindReplaceStrategy();
    const headingInsertStrategy = new HeadingInsertStrategy();
    const sectionEditStrategy = new SectionEditStrategy();
    
    // Create batch strategy with dependencies
    const batchStrategy = new BatchEditStrategy(
      appendStrategy,
      findReplaceStrategy,
      headingInsertStrategy
    );
    
    // Store strategies by operation type
    this.strategies = new Map<string, IEditStrategy>([
      ['append', appendStrategy],
      ['replace', findReplaceStrategy],
      ['heading-insert', headingInsertStrategy],
      ['new-section', sectionEditStrategy],
      ['batch', batchStrategy]
    ]);
  }

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
            at: { type: 'string' as const },
            append: { type: 'string' as const }
          }
        }
      }
    },
    required: ['file']
  };

  async executeTyped(args: UnifiedEditArgs): Promise<ToolResponse> {
    try {
      const context: EditContext = {
        filepath: args.file,
        client: this.getClient()
      };

      // Determine operation and execute with appropriate strategy
      const operation = this.parseOperation(args);
      if (!operation) {
        return this.formatResponse({
          error: "No valid operation specified",
          examples: {
            simple_append: { file: args.file, append: "your text here" },
            after_heading: { file: args.file, after: "Heading Name", add: "your content" },
            replace_text: { file: args.file, find: "old text", replace: "new text" }
          },
          help: "Use one of the patterns above. For questions, check the tool description."
        });
      }

      const strategy = this.strategies.get(operation.type);
      if (!strategy) {
        return this.formatResponse({
          error: `No strategy available for operation type: ${operation.type}`
        });
      }

      const result = await strategy.execute(operation, context);
      return this.formatResponse(result);
      
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  private parseOperation(args: UnifiedEditArgs): AppendOperation | ReplaceOperation | HeadingInsertOperation | NewSectionOperation | BatchOperation | null {
    // Simple append
    if ('append' in args && args.append !== undefined) {
      return {
        type: 'append',
        content: args.append
      };
    }
    
    // Structure-aware operations
    if (('after' in args || 'before' in args) && 'add' in args && args.add) {
      return {
        type: 'heading-insert',
        position: args.after ? 'after' : 'before',
        heading: (args.after || args.before)!,
        content: args.add
      };
    }
    
    // Text replacement
    if ('find' in args && 'replace' in args && args.find && args.replace) {
      return {
        type: 'replace',
        find: args.find,
        replace: args.replace
      };
    }
    
    // New section
    if ('new_section' in args && args.new_section) {
      return {
        type: 'new-section',
        title: args.new_section,
        at: args.at || 'end',
        content: args.content
      };
    }
    
    // Batch operations
    if ('batch' in args && args.batch && args.batch.length > 0) {
      const operations = args.batch.map(op => this.parseBatchOperation(op)).filter(op => op !== null);
      
      if (operations.length === 0) {
        return null;
      }
      
      return {
        type: 'batch',
        operations: operations as (AppendOperation | ReplaceOperation | HeadingInsertOperation)[]
      };
    }
    
    return null;
  }

  private parseBatchOperation(op: BatchOperationInput): AppendOperation | ReplaceOperation | HeadingInsertOperation | null {
    // Heading insert
    if ((op.after || op.before) && op.add) {
      return {
        type: 'heading-insert',
        position: op.after ? 'after' : 'before',
        heading: (op.after || op.before)!,
        content: op.add
      };
    }
    
    // Find/replace
    if (op.find && op.replace) {
      return {
        type: 'replace',
        find: op.find,
        replace: op.replace
      };
    }
    
    // Append
    if (op.append) {
      return {
        type: 'append',
        content: op.append
      };
    }
    
    // Special case: at='end' with add content
    if (op.at === 'end' && op.add) {
      return {
        type: 'append',
        content: op.add
      };
    }
    
    return null;
  }
}