/**
 * Utility for processing note content, extracting frontmatter, and generating statistics
 */

export interface NoteFrontmatter {
  [key: string]: any;
}

export interface NoteStatistics {
  wordCount: number;
  characterCount: number;
  headingCount: number;
  headings: string[];
}

export interface NotePreview {
  mode: 'preview';
  frontmatter: NoteFrontmatter | null;
  preview: string;
  statistics: NoteStatistics;
}

export interface NoteFullContent {
  mode: 'full';
  content: string;
}

export class NoteContentProcessor {
  private static readonly PREVIEW_LENGTH = 200;
  private static readonly FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  private static readonly HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;

  /**
   * Extract frontmatter from markdown content
   */
  static extractFrontmatter(content: string): { frontmatter: NoteFrontmatter | null; contentWithoutFrontmatter: string } {
    const match = content.match(this.FRONTMATTER_REGEX);
    
    if (!match) {
      return { frontmatter: null, contentWithoutFrontmatter: content };
    }

    const frontmatterYaml = match[1];
    let contentWithoutFrontmatter = content.substring(match[0].length);
    
    // Remove leading newline if present
    if (contentWithoutFrontmatter.startsWith('\n')) {
      contentWithoutFrontmatter = contentWithoutFrontmatter.substring(1);
    }

    try {
      // Simple YAML parsing for basic frontmatter
      // This handles common cases but isn't a full YAML parser
      const frontmatter = this.parseSimpleYaml(frontmatterYaml);
      return { frontmatter, contentWithoutFrontmatter };
    } catch (error) {
      // If YAML parsing fails, return null frontmatter but still remove the frontmatter section
      return { frontmatter: null, contentWithoutFrontmatter };
    }
  }

  /**
   * Simple YAML parser for basic frontmatter (handles most common cases)
   */
  private static parseSimpleYaml(yamlString: string): NoteFrontmatter {
    const result: NoteFrontmatter = {};
    const lines = yamlString.split('\n');

    // Handle empty frontmatter
    if (lines.every(line => !line.trim() || line.trim().startsWith('#'))) {
      return result;
    }

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmedLine.substring(0, colonIndex).trim();
      let value = trimmedLine.substring(colonIndex + 1).trim();

      // Handle quoted strings
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Handle arrays [item1, item2]
      else if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1);
        result[key] = arrayContent.split(',').map(item => item.trim());
        continue;
      }
      // Handle booleans
      else if (value === 'true') {
        result[key] = true;
        continue;
      }
      else if (value === 'false') {
        result[key] = false;
        continue;
      }
      // Handle numbers
      else if (!isNaN(Number(value)) && value !== '') {
        result[key] = Number(value);
        continue;
      }

      // Validate basic malformed YAML
      if (value.startsWith('"') && !value.endsWith('"')) {
        throw new Error('Malformed quoted string');
      }
      if (value.startsWith('[') && !value.endsWith(']')) {
        throw new Error('Malformed array');
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Generate statistics for note content
   */
  static generateStatistics(content: string): NoteStatistics {
    // Count words (split by whitespace, filter empty strings)
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Count characters (excluding frontmatter for content without frontmatter)
    const characterCount = content.length;

    // Extract headings
    const headings: string[] = [];
    let match;
    const headingRegex = new RegExp(this.HEADING_REGEX);
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[2].trim());
    }

    return {
      wordCount,
      characterCount,
      headingCount: headings.length,
      headings
    };
  }

  /**
   * Create preview version of content (first N characters without frontmatter)
   */
  static createPreview(contentWithoutFrontmatter: string, length: number = this.PREVIEW_LENGTH): string {
    if (contentWithoutFrontmatter.length <= length) {
      return contentWithoutFrontmatter;
    }
    
    return contentWithoutFrontmatter.substring(0, length);
  }

  /**
   * Process note content and return preview mode response
   */
  static processForPreview(fullContent: string): NotePreview {
    const { frontmatter, contentWithoutFrontmatter } = this.extractFrontmatter(fullContent);
    const preview = this.createPreview(contentWithoutFrontmatter);
    const statistics = this.generateStatistics(contentWithoutFrontmatter);

    return {
      mode: 'preview',
      frontmatter,
      preview,
      statistics
    };
  }

  /**
   * Process note content and return full mode response
   */
  static processForFull(fullContent: string): NoteFullContent {
    return {
      mode: 'full',
      content: fullContent
    };
  }
}