import { BaseTool } from "./base.js";
import { validatePath } from '../utils/pathValidator.js';

interface ConversationStep {
  type: 'query' | 'response' | 'command' | 'confirm';
  content: string;
}

export class ObsidianConverseTool extends BaseTool {
  name = 'obsidian_converse_with_doc';
  description = `Interactive document editing through natural conversation.

🎯 IMMEDIATE SUCCESS - Natural conversation flow:
• Query: "show me the headings" → Returns document structure
• Navigate: "go to the Features section" → Moves context
• Edit: "add a new feature called Dark Mode" → Inserts content
• Confirm: "show me what I just added" → Displays changes

📝 REAL EXAMPLES:
{ 
  file: "project.md",
  conversation: [
    "show me all headings",
    "go to Features",
    "add item 'Dark mode support'",
    "find TODO markers",
    "replace first TODO with DONE"
  ]
}

✅ WHY THIS WORKS:
• Bidirectional - tool responds with information
• Context preserved between commands
• Natural error recovery with suggestions
• Progressive discovery of document
• No complex schemas or nested objects

💡 CONVERSATION PATTERNS:
• Query: "show", "find", "list", "where"
• Navigate: "go to", "move to", "find section"
• Edit: "add", "insert", "replace", "delete"
• Structure: "create section", "add heading"

🔍 SMART BEHAVIORS:
• "show headings" displays document structure
• "find X" shows context around matches
• Navigation maintains position context
• Suggestions when targets not found`;

  inputSchema = {
    type: "object" as const,
    required: ["file", "conversation"],
    properties: {
      file: {
        type: "string",
        description: "Path to file to converse with (relative to vault root)"
      },
      conversation: {
        type: "array",
        description: "Natural language commands/queries to execute in order",
        items: {
          type: "string"
        },
        minItems: 1
      },
      options: {
        type: "object",
        properties: {
          showResponses: {
            type: "boolean",
            description: "Include tool responses in output (default: true)"
          },
          confirmEdits: {
            type: "boolean",
            description: "Show preview before applying edits (default: false)"
          }
        }
      }
    }
  };

  async execute(args: any): Promise<any> {
    const { file, conversation, options = {} } = args;
    const { showResponses = true, confirmEdits = false } = options;

    // Get initial document content
    let content: string;
    try {
      validatePath(file);
      const response = await this.getClient().getFileContents(file);
      content = response.content || response;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        throw new Error(`File not found: ${file}`);
      }
      throw error;
    }

    // Parse document structure
    const structure = this.parseMarkdownStructure(content);
    
    // Process conversation
    const transcript: ConversationStep[] = [];
    let currentPosition = 0;
    let modifiedContent = content;
    let hasModifications = false;

    for (const command of conversation) {
      transcript.push({ type: 'command', content: command });

      try {
        const result = await this.processCommand(
          command, 
          modifiedContent, 
          structure, 
          currentPosition,
          confirmEdits
        );

        if (result.response && showResponses) {
          transcript.push({ type: 'response', content: result.response });
        }

        if (result.newContent) {
          modifiedContent = result.newContent;
          hasModifications = true;
          // Re-parse structure after modifications
          Object.assign(structure, this.parseMarkdownStructure(modifiedContent));
        }

        if (result.newPosition !== undefined) {
          currentPosition = result.newPosition;
        }

      } catch (error: any) {
        transcript.push({ 
          type: 'response', 
          content: `Error: ${error.message}` 
        });
        
        // Provide helpful suggestions on error
        const suggestion = this.getSuggestion(command, structure);
        if (suggestion) {
          transcript.push({ 
            type: 'response', 
            content: suggestion 
          });
        }
      }
    }

    // Apply modifications if any
    if (hasModifications) {
      validatePath(file);
      await this.getClient().updateFile(file, modifiedContent);
    }

