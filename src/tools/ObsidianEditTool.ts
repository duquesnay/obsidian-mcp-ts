import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

interface EditArgs {
  file: string;
  
  // Level 1: Dead simple operations (handles 95% of cases)
  append?: string;
  prepend?: string;
  add?: string;  // alias for append
  
  // Level 2: Positioned operations 
  addAfter?: string;  // heading name
  addBefore?: string; // heading name
  text?: string;      // content for addAfter/addBefore
  
  // Level 3: Replace operations
  find?: string;
  replace?: string;
  
  // Level 4: Natural language instructions
  do?: string;        // "add section at end", "replace X with Y", etc.
  content?: string;   // content for natural language operations
  
  // Options
  createFile?: boolean;
}

interface EditResult {
  success: boolean;
  message?: string;
  error?: string;
  hint?: string;
  examples?: any;
}

export class ObsidianEditTool extends BaseTool {
  name = 'obsidian_edit';
  description = `The "just works" editing tool that understands your intent.

🎯 EXAMPLES - Copy and paste these:
• Add to end: { file: "notes.md", add: "New content here" }
• Add after heading: { file: "doc.md", addAfter: "Introduction", text: "New paragraph" }
• Find and replace: { file: "notes.md", find: "old text", replace: "new text" }
• Add to start: { file: "notes.md", prepend: "## Summary\\nOverview..." }
• Natural language: { file: "notes.md", do: "add conclusion at end", content: "Final thoughts..." }

✅ SIMPLE PRINCIPLES:
• Uses "file" not "filepath" (shorter, clearer)
• Accepts many parameter combinations
• Automatically figures out what you want
• Never requires nested objects
• Always gives helpful errors

🔧 SMART BEHAVIOR:
• "append" and "add" do the same thing
• "text" works with "addAfter" and "addBefore"
• "content" works with "do" instructions
• Missing headings get helpful suggestions
• Creates files when needed (with createFile: true)

💡 TIP: This tool is designed to work on first try. If it doesn't, the error will show you exactly what to fix.`;

