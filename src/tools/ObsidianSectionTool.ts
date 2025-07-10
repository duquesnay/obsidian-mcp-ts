import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

interface SectionArgs {
  file: string;
  section: string;
  action: 'append' | 'prepend' | 'replace' | 'create' | 'delete';
  content?: string;
  position?: string; // For create: 'end' | 'start' | 'before:SectionName' | 'after:SectionName'
}

interface SectionResult {
  success: boolean;
  message?: string;
  error?: string;
  hint?: string;
  suggestions?: string[];
}

export class ObsidianSectionTool extends BaseTool {
  name = 'obsidian_section';
  description = `Manage markdown sections as logical units.

🎯 TREAT SECTIONS AS UNITS:
• Append to section: { file: "guide.md", section: "Installation", action: "append", content: "Additional steps..." }
• Create section: { file: "guide.md", section: "Troubleshooting", action: "create", content: "Common issues...", position: "before:References" }
• Replace section content: { file: "notes.md", section: "Summary", action: "replace", content: "New summary..." }
• Delete section: { file: "old.md", section: "Deprecated", action: "delete" }

✅ SMART BEHAVIORS:
• Sections are identified by their heading text
• "create" adds section if it doesn't exist
• Position supports: "end", "start", "before:Section", "after:Section"
• Maintains proper markdown spacing
• Preserves section hierarchy

📝 EXAMPLES:
Add to existing section:
{ file: "readme.md", section: "Usage", action: "append", content: "\\n### Advanced Usage\\nDetails here..." }

Create new section intelligently:
{ file: "docs.md", section: "API Reference", action: "create", content: "## API Reference\\n\\nEndpoints...", position: "before:Examples" }

💡 WHY THIS WORKS:
• Treats markdown structure as first-class concept
• No complex location specifications
• Natural section-based thinking
• Intelligent positioning for new sections`;

