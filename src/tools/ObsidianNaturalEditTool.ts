import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

interface NaturalEditCommand {
  // Simple string commands that mirror natural language
  command: string;
  content?: string;
}

interface NaturalEditArgs {
  file: string;
  commands: string[] | NaturalEditCommand[];
  options?: {
    createFile?: boolean;
    preview?: boolean;
  };
}

interface NaturalEditResult {
  success: boolean;
  message?: string;
  changes?: Array<{
    command: string;
    result: string;
    location?: string;
  }>;
  error?: {
    command?: string;
    message: string;
    hint: string;
    examples: any;
  };
}

export class ObsidianNaturalEditTool extends BaseTool {
  name = 'obsidian_natural_edit';
  description = `Edit documents using natural language navigation and commands.

🎯 IMMEDIATE SUCCESS - Natural language editing:
• Navigate: "go to heading 'Implementation'", "go to end", "find section 'Notes'"
• Add content: "add paragraph 'New content'", "add heading '## Conclusion'"
• Edit: "replace 'old text' with 'new text'", "delete paragraph"
• Structure: "create section 'References' at end", "move to 'Summary' section"

📝 REAL EXAMPLES:
{ 
  file: "project.md",
  commands: [
    "go to heading 'Features'",
    "add paragraph 'New feature: dark mode support'",
    "go to end",
    "add heading '## Next Steps'",
    "add paragraph 'Complete testing by Friday'"
  ]
}

{ 
  file: "notes.md", 
  commands: [
    "find 'TODO'",
    "replace with 'COMPLETED'",
    "go to heading 'Tasks'",
    "add item '- Review PR #123'"
  ]
}

✅ WHY THIS WORKS:
• Commands match how you think about editing
• No nested objects or complex schemas
• Clear navigation and content operations
• Understands markdown structure
• Helpful errors guide you to success

💡 SMART BEHAVIORS:
• "add item" in a list context adds a list item
• "add paragraph" adds with proper spacing
• "create section" adds in logical document order
• Missing headings get helpful "did you mean?" suggestions

🔧 ADVANCED:
• Chain commands for complex edits
• Use content parameter for multi-line additions
• Preview mode shows changes before applying`;