  inputSchema = {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string',
        description: 'Path to the file (relative to vault root)'
      },
      append: {
        type: 'string', 
        description: 'Add text to the end of the file'
      },
      add: {
        type: 'string',
        description: 'Add text to the end of the file (same as append)'
      },
      prepend: {
        type: 'string',
        description: 'Add text to the beginning of the file'
      },
      addAfter: {
        type: 'string',
        description: 'Heading name to add content after (use with "text")'
      },
      addBefore: {
        type: 'string', 
        description: 'Heading name to add content before (use with "text")'
      },
      text: {
        type: 'string',
        description: 'Content to add when using addAfter or addBefore'
      },
      find: {
        type: 'string',
        description: 'Text to find and replace (use with "replace")'
      },
      replace: {
        type: 'string',
        description: 'Replacement text (use with "find")'
      },
      do: {
        type: 'string',
        description: 'Natural language instruction: "add section at end", "replace X with Y", etc.'
      },
      content: {
        type: 'string',
        description: 'Content for natural language operations'
      },
      createFile: {
        type: 'boolean',
        description: 'Create the file if it doesn\'t exist'
      }
    },
    required: ['file'],
    additionalProperties: false
  };

  async execute(args: EditArgs): Promise<EditResult> {
    try {
      // Validate file path
      validatePath(args.file, 'file');
      
      const client = this.getClient();
      
      // Check if file exists
      let fileExists = true;
      try {
        await client.getFileContents(args.file);
      } catch (error: any) {
        if (error.response?.status === 404) {
          fileExists = false;
        } else {
          throw error;
        }
      }
      
      // Handle file creation
      if (!fileExists) {
        if (args.createFile) {
          await client.updateFile(args.file, '');
          console.log(`Created new file: ${args.file}`);
        } else {
          return {
            success: false,
            error: `File not found: ${args.file}`,
            hint: `Add createFile: true to create the file, or check the path`,
            examples: {
              createFile: { ...args, createFile: true },
              checkPath: { file: args.file.replace(/\\/g, '/') }
            }
          };
        }
      }
      
      // Detect operation intent
      const operation = this.detectIntent(args);
      
      if (!operation) {
        return {
          success: false,
          error: 'No operation detected',
          hint: 'Specify what you want to do',
          examples: {
            addToEnd: { file: args.file, add: 'Your text here' },
            addAfterHeading: { file: args.file, addAfter: 'Heading Name', text: 'Your text here' },
            findReplace: { file: args.file, find: 'old', replace: 'new' },
            natural: { file: args.file, do: 'add conclusion at end', content: 'Final thoughts' }
          }
        };
      }
      
      // Execute the operation
      return await this.executeOperation(client, args.file, operation);
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unexpected error',
        hint: this.getErrorHint(error, args),
        examples: this.getErrorExamples(args)
      };
    }
  }
  
  private detectIntent(args: EditArgs): { type: string; data: any } | null {
    // Check for append/add operations
    if (args.append || args.add) {
      return {
        type: 'append',
        data: { content: args.append || args.add }
      };
    }
    
    // Check for prepend
    if (args.prepend) {
      return {
        type: 'prepend', 
        data: { content: args.prepend }
      };
    }
    
    // Check for positioned operations
    if (args.addAfter && args.text) {
      return {
        type: 'insertAfterHeading',
        data: { heading: args.addAfter, content: args.text }
      };
    }
    
    if (args.addBefore && args.text) {
      return {
        type: 'insertBeforeHeading',
        data: { heading: args.addBefore, content: args.text }
      };
    }
    
    // Check for replace
    if (args.find && args.replace) {
      return {
        type: 'replace',
        data: { find: args.find, replace: args.replace }
      };
    }
    
    // Check for natural language instructions
    if (args.do) {
      return this.parseNaturalLanguage(args.do, args.content);
    }
    
    // Check for incomplete operations and suggest fixes
    if (args.addAfter && !args.text) {
      throw new Error('Missing "text" parameter. Use: { addAfter: "Heading", text: "content" }');
    }
    
    if (args.addBefore && !args.text) {
      throw new Error('Missing "text" parameter. Use: { addBefore: "Heading", text: "content" }');
    }
    
    if (args.find && !args.replace) {
      throw new Error('Missing "replace" parameter. Use: { find: "old", replace: "new" }');
    }
    
    if (args.replace && !args.find) {
      throw new Error('Missing "find" parameter. Use: { find: "old", replace: "new" }');
    }
    
    return null;
  }
  
  private parseNaturalLanguage(instruction: string, content?: string): { type: string; data: any } | null {
    const lower = instruction.toLowerCase();
    
    // Parse "add X at end" or "add X to end"
    if (lower.includes('add') && (lower.includes('at end') || lower.includes('to end') || lower.includes('at the end'))) {
      return {
        type: 'append',
        data: { content: content || 'Content not specified' }
      };
    }
    
    // Parse "add X at start" or "add X to beginning"
    if (lower.includes('add') && (lower.includes('at start') || lower.includes('to start') || lower.includes('at beginning') || lower.includes('to beginning'))) {
      return {
        type: 'prepend',
        data: { content: content || 'Content not specified' }
      };
    }
    
    // Parse "add X after Y" or "insert X after Y"
    const afterMatch = lower.match(/(?:add|insert)\s+.*?\s+after\s+(.+)/);
    if (afterMatch) {
      return {
        type: 'insertAfterHeading',
        data: { heading: afterMatch[1].trim(), content: content || 'Content not specified' }
      };
    }
    
    // Parse "add X before Y" or "insert X before Y"
    const beforeMatch = lower.match(/(?:add|insert)\s+.*?\s+before\s+(.+)/);
    if (beforeMatch) {
      return {
        type: 'insertBeforeHeading',
        data: { heading: beforeMatch[1].trim(), content: content || 'Content not specified' }
      };
    }
    
    // Parse "replace X with Y"
    const replaceMatch = lower.match(/replace\s+(.+?)\s+with\s+(.+)/);
    if (replaceMatch) {
      return {
        type: 'replace',
        data: { find: replaceMatch[1].trim(), replace: replaceMatch[2].trim() }
      };
    }
    
    // Parse "change X to Y"
    const changeMatch = lower.match(/change\s+(.+?)\s+to\s+(.+)/);
    if (changeMatch) {
      return {
        type: 'replace',
        data: { find: changeMatch[1].trim(), replace: changeMatch[2].trim() }
      };
    }
    
    // If we can't parse it, return null and let the error handler give suggestions
    return null;
  }
  
  private async executeOperation(client: any, file: string, operation: { type: string; data: any }): Promise<EditResult> {
    switch (operation.type) {
      case 'append':
        return await this.handleAppend(client, file, operation.data.content);
        
      case 'prepend':
        return await this.handlePrepend(client, file, operation.data.content);
        
      case 'insertAfterHeading':
        return await this.handleInsertAfterHeading(client, file, operation.data.heading, operation.data.content);
        
      case 'insertBeforeHeading':
        return await this.handleInsertBeforeHeading(client, file, operation.data.heading, operation.data.content);
        
      case 'replace':
        return await this.handleReplace(client, file, operation.data.find, operation.data.replace);
        
      default:
        return {
          success: false,
          error: `Unknown operation type: ${operation.type}`,
          hint: 'This should not happen. Please report this as a bug.'
        };
    }
  }
  
  private async handleAppend(client: any, file: string, content: string): Promise<EditResult> {
    try {
      const currentContent = await client.getFileContents(file);
      const newContent = currentContent + (currentContent.endsWith('\n') ? '' : '\n') + content;
      await client.updateFile(file, newContent);
      
      return {
        success: true,
        message: `Added content to end of ${file}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to append: ${error.message}`,
        hint: 'Check file permissions and that Obsidian is running'
      };
    }
  }
  
  private async handlePrepend(client: any, file: string, content: string): Promise<EditResult> {
    try {
      const currentContent = await client.getFileContents(file);
      const newContent = content + '\n' + currentContent;
      await client.updateFile(file, newContent);
      
      return {
        success: true,
        message: `Added content to beginning of ${file}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to prepend: ${error.message}`,
        hint: 'Check file permissions and that Obsidian is running'
      };
    }
  }
  
  private async handleInsertAfterHeading(client: any, file: string, heading: string, content: string): Promise<EditResult> {
    try {
      // Use the patch API for heading operations
      await client.patchContent(file, content, {
        targetType: 'heading',
        target: heading,
        insertAfter: true
      });
      
      return {
        success: true,
        message: `Added content after heading "${heading}" in ${file}`
      };
    } catch (error: any) {
      // If heading not found, provide helpful suggestions
      if (error.message?.toLowerCase().includes('not found')) {
        return {
          success: false,
          error: `Heading "${heading}" not found`,
          hint: 'Check the heading name (without # symbols) and spelling',
          examples: {
            correctFormat: { file, addAfter: 'Introduction', text: 'Your content' },
            incorrectFormat: { file, addAfter: '# Introduction', text: 'Your content' },
            listHeadings: { tool: 'obsidian_query_structure', args: { filepath: file, query: { type: 'headings' } } }
          }
        };
      }
      
      return {
        success: false,
        error: `Failed to insert after heading: ${error.message}`,
        hint: 'Ensure the heading exists and is spelled correctly'
      };
    }
  }
  
  private async handleInsertBeforeHeading(client: any, file: string, heading: string, content: string): Promise<EditResult> {
    try {
      await client.patchContent(file, content, {
        targetType: 'heading',
        target: heading,
        insertBefore: true
      });
      
      return {
        success: true,
        message: `Added content before heading "${heading}" in ${file}`
      };
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('not found')) {
        return {
          success: false,
          error: `Heading "${heading}" not found`,
          hint: 'Check the heading name (without # symbols) and spelling',
          examples: {
            correctFormat: { file, addBefore: 'Introduction', text: 'Your content' },
            incorrectFormat: { file, addBefore: '# Introduction', text: 'Your content' },
            listHeadings: { tool: 'obsidian_query_structure', args: { filepath: file, query: { type: 'headings' } } }
          }
        };
      }
      
      return {
        success: false,
        error: `Failed to insert before heading: ${error.message}`,
        hint: 'Ensure the heading exists and is spelled correctly'
      };
    }
  }
  
  private async handleReplace(client: any, file: string, find: string, replace: string): Promise<EditResult> {
    try {
      const content = await client.getFileContents(file);
      
      if (!content.includes(find)) {
        return {
          success: false,
          error: `Text "${find}" not found in ${file}`,
          hint: 'Check the exact text to replace, including spacing and punctuation',
          examples: {
            suggestion: 'Use obsidian_simple_search to find similar text first',
            caseSensitive: { file, find: find.toLowerCase(), replace }
          }
        };
      }
      
      const newContent = content.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
      const count = (content.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      await client.updateFile(file, newContent);
      
      return {
        success: true,
        message: `Replaced ${count} occurrence(s) of "${find}" with "${replace}" in ${file}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to replace text: ${error.message}`,
        hint: 'Check that the text exists and try exact text matching'
      };
    }
  }
  
  private getErrorHint(error: any, args: EditArgs): string {
    if (error.message?.includes('ECONNREFUSED')) {
      return 'Check that Obsidian is running and the Local REST API plugin is enabled';
    }
    
    if (error.message?.includes('not found')) {
      return 'Check the file path and ensure it exists in your vault';
    }
    
    if (error.message?.includes('Missing')) {
      return 'You\'re missing a required parameter. See the examples for the correct format.';
    }
    
    return 'Try one of the working examples below';
  }
  
  private getErrorExamples(args: EditArgs): any {
    return {
      basicUsage: {
        append: { file: args.file || 'notes.md', add: 'Text to add' },
        heading: { file: args.file || 'notes.md', addAfter: 'Introduction', text: 'New content' },
        replace: { file: args.file || 'notes.md', find: 'old', replace: 'new' }
      },
      naturalLanguage: {
        append: { file: args.file || 'notes.md', do: 'add conclusion at end', content: 'Final thoughts' },
        heading: { file: args.file || 'notes.md', do: 'add section after introduction', content: 'New section' }
      }
    };
  }
}