  inputSchema = {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string',
        description: 'Path to file (relative to vault root)'
      },
      section: {
        type: 'string',
        description: 'Section heading text (without # symbols)'
      },
      action: {
        type: 'string',
        enum: ['append', 'prepend', 'replace', 'create', 'delete'],
        description: 'Action to perform on the section'
      },
      content: {
        type: 'string',
        description: 'Content for append/prepend/replace/create actions'
      },
      position: {
        type: 'string',
        description: 'Position for create action: "end", "start", "before:Section", "after:Section"'
      }
    },
    required: ['file', 'section', 'action'],
    additionalProperties: false
  };

  async execute(args: SectionArgs): Promise<SectionResult> {
    try {
      validatePath(args.file, 'file');
      
      const client = this.getClient();
      
      // Get file content
      let content: string;
      try {
        content = await client.getFileContents(args.file);
      } catch (error: any) {
        if (error.response?.status === 404) {
          if (args.action === 'create') {
            // Create file with the section
            const newContent = this.createSectionContent(args.section, args.content || '');
            await client.updateFile(args.file, newContent);
            return {
              success: true,
              message: `Created file ${args.file} with section "${args.section}"`
            };
          }
          return {
            success: false,
            error: `File not found: ${args.file}`,
            hint: 'Check the file path or use action: "create" to create the file with the section'
          };
        }
        throw error;
      }
      
      // Parse sections
      const sections = this.parseSections(content);
      const targetSection = sections.find(s => s.heading.toLowerCase() === args.section.toLowerCase());
      
      switch (args.action) {
        case 'append':
          return await this.handleAppend(client, args, content, sections, targetSection);
          
        case 'prepend':
          return await this.handlePrepend(client, args, content, sections, targetSection);
          
        case 'replace':
          return await this.handleReplace(client, args, content, sections, targetSection);
          
        case 'create':
          return await this.handleCreate(client, args, content, sections, targetSection);
          
        case 'delete':
          return await this.handleDelete(client, args, content, sections, targetSection);
          
        default:
          return {
            success: false,
            error: `Unknown action: ${args.action}`,
            hint: 'Use one of: append, prepend, replace, create, delete'
          };
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unexpected error',
        hint: 'Check your parameters and file path'
      };
    }
  }
  
  private parseSections(content: string): Array<{heading: string; level: number; start: number; end: number; content: string}> {
    const lines = content.split('\n');
    const sections: Array<{heading: string; level: number; start: number; end: number; content: string}> = [];
    
    let currentSection: any = null;
    
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.end = index - 1;
          currentSection.content = lines.slice(currentSection.start, currentSection.end + 1).join('\n');
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          heading: headingMatch[2],
          level: headingMatch[1].length,
          start: index,
          end: -1,
          content: ''
        };
      }
    });
    
    // Save last section
    if (currentSection) {
      currentSection.end = lines.length - 1;
      currentSection.content = lines.slice(currentSection.start, currentSection.end + 1).join('\n');
      sections.push(currentSection);
    }
    
    return sections;
  }
  
  private async handleAppend(
    client: any,
    args: SectionArgs,
    content: string,
    sections: any[],
    targetSection: any
  ): Promise<SectionResult> {
    if (!targetSection) {
      return {
        success: false,
        error: `Section "${args.section}" not found`,
        hint: 'Check the section name or use action: "create" to create it',
        suggestions: this.getSimilarSections(sections, args.section)
      };
    }
    
    if (!args.content) {
      return {
        success: false,
        error: 'Content required for append action',
        hint: 'Provide content parameter with the text to append'
      };
    }
    
    const lines = content.split('\n');
    const insertLine = targetSection.end + 1;
    
    // Ensure proper spacing
    const contentToInsert = lines[targetSection.end]?.trim() ? '\n' + args.content : args.content;
    
    lines.splice(insertLine, 0, ...contentToInsert.split('\n'));
    const newContent = lines.join('\n');
    
    await client.updateFile(args.file, newContent);
    
    return {
      success: true,
      message: `Appended content to section "${args.section}"`
    };
  }
  
  private async handlePrepend(
    client: any,
    args: SectionArgs,
    content: string,
    sections: any[],
    targetSection: any
  ): Promise<SectionResult> {
    if (!targetSection) {
      return {
        success: false,
        error: `Section "${args.section}" not found`,
        hint: 'Check the section name or use action: "create" to create it',
        suggestions: this.getSimilarSections(sections, args.section)
      };
    }
    
    if (!args.content) {
      return {
        success: false,
        error: 'Content required for prepend action',
        hint: 'Provide content parameter with the text to prepend'
      };
    }
    
    const lines = content.split('\n');
    const insertLine = targetSection.start + 1; // After the heading
    
    // Ensure proper spacing
    const contentToInsert = '\n' + args.content + (lines[insertLine]?.trim() ? '\n' : '');
    
    lines.splice(insertLine, 0, ...contentToInsert.split('\n'));
    const newContent = lines.join('\n');
    
    await client.updateFile(args.file, newContent);
    
    return {
      success: true,
      message: `Prepended content to section "${args.section}"`
    };
  }
  
  private async handleReplace(
    client: any,
    args: SectionArgs,
    content: string,
    sections: any[],
    targetSection: any
  ): Promise<SectionResult> {
    if (!targetSection) {
      return {
        success: false,
        error: `Section "${args.section}" not found`,
        hint: 'Check the section name or use action: "create" to create it',
        suggestions: this.getSimilarSections(sections, args.section)
      };
    }
    
    if (!args.content) {
      return {
        success: false,
        error: 'Content required for replace action',
        hint: 'Provide content parameter with the new section content'
      };
    }
    
    const lines = content.split('\n');
    
    // Keep the heading, replace everything else in the section
    const headingLine = lines[targetSection.start];
    const newSectionLines = [headingLine, '', ...args.content.split('\n')];
    
    // Find the actual content range (skip the heading line)
    const contentStart = targetSection.start + 1;
    const contentEnd = targetSection.end;
    const deleteCount = contentEnd - contentStart + 1;
    
    lines.splice(contentStart, deleteCount, ...newSectionLines.slice(1));
    const newContent = lines.join('\n');
    
    await client.updateFile(args.file, newContent);
    
    return {
      success: true,
      message: `Replaced content in section "${args.section}"`
    };
  }
  
  private async handleCreate(
    client: any,
    args: SectionArgs,
    content: string,
    sections: any[],
    targetSection: any
  ): Promise<SectionResult> {
    if (targetSection) {
      return {
        success: false,
        error: `Section "${args.section}" already exists`,
        hint: 'Use action: "append" or "replace" to modify existing section'
      };
    }
    
    const lines = content.split('\n');
    const position = args.position || 'end';
    
    // Create section content
    const sectionContent = this.createSectionContent(args.section, args.content || '');
    let insertLine: number;
    
    if (position === 'end') {
      insertLine = lines.length;
    } else if (position === 'start') {
      insertLine = 0;
    } else if (position.startsWith('before:')) {
      const beforeSection = position.substring(7);
      const section = sections.find(s => s.heading.toLowerCase() === beforeSection.toLowerCase());
      if (!section) {
        return {
          success: false,
          error: `Section "${beforeSection}" not found for positioning`,
          hint: 'Check the section name or use "end" or "start" for position',
          suggestions: this.getSimilarSections(sections, beforeSection)
        };
      }
      insertLine = section.start;
    } else if (position.startsWith('after:')) {
      const afterSection = position.substring(6);
      const section = sections.find(s => s.heading.toLowerCase() === afterSection.toLowerCase());
      if (!section) {
        return {
          success: false,
          error: `Section "${afterSection}" not found for positioning`,
          hint: 'Check the section name or use "end" or "start" for position',
          suggestions: this.getSimilarSections(sections, afterSection)
        };
      }
      insertLine = section.end + 1;
    } else {
      return {
        success: false,
        error: `Invalid position: ${position}`,
        hint: 'Use "end", "start", "before:SectionName", or "after:SectionName"'
      };
    }
    
    // Ensure proper spacing
    const contentToInsert = (insertLine > 0 && lines[insertLine - 1]?.trim() ? '\n' : '') + 
                           sectionContent +
                           (insertLine < lines.length && lines[insertLine]?.trim() ? '\n' : '');
    
    lines.splice(insertLine, 0, ...contentToInsert.split('\n'));
    const newContent = lines.join('\n');
    
    await client.updateFile(args.file, newContent);
    
    return {
      success: true,
      message: `Created section "${args.section}" at ${position}`
    };
  }
  
  private async handleDelete(
    client: any,
    args: SectionArgs,
    content: string,
    sections: any[],
    targetSection: any
  ): Promise<SectionResult> {
    if (!targetSection) {
      return {
        success: false,
        error: `Section "${args.section}" not found`,
        hint: 'Check the section name',
        suggestions: this.getSimilarSections(sections, args.section)
      };
    }
    
    const lines = content.split('\n');
    
    // Delete the entire section including the heading
    const deleteCount = targetSection.end - targetSection.start + 1;
    lines.splice(targetSection.start, deleteCount);
    
    // Clean up extra blank lines
    const newContent = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    
    await client.updateFile(args.file, newContent);
    
    return {
      success: true,
      message: `Deleted section "${args.section}"`
    };
  }
  
  private createSectionContent(heading: string, content: string): string {
    // Auto-detect heading level if provided
    const headingLine = heading.match(/^#{1,6}\s+/) ? heading : `## ${heading}`;
    return `${headingLine}\n\n${content}`;
  }
  
  private getSimilarSections(sections: any[], target: string): string[] {
    const lower = target.toLowerCase();
    return sections
      .filter(s => {
        const sectionLower = s.heading.toLowerCase();
        return sectionLower.includes(lower) || lower.includes(sectionLower);
      })
      .map(s => s.heading)
      .slice(0, 3);
  }
}