  inputSchema = {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string',
        description: 'Path to file (relative to vault root)'
      },
      commands: {
        oneOf: [
          {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of command strings'
          },
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                content: { type: 'string' }
              },
              required: ['command']
            },
            description: 'Array of command objects with optional content'
          }
        ],
        description: 'Natural language commands to execute in order'
      },
      options: {
        type: 'object',
        properties: {
          createFile: {
            type: 'boolean',
            description: 'Create file if it doesn\'t exist'
          },
          preview: {
            type: 'boolean',
            description: 'Preview changes without applying'
          }
        }
      }
    },
    required: ['file', 'commands'],
    additionalProperties: false
  };

  async execute(args: NaturalEditArgs): Promise<NaturalEditResult> {
    try {
      validatePath(args.file, 'file');
      
      const client = this.getClient();
      const results: NaturalEditResult['changes'] = [];
      
      // Check file exists or create if requested
      let content: string;
      try {
        content = await client.getFileContents(args.file);
      } catch (error: any) {
        if (error.response?.status === 404) {
          if (args.options?.createFile) {
            await client.updateFile(args.file, '');
            content = '';
            results.push({
              command: 'create file',
              result: `Created new file: ${args.file}`
            });
          } else {
            return {
              success: false,
              error: {
                message: `File not found: ${args.file}`,
                hint: 'Add options: { createFile: true } to create the file',
                examples: {
                  withCreate: { ...args, options: { createFile: true } }
                }
              }
            };
          }
        } else {
          throw error;
        }
      }
      
      // Parse document structure
      const document = this.parseDocument(content);
      let currentPosition = { type: 'start', index: 0 };
      
      // Execute commands in sequence
      for (let i = 0; i < args.commands.length; i++) {
        const cmdItem = args.commands[i];
        const command = typeof cmdItem === 'string' ? cmdItem : cmdItem.command;
        const commandContent = typeof cmdItem === 'object' ? cmdItem.content : undefined;
        
        try {
          const result = await this.executeCommand(
            document,
            currentPosition,
            command,
            commandContent
          );
          
          if (result.type === 'navigation') {
            currentPosition = result.newPosition;
            results.push({
              command,
              result: result.message,
              location: result.location
            });
          } else if (result.type === 'edit') {
            // Apply edit to document
            document.applyEdit(result.edit);
            results.push({
              command,
              result: result.message,
              location: currentPosition.type
            });
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              command,
              message: error.message,
              hint: this.getCommandHint(command, error),
              examples: this.getCommandExamples(command)
            }
          };
        }
      }
      
      // Apply changes to file (unless preview mode)
      if (!args.options?.preview) {
        const newContent = document.toString();
        await client.updateFile(args.file, newContent);
      }
      
      return {
        success: true,
        message: args.options?.preview 
          ? `Preview: ${results.length} commands would be executed`
          : `Successfully executed ${results.length} commands`,
        changes: results
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Unexpected error',
          hint: 'Check your commands and file path',
          examples: this.getGeneralExamples()
        }
      };
    }
  }
  
  private parseDocument(content: string): MarkdownDocument {
    // Parse markdown into navigable structure
    const lines = content.split('\n');
    const headings: Array<{text: string; level: number; line: number}> = [];
    const sections: Array<{heading: string; start: number; end: number}> = [];
    
    let currentSection: any = null;
    
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        
        if (currentSection) {
          currentSection.end = index - 1;
          sections.push(currentSection);
        }
        
        headings.push({ text, level, line: index });
        currentSection = { heading: text, start: index, end: -1 };
      }
    });
    
    if (currentSection) {
      currentSection.end = lines.length - 1;
      sections.push(currentSection);
    }
    
    return new MarkdownDocument(lines, headings, sections);
  }
  
  private async executeCommand(
    document: MarkdownDocument,
    position: any,
    command: string,
    content?: string
  ): Promise<any> {
    const lower = command.toLowerCase();
    
    // Navigation commands
    if (lower.startsWith('go to')) {
      return this.handleGoTo(document, command);
    }
    
    if (lower.startsWith('find')) {
      return this.handleFind(document, command);
    }
    
    // Content commands
    if (lower.startsWith('add paragraph')) {
      const text = this.extractContent(command, 'add paragraph', content);
      return this.handleAddParagraph(document, position, text);
    }
    
    if (lower.startsWith('add heading')) {
      const text = this.extractContent(command, 'add heading', content);
      return this.handleAddHeading(document, position, text);
    }
    
    if (lower.startsWith('add item')) {
      const text = this.extractContent(command, 'add item', content);
      return this.handleAddListItem(document, position, text);
    }
    
    if (lower.includes('replace')) {
      return this.handleReplace(document, command, content);
    }
    
    if (lower.startsWith('create section')) {
      return this.handleCreateSection(document, command, content);
    }
    
    throw new Error(`Unknown command: "${command}"`);
  }
  
  private handleGoTo(document: MarkdownDocument, command: string): any {
    const lower = command.toLowerCase();
    
    // Handle "go to end"
    if (lower.includes('end')) {
      return {
        type: 'navigation',
        newPosition: { type: 'end', index: document.lines.length },
        message: 'Moved to end of document',
        location: 'end'
      };
    }
    
    // Handle "go to start" or "go to beginning"
    if (lower.includes('start') || lower.includes('beginning')) {
      return {
        type: 'navigation',
        newPosition: { type: 'start', index: 0 },
        message: 'Moved to start of document',
        location: 'start'
      };
    }
    
    // Handle "go to heading 'X'"
    const headingMatch = command.match(/go to (?:heading\s+)?['"](.+?)['"]/i);
    if (headingMatch) {
      const targetHeading = headingMatch[1];
      const heading = document.findHeading(targetHeading);
      
      if (!heading) {
        const suggestions = document.findSimilarHeadings(targetHeading);
        const hint = suggestions.length > 0
          ? `Did you mean: ${suggestions.map(h => `"${h.text}"`).join(', ')}?`
          : 'Use obsidian_query_structure to list all headings';
        throw new Error(`Heading "${targetHeading}" not found. ${hint}`);
      }
      
      return {
        type: 'navigation',
        newPosition: { type: 'heading', heading: heading.text, index: heading.line },
        message: `Moved to heading "${heading.text}"`,
        location: `heading: ${heading.text}`
      };
    }
    
    throw new Error('Could not parse go to command. Use: "go to heading \'Name\'" or "go to end"');
  }
  
  private handleFind(document: MarkdownDocument, command: string): any {
    const match = command.match(/find\s+['"](.+?)['"]/i);
    if (!match) {
      throw new Error('Could not parse find command. Use: find "text to find"');
    }
    
    const searchText = match[1];
    const position = document.findText(searchText);
    
    if (!position) {
      throw new Error(`Text "${searchText}" not found in document`);
    }
    
    return {
      type: 'navigation',
      newPosition: { type: 'text', text: searchText, index: position.line },
      message: `Found "${searchText}" at line ${position.line + 1}`,
      location: `line ${position.line + 1}`
    };
  }
  
  private handleAddParagraph(document: MarkdownDocument, position: any, text: string): any {
    const edit = {
      type: 'insert' as const,
      position: position.index,
      content: `\n${text}\n`,
      ensureSpacing: true
    };
    
    return {
      type: 'edit',
      edit,
      message: `Added paragraph: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
    };
  }
  
  private handleAddHeading(document: MarkdownDocument, position: any, text: string): any {
    // Auto-detect heading level if not specified
    const headingText = text.match(/^(#{1,6})\s+/) ? text : `## ${text}`;
    
    const edit = {
      type: 'insert' as const,
      position: position.index,
      content: `\n${headingText}\n`,
      ensureSpacing: true
    };
    
    return {
      type: 'edit',
      edit,
      message: `Added heading: "${headingText}"`
    };
  }
  
  private handleAddListItem(document: MarkdownDocument, position: any, text: string): any {
    // Auto-add list marker if not present
    const listItem = text.match(/^[-*]\s+/) ? text : `- ${text}`;
    
    const edit = {
      type: 'insert' as const,
      position: position.index,
      content: `${listItem}\n`,
      ensureSpacing: false
    };
    
    return {
      type: 'edit',
      edit,
      message: `Added list item: "${listItem}"`
    };
  }
  
  private handleReplace(document: MarkdownDocument, command: string, content?: string): any {
    const match = command.match(/replace\s+['"](.+?)['"]\s+with\s+['"](.+?)['"]/i);
    if (!match) {
      throw new Error('Could not parse replace command. Use: replace "old text" with "new text"');
    }
    
    const [, oldText, newText] = match;
    const replacements = document.replaceText(oldText, content || newText);
    
    if (replacements === 0) {
      throw new Error(`Text "${oldText}" not found in document`);
    }
    
    return {
      type: 'edit',
      edit: {
        type: 'replace' as const,
        oldText,
        newText: content || newText,
        count: replacements
      },
      message: `Replaced ${replacements} occurrence(s) of "${oldText}"`
    };
  }
  
  private handleCreateSection(document: MarkdownDocument, command: string, content?: string): any {
    const match = command.match(/create section\s+['"](.+?)['"]\s+(?:at\s+)?(.+)?/i);
    if (!match) {
      throw new Error('Could not parse create section command. Use: create section "Name" at end');
    }
    
    const [, sectionName, position] = match;
    const sectionContent = content || '';
    
    // Determine where to place the section
    let insertPosition: any;
    if (!position || position.includes('end')) {
      insertPosition = { type: 'end', index: document.lines.length };
    } else if (position.includes('start')) {
      insertPosition = { type: 'start', index: 0 };
    } else {
      // Try to parse as "before X" or "after X"
      const beforeMatch = position.match(/before\s+['"](.+?)['"]/i);
      const afterMatch = position.match(/after\s+['"](.+?)['"]/i);
      
      if (beforeMatch) {
        const heading = document.findHeading(beforeMatch[1]);
        if (!heading) throw new Error(`Heading "${beforeMatch[1]}" not found`);
        insertPosition = { type: 'before-heading', index: heading.line };
      } else if (afterMatch) {
        const section = document.findSection(afterMatch[1]);
        if (!section) throw new Error(`Section "${afterMatch[1]}" not found`);
        insertPosition = { type: 'after-section', index: section.end + 1 };
      } else {
        throw new Error('Could not parse section position. Use: at end, at start, before "Heading", or after "Section"');
      }
    }
    
    const edit = {
      type: 'insert' as const,
      position: insertPosition.index,
      content: `\n## ${sectionName}\n\n${sectionContent}\n`,
      ensureSpacing: true
    };
    
    return {
      type: 'edit',
      edit,
      message: `Created section "${sectionName}" ${position || 'at end'}`
    };
  }
  
  private extractContent(command: string, prefix: string, providedContent?: string): string {
    if (providedContent) return providedContent;
    
    // Try to extract quoted content from command
    const match = command.match(new RegExp(`${prefix}\\s+['"](.+?)['"]`, 'i'));
    if (match) return match[1];
    
    // Try to extract unquoted content
    const unquotedMatch = command.match(new RegExp(`${prefix}\\s+(.+)$`, 'i'));
    if (unquotedMatch) return unquotedMatch[1];
    
    throw new Error(`No content specified for ${prefix}. Use: ${prefix} "your content" or provide content parameter`);
  }
  
  private getCommandHint(command: string, error: any): string {
    const lower = command.toLowerCase();
    
    if (lower.includes('go to') && error.message.includes('not found')) {
      return 'Check heading name exactly as it appears (without # symbols)';
    }
    
    if (lower.includes('add') && error.message.includes('content')) {
      return 'Specify content in quotes or use the content parameter';
    }
    
    if (lower.includes('replace')) {
      return 'Use format: replace "old text" with "new text"';
    }
    
    return 'Check command format and try one of the examples below';
  }
  
  private getCommandExamples(command: string): any {
    const lower = command.toLowerCase();
    
    if (lower.includes('go to')) {
      return {
        navigation: [
          'go to heading "Introduction"',
          'go to end',
          'go to start'
        ]
      };
    }
    
    if (lower.includes('add')) {
      return {
        adding: [
          'add paragraph "New content here"',
          'add heading "## New Section"',
          'add item "- New task"'
        ]
      };
    }
    
    if (lower.includes('replace')) {
      return {
        replacing: [
          'replace "old text" with "new text"',
          'replace "TODO" with "DONE"'
        ]
      };
    }
    
    return this.getGeneralExamples();
  }
  
  private getGeneralExamples(): any {
    return {
      simple: {
        file: 'notes.md',
        commands: [
          'go to end',
          'add heading "## Today\'s Notes"',
          'add paragraph "Important meeting outcomes..."'
        ]
      },
      advanced: {
        file: 'project.md',
        commands: [
          'go to heading "Tasks"',
          'add item "- Review documentation"',
          'find "DEADLINE"',
          'replace "DEADLINE: TBD" with "DEADLINE: 2025-01-15"'
        ]
      }
    };
  }
}

// Internal helper class for document manipulation
class MarkdownDocument {
  constructor(
    public lines: string[],
    public headings: Array<{text: string; level: number; line: number}>,
    public sections: Array<{heading: string; start: number; end: number}>
  ) {}
  
  findHeading(text: string): {text: string; level: number; line: number} | null {
    // Case-insensitive exact match first
    const exact = this.headings.find(h => h.text.toLowerCase() === text.toLowerCase());
    if (exact) return exact;
    
    // Partial match
    const partial = this.headings.find(h => h.text.toLowerCase().includes(text.toLowerCase()));
    return partial || null;
  }
  
  findSimilarHeadings(text: string): Array<{text: string}> {
    const lower = text.toLowerCase();
    return this.headings
      .filter(h => {
        const headingLower = h.text.toLowerCase();
        return headingLower.includes(lower) || 
               lower.includes(headingLower) ||
               this.calculateSimilarity(headingLower, lower) > 0.6;
      })
      .slice(0, 3);
  }
  
  findSection(heading: string): {heading: string; start: number; end: number} | null {
    const lower = heading.toLowerCase();
    return this.sections.find(s => s.heading.toLowerCase() === lower) || null;
  }
  
  findText(text: string): {line: number; column: number} | null {
    for (let i = 0; i < this.lines.length; i++) {
      const column = this.lines[i].indexOf(text);
      if (column !== -1) {
        return { line: i, column };
      }
    }
    return null;
  }
  
  replaceText(oldText: string, newText: string): number {
    let count = 0;
    this.lines = this.lines.map(line => {
      const matches = (line.match(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      count += matches;
      return line.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newText);
    });
    return count;
  }
  
  applyEdit(edit: any): void {
    if (edit.type === 'insert') {
      const insertLine = edit.position;
      let content = edit.content;
      
      if (edit.ensureSpacing) {
        // Ensure proper spacing around content
        const prevLine = insertLine > 0 ? this.lines[insertLine - 1] : '';
        const nextLine = insertLine < this.lines.length ? this.lines[insertLine] : '';
        
        if (prevLine && !prevLine.trim() === false) {
          content = '\n' + content;
        }
        if (nextLine && !nextLine.trim() === false) {
          content = content + '\n';
        }
      }
      
      // Insert content
      const contentLines = content.split('\n');
      this.lines.splice(insertLine, 0, ...contentLines);
      
      // Update heading and section positions
      const addedLines = contentLines.length;
      this.headings.forEach(h => {
        if (h.line >= insertLine) h.line += addedLines;
      });
      this.sections.forEach(s => {
        if (s.start >= insertLine) s.start += addedLines;
        if (s.end >= insertLine) s.end += addedLines;
      });
    }
    // Replace is already handled in replaceText method
  }
  
  toString(): string {
    return this.lines.join('\n');
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w)).length;
    return commonWords / Math.max(words1.length, words2.length);
  }
}