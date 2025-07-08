import { BaseTool } from './base.js';
import { validatePath } from '../utils/pathValidator.js';

interface HeadingInfo {
  text: string;
  level: number;
  path: string[];
  line: number;
  has_content: boolean;
  children_count: number;
  occurrence?: number; // When there are duplicates in same path
}

interface BlockInfo {
  id: string;
  line: number;
  preview: string;
  context_heading?: string[];
}

interface StructureQueryResult {
  headings?: HeadingInfo[];
  blocks?: BlockInfo[];
  frontmatter_fields?: string[];
  stats?: {
    total_headings: number;
    max_heading_depth: number;
    total_blocks: number;
    has_frontmatter: boolean;
  };
}

export class QueryStructureTool extends BaseTool {
  name = 'obsidian_query_structure';
  description = 'Query document structure to get headings, blocks, and sections. Useful for LLMs to build unambiguous references before modifying content.';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to the file (relative to vault root)'
      },
      query: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['headings', 'blocks', 'all'],
            description: 'What to query from the document'
          },
          filter: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Filter headings containing this text'
              },
              level: {
                type: 'number',
                description: 'Filter headings of specific level (1-6)'
              },
              min_level: {
                type: 'number',
                description: 'Minimum heading level to include'
              },
              max_level: {
                type: 'number',
                description: 'Maximum heading level to include'
              },
              path_contains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter headings whose path contains these elements'
              }
            }
          },
          include_content_preview: {
            type: 'boolean',
            description: 'Include content preview for each section',
            default: false
          }
        },
        required: ['type']
      }
    },
    required: ['filepath', 'query']
  };

  async execute(args: {
    filepath: string;
    query: {
      type: 'headings' | 'blocks' | 'all';
      filter?: {
        text?: string;
        level?: number;
        min_level?: number;
        max_level?: number;
        path_contains?: string[];
      };
      include_content_preview?: boolean;
    };
  }): Promise<StructureQueryResult> {
    try {
      validatePath(args.filepath, 'filepath');
      
      const client = this.getClient();
      const content = await client.getFileContents(args.filepath);
      
      const result: StructureQueryResult = {};
      
      // Parse document structure
      const lines = content.split('\n');
      
      if (args.query.type === 'headings' || args.query.type === 'all') {
        result.headings = this.parseHeadings(lines, args.query.filter);
        
        // Add occurrence numbers for duplicates
        this.addOccurrenceNumbers(result.headings);
      }
      
      if (args.query.type === 'blocks' || args.query.type === 'all') {
        result.blocks = this.parseBlocks(lines);
      }
      
      // Add document stats
      result.stats = {
        total_headings: result.headings?.length || 0,
        max_heading_depth: this.getMaxHeadingDepth(result.headings || []),
        total_blocks: result.blocks?.length || 0,
        has_frontmatter: lines[0]?.trim() === '---'
      };
      
      // Parse frontmatter fields if present
      if (result.stats.has_frontmatter) {
        result.frontmatter_fields = this.parseFrontmatterFields(lines);
      }
      
      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private parseHeadings(lines: string[], filter?: any): HeadingInfo[] {
    const headings: HeadingInfo[] = [];
    const headingStack: { text: string; level: number }[] = [];
    
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        
        // Build path based on heading hierarchy
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
          headingStack.pop();
        }
        
        const path = [...headingStack.map(h => h.text), text];
        headingStack.push({ text, level });
        
        // Apply filters
        if (filter) {
          if (filter.text && !text.toLowerCase().includes(filter.text.toLowerCase())) {
            return;
          }
          if (filter.level && level !== filter.level) {
            return;
          }
          if (filter.min_level && level < filter.min_level) {
            return;
          }
          if (filter.max_level && level > filter.max_level) {
            return;
          }
          if (filter.path_contains) {
            const pathMatches = filter.path_contains.every((elem: string) => 
              path.some(p => p.toLowerCase().includes(elem.toLowerCase()))
            );
            if (!pathMatches) return;
          }
        }
        
        // Check if heading has content (not immediately followed by another heading)
        const hasContent = index < lines.length - 1 && 
          !lines[index + 1].match(/^#{1,6}\s+/);
        
        // Count children (headings of greater level before next same/lower level)
        let childrenCount = 0;
        for (let i = index + 1; i < lines.length; i++) {
          const nextMatch = lines[i].match(/^(#{1,6})\s+/);
          if (nextMatch) {
            const nextLevel = nextMatch[1].length;
            if (nextLevel <= level) break;
            if (nextLevel === level + 1) childrenCount++;
          }
        }
        
        headings.push({
          text,
          level,
          path,
          line: index + 1, // 1-based line numbers
          has_content: hasContent,
          children_count: childrenCount
        });
      }
    });
    
    return headings;
  }
  
  private parseBlocks(lines: string[]): BlockInfo[] {
    const blocks: BlockInfo[] = [];
    let currentHeadingPath: string[] = [];
    
    lines.forEach((line, index) => {
      // Update current heading context
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        
        // Maintain heading path
        while (currentHeadingPath.length >= level) {
          currentHeadingPath.pop();
        }
        currentHeadingPath.push(text);
      }
      
      // Find block references
      const blockMatch = line.match(/\^([a-zA-Z0-9-]+)\s*$/);
      if (blockMatch) {
        const id = blockMatch[1];
        
        // Get preview text (the line or paragraph containing the block ref)
        let preview = line.replace(/\s*\^[a-zA-Z0-9-]+\s*$/, '').trim();
        if (!preview && index > 0) {
          preview = lines[index - 1].trim();
        }
        
        blocks.push({
          id,
          line: index + 1,
          preview: preview.substring(0, 100) + (preview.length > 100 ? '...' : ''),
          context_heading: [...currentHeadingPath]
        });
      }
    });
    
    return blocks;
  }
  
  private parseFrontmatterFields(lines: string[]): string[] {
    const fields: string[] = [];
    let inFrontmatter = false;
    
    for (const line of lines) {
      if (line.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          break; // End of frontmatter
        }
      }
      
      if (inFrontmatter) {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
        if (match) {
          fields.push(match[1]);
        }
      }
    }
    
    return fields;
  }
  
  private addOccurrenceNumbers(headings: HeadingInfo[]): void {
    // Group headings by their full path
    const pathGroups = new Map<string, HeadingInfo[]>();
    
    headings.forEach(heading => {
      const pathKey = heading.path.join(' > ');
      if (!pathGroups.has(pathKey)) {
        pathGroups.set(pathKey, []);
      }
      pathGroups.get(pathKey)!.push(heading);
    });
    
    // Add occurrence numbers for duplicates
    pathGroups.forEach(group => {
      if (group.length > 1) {
        group.forEach((heading, index) => {
          heading.occurrence = index + 1;
        });
      }
    });
  }
  
  private getMaxHeadingDepth(headings: HeadingInfo[]): number {
    return headings.reduce((max, h) => Math.max(max, h.path.length), 0);
  }
}