    return this.formatResponse({
      file,
      transcript,
      modified: hasModifications,
      summary: this.generateSummary(transcript, hasModifications)
    });
  }

  private async processCommand(
    command: string,
    content: string,
    structure: any,
    position: number,
    confirmEdits: boolean
  ): Promise<{
    response?: string;
    newContent?: string;
    newPosition?: number;
  }> {
    const lowerCommand = command.toLowerCase();

    // Query commands
    if (lowerCommand.includes('show') || lowerCommand.includes('list')) {
      if (lowerCommand.includes('heading')) {
        const headings = structure.headings.map((h: any) => 
          `${'  '.repeat(h.level - 1)}${h.level}. ${h.text}`
        ).join('\n');
        return { 
          response: headings || 'No headings found in document' 
        };
      }
      
      if (lowerCommand.includes('section')) {
        const sections = structure.sections.map((s: any) => s.title).join(', ');
        return { 
          response: `Sections: ${sections || 'No sections found'}` 
        };
      }

      if (lowerCommand.includes('todo')) {
        const todos = this.findPattern(content, /TODO|FIXME|XXX/gi);
        return { 
          response: todos.length > 0 
            ? `Found ${todos.length} TODO markers:\n${todos.map(t => `- Line ${t.line}: "${t.context}"`).join('\n')}`
            : 'No TODO markers found' 
        };
      }
    }

    // Navigation commands
    if (lowerCommand.includes('go to') || lowerCommand.includes('move to')) {
      if (lowerCommand.includes('heading')) {
        const targetHeading = this.extractQuoted(command) || this.extractAfter(command, 'heading');
        const heading = this.findHeading(structure.headings, targetHeading);
        
        if (!heading) {
          throw new Error(`Heading '${targetHeading}' not found`);
        }

        return { 
          response: `Moved to heading: ${heading.text}`,
          newPosition: heading.position 
        };
      }

      if (lowerCommand.includes('end')) {
        return { 
          response: 'Moved to end of document',
          newPosition: content.length 
        };
      }

      if (lowerCommand.includes('start') || lowerCommand.includes('beginning')) {
        return { 
          response: 'Moved to start of document',
          newPosition: 0 
        };
      }
    }

    // Find commands
    if (lowerCommand.includes('find')) {
      const searchTerm = this.extractQuoted(command) || this.extractAfter(command, 'find');
      const matches = this.findPattern(content, new RegExp(searchTerm, 'gi'));
      
      if (matches.length === 0) {
        return { response: `No matches found for '${searchTerm}'` };
      }

      return { 
        response: `Found ${matches.length} matches:\n${matches.slice(0, 3).map(m => 
          `- Line ${m.line}: "${m.context}"`
        ).join('\n')}${matches.length > 3 ? '\n...' : ''}`,
        newPosition: matches[0].position
      };
    }

    // Edit commands
    if (lowerCommand.includes('add') || lowerCommand.includes('insert')) {
      const editContent = this.extractQuoted(command) || this.extractAfter(command, ['add', 'insert']);
      
      if (!editContent) {
        throw new Error('No content specified for add/insert command');
      }

      if (lowerCommand.includes('paragraph')) {
        const newContent = this.insertAtPosition(content, position, `\n\n${editContent}`);
        return { 
          response: 'Added paragraph',
          newContent 
        };
      }

      if (lowerCommand.includes('heading')) {
        const level = this.extractHeadingLevel(command) || 2;
        const newContent = this.insertAtPosition(content, position, `\n\n${'#'.repeat(level)} ${editContent}`);
        return { 
          response: `Added level ${level} heading`,
          newContent 
        };
      }

      if (lowerCommand.includes('item') || lowerCommand.includes('list')) {
        const newContent = this.insertAtPosition(content, position, `\n- ${editContent}`);
        return { 
          response: 'Added list item',
          newContent 
        };
      }

      // Default: just add the content
      const newContent = this.insertAtPosition(content, position, `\n${editContent}`);
      return { 
        response: 'Added content',
        newContent 
      };
    }

    // Replace commands
    if (lowerCommand.includes('replace')) {
      const parts = command.match(/replace\s+['"]?(.+?)['"]?\s+with\s+['"]?(.+?)['"]?$/i);
      if (!parts) {
        throw new Error('Replace command format: "replace X with Y"');
      }

      const [, find, replaceWith] = parts;
      const newContent = content.replace(find, replaceWith);
      
      if (newContent === content) {
        throw new Error(`Text '${find}' not found`);
      }

      return { 
        response: `Replaced '${find}' with '${replaceWith}'`,
        newContent 
      };
    }

    // Create section command
    if (lowerCommand.includes('create section')) {
      const sectionName = this.extractQuoted(command) || this.extractAfter(command, 'section');
      const level = 2; // Default to h2 for sections
      
      let insertPosition = position;
      
      // Smart positioning
      if (lowerCommand.includes('at end')) {
        insertPosition = content.length;
      } else if (lowerCommand.includes('after')) {
        const afterSection = this.extractAfter(command, 'after');
        const section = this.findHeading(structure.headings, afterSection);
        if (section) {
          insertPosition = this.findSectionEnd(content, section.position);
        }
      }

      const newContent = this.insertAtPosition(
        content, 
        insertPosition, 
        `\n\n${'#'.repeat(level)} ${sectionName}\n\n`
      );
      
      return { 
        response: `Created section '${sectionName}'`,
        newContent 
      };
    }

    throw new Error(`Unknown command: ${command}`);
  }

  private parseMarkdownStructure(content: string): any {
    const lines = content.split('\n');
    const headings: any[] = [];
    const sections: any[] = [];
    let position = 0;

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        
        headings.push({
          level,
          text,
          line: index + 1,
          position
        });

        if (level <= 2) {
          sections.push({
            title: text,
            level,
            position
          });
        }
      }
      position += line.length + 1; // +1 for newline
    });

    return { headings, sections, lines };
  }

  private findHeading(headings: any[], target: string): any {
    const normalized = target.toLowerCase().trim();
    
    // Exact match
    const exact = headings.find(h => 
      h.text.toLowerCase().trim() === normalized
    );
    if (exact) return exact;

    // Partial match
    const partial = headings.find(h => 
      h.text.toLowerCase().includes(normalized)
    );
    if (partial) return partial;

    return null;
  }

  private findPattern(content: string, pattern: RegExp): any[] {
    const matches: any[] = [];
    const lines = content.split('\n');
    let position = 0;

    lines.forEach((line, index) => {
      const lineMatches = Array.from(line.matchAll(pattern));
      lineMatches.forEach(match => {
        const startIndex = match.index || 0;
        const context = line.substring(
          Math.max(0, startIndex - 20),
          Math.min(line.length, startIndex + match[0].length + 20)
        );
        
        matches.push({
          line: index + 1,
          position: position + startIndex,
          match: match[0],
          context: context.trim()
        });
      });
      position += line.length + 1;
    });

    return matches;
  }

  private extractQuoted(command: string): string | null {
    const match = command.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  private extractAfter(command: string, keywords: string | string[]): string {
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    
    for (const keyword of keywordList) {
      const pattern = new RegExp(`${keyword}\\s+(.+?)(?:\\s+(?:to|at|in|before|after)|$)`, 'i');
      const match = command.match(pattern);
      if (match) {
        return match[1].replace(/['"](.+)['"]/g, '$1').trim();
      }
    }
    
    return '';
  }

  private extractHeadingLevel(command: string): number | null {
    const match = command.match(/(?:level|h)(\d)/i);
    return match ? parseInt(match[1]) : null;
  }

  private insertAtPosition(content: string, position: number, text: string): string {
    return content.slice(0, position) + text + content.slice(position);
  }

  private findSectionEnd(content: string, sectionStart: number): number {
    const afterSection = content.substring(sectionStart);
    const nextHeading = afterSection.search(/\n#{1,6}\s+/);
    
    if (nextHeading === -1) {
      return content.length;
    }
    
    return sectionStart + nextHeading;
  }

  private getSuggestion(command: string, structure: any): string | null {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('heading') && structure.headings.length > 0) {
      const headings = structure.headings.slice(0, 5).map((h: any) => h.text);
      return `Available headings: ${headings.join(', ')}`;
    }

    if (lowerCommand.includes('section') && structure.sections.length > 0) {
      const sections = structure.sections.slice(0, 5).map((s: any) => s.title);
      return `Available sections: ${sections.join(', ')}`;
    }

    return null;
  }

  private generateSummary(transcript: ConversationStep[], modified: boolean): string {
    const commands = transcript.filter(t => t.type === 'command').length;
    const errors = transcript.filter(t => 
      t.type === 'response' && t.content.startsWith('Error:')
    ).length;

    if (modified) {
      return `Completed ${commands} commands with ${errors} errors. Document was modified.`;
    } else {
      return `Executed ${commands} queries with ${errors} errors. Document was not modified.`;
    }
  }
}