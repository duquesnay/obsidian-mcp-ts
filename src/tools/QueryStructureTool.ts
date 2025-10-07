import { QueryStructureArgs } from './types/QueryStructureArgs.js';
import { BaseTool, ToolResponse, ToolMetadata } from './base.js';
import { PathValidationUtil, PathValidationType } from '../utils/PathValidationUtil.js';
import { OBSIDIAN_DEFAULTS, REGEX_PATTERNS } from '../constants.js';
import { FILE_PATH_SCHEMA } from '../utils/validation.js';

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

interface HeadingFilter {
  text?: string;
  level?: number;
  min_level?: number;
  max_level?: number;
  path_contains?: string[];
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

export class QueryStructureTool extends BaseTool<QueryStructureArgs> {
  name = 'obsidian_query_structure';
  description = 'Query structure of Obsidian notes. Get headings and blocks for editing.';
  
  metadata: ToolMetadata = {
    category: 'editing',
    keywords: ['query', 'structure', 'headings', 'blocks', 'outline', 'navigation'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      filepath: FILE_PATH_SCHEMA,
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

  async executeTyped(args: QueryStructureArgs): Promise<ToolResponse> {
    try {
      PathValidationUtil.validate(args.filepath, 'filepath', { type: PathValidationType.FILE });
      
      const client = this.getClient();
      const content = await client.getFileContents(args.filepath);
      
      const result: StructureQueryResult = {};
      
      // Type assertion is safe here because we're not passing a format parameter
      const contentString = content as string;
      
      // Parse document structure
      const lines = contentString.split('\n');
      
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
      
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private parseHeadings(lines: string[], filter?: HeadingFilter): HeadingInfo[] {
    const headings: HeadingInfo[] = [];
    const headingStack: { text: string; level: number }[] = [];
    
    lines.forEach((line, index) => {
      const headingMatch = line.match(REGEX_PATTERNS.MARKDOWN_HEADING);
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
          !lines[index + 1].match(REGEX_PATTERNS.MARKDOWN_HEADING);
        
        // Count children (headings of greater level before next same/lower level)
        let childrenCount = 0;
        for (let i = index + 1; i < lines.length; i++) {
          const nextMatch = lines[i].match(REGEX_PATTERNS.MARKDOWN_HEADING);
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
      const headingMatch = line.match(REGEX_PATTERNS.MARKDOWN_HEADING);
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
      const blockMatch = line.match(REGEX_PATTERNS.BLOCK_REFERENCE);
      if (blockMatch) {
        const id = blockMatch[1];
        
        // Get preview text (the line or paragraph containing the block ref)
        let preview = line.replace(REGEX_PATTERNS.BLOCK_REFERENCE_CLEANUP, '').trim();
        if (!preview && index > 0) {
          preview = lines[index - 1].trim();
        }
        
        blocks.push({
          id,
          line: index + 1,
          preview: preview.substring(0, OBSIDIAN_DEFAULTS.CONTEXT_LENGTH) + (preview.length > OBSIDIAN_DEFAULTS.CONTEXT_LENGTH ? '...' : ''),
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