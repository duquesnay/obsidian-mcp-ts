import { BaseTool } from "./base.js";
import { validatePath } from '../utils/pathValidator.js';

interface SmartBlock {
  type: string;
  content: string;
  metadata?: Record<string, any>;
}

interface BlockPlacement {
  position: 'start' | 'end' | 'after_heading' | 'in_section';
  reference?: string;
}

export class ObsidianSmartBlockTool extends BaseTool {
  name = 'obsidian_add_smart_block';
  description = `Add content blocks that intelligently know where they belong in your document.

🎯 IMMEDIATE SUCCESS - Content that knows where it belongs:
• Installation steps → finds or creates Installation section
• API endpoints → goes to API Reference section
• Troubleshooting → finds or creates Troubleshooting section
• Security warnings → placed prominently near top
• Examples → grouped with related content

📝 REAL EXAMPLES:
{
  file: "readme.md",
  block: {
    type: "installation_instructions",
    content: "npm install my-package",
    metadata: { language: "javascript", os: "all" }
  }
}

{
  file: "api.md",
  block: {
    type: "api_endpoint",
    content: "POST /api/users - Create new user",
    metadata: { method: "POST", path: "/api/users" }
  }
}

✅ SUPPORTED BLOCK TYPES:
• installation_instructions - Setup and install steps
• api_endpoint - API documentation entries
• troubleshooting - Common issues and solutions
• configuration - Config examples and options
• security_warning - Important security notes
• performance_tip - Optimization suggestions
• example_code - Code samples
• changelog_entry - Version history items
• dependency - Required dependencies
• migration_guide - Upgrade instructions

💡 SMART BEHAVIORS:
• Creates sections if they don't exist
• Groups related content together
• Maintains document conventions
• Intelligent positioning based on type
• Adapts to existing document structure`;

  inputSchema = {
    type: "object" as const,
    required: ["file", "block"],
    properties: {
      file: {
        type: "string",
        description: "Path to file (relative to vault root)"
      },
      block: {
        type: "object",
        required: ["type", "content"],
        properties: {
          type: {
            type: "string",
            enum: [
              "installation_instructions",
              "api_endpoint",
              "troubleshooting",
              "configuration",
              "security_warning",
              "performance_tip",
              "example_code",
              "changelog_entry",
              "dependency",
              "migration_guide"
            ],
            description: "The semantic type of content block"
          },
          content: {
            type: "string",
            description: "The content to add"
          },
          metadata: {
            type: "object",
            description: "Additional metadata to help with placement",
            additionalProperties: true
          }
        }
      },
      options: {
        type: "object",
        properties: {
          createSection: {
            type: "boolean",
            description: "Create section if it doesn't exist (default: true)"
          },
          sectionLevel: {
            type: "number",
            description: "Heading level for new sections (default: 2)"
          }
        }
      }
    }
  };

  async execute(args: any): Promise<any> {
    const { file, block, options = {} } = args;
    const { createSection = true, sectionLevel = 2 } = options;

    // Get current content
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
    
    // Determine placement for block
    const placement = this.determinePlacement(block, structure, createSection);
    
    // Generate formatted content for the block
    const formattedContent = this.formatBlock(block, structure);
    
    // Find insertion point
    const insertionPoint = this.findInsertionPoint(content, structure, placement, block.type);
    
    // Handle section creation if needed
    let modifiedContent = content;
    let actualInsertionPoint = insertionPoint;
    
    if (placement.createNewSection) {
      const sectionContent = this.createSection(
        placement.sectionName!,
        sectionLevel,
        formattedContent
      );
      
      modifiedContent = this.insertAtPosition(
        content,
        insertionPoint,
        sectionContent
      );
    } else {
      // Insert within existing section
      modifiedContent = this.insertAtPosition(
        content,
        insertionPoint,
        `\n${formattedContent}\n`
      );
    }

    // Apply the change
    validatePath(file);
    await this.getClient().updateFile(file, modifiedContent);

    return this.formatResponse({
      file,
      blockType: block.type,
      placedIn: placement.sectionName || 'document',
      position: placement.position,
      createdSection: placement.createNewSection || false,
      content: formattedContent.trim()
    });
  }

  private parseMarkdownStructure(content: string): any {
    const lines = content.split('\n');
    const headings: any[] = [];
    const sections: Map<string, any> = new Map();
    let position = 0;

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const normalizedText = text.toLowerCase().trim();
        
        const heading = {
          level,
          text,
          normalizedText,
          line: index + 1,
          position,
          endPosition: position
        };
        
        headings.push(heading);
        
        // Track sections (h1 and h2 typically)
        if (level <= 2) {
          sections.set(normalizedText, heading);
          
          // Also track common variations
          if (normalizedText.includes('install')) {
            sections.set('installation', heading);
          }
          if (normalizedText.includes('api')) {
            sections.set('api', heading);
          }
          if (normalizedText.includes('troubleshoot')) {
            sections.set('troubleshooting', heading);
          }
          if (normalizedText.includes('config')) {
            sections.set('configuration', heading);
          }
          if (normalizedText.includes('example')) {
            sections.set('examples', heading);
          }
          if (normalizedText.includes('change')) {
            sections.set('changelog', heading);
          }
        }
      }
      position += line.length + 1;
    });

    // Calculate end positions for sections
    headings.forEach((heading, index) => {
      const nextHeading = headings.find((h, i) => i > index && h.level <= heading.level);
      heading.endPosition = nextHeading ? nextHeading.position : content.length;
    });

    return { headings, sections, lines, content };
  }

  private determinePlacement(
    block: SmartBlock, 
    structure: any,
    createSection: boolean
  ): any {
    const blockRules = this.getBlockRules(block.type);
    
    // Try to find existing section
    for (const sectionName of blockRules.preferredSections) {
      const section = structure.sections.get(sectionName.toLowerCase());
      if (section) {
        return {
          position: 'in_section',
          sectionName: section.text,
          sectionHeading: section,
          createNewSection: false
        };
      }
    }

    // If section should be created
    if (createSection && blockRules.preferredSections.length > 0) {
      const newSectionName = blockRules.preferredSections[0];
      const position = this.determineNewSectionPosition(
        block.type,
        structure,
        blockRules
      );
      
      return {
        position: position.type,
        reference: position.reference,
        sectionName: newSectionName,
        createNewSection: true
      };
    }

    // Fallback to document position
    return {
      position: blockRules.fallbackPosition,
      createNewSection: false
    };
  }

  private getBlockRules(blockType: string): any {
    const rules: Record<string, any> = {
      installation_instructions: {
        preferredSections: ['Installation', 'Setup', 'Getting Started'],
        fallbackPosition: 'after_overview',
        order: 20
      },
      api_endpoint: {
        preferredSections: ['API Reference', 'API', 'Endpoints', 'REST API'],
        fallbackPosition: 'after_features',
        order: 50
      },
      troubleshooting: {
        preferredSections: ['Troubleshooting', 'Common Issues', 'FAQ'],
        fallbackPosition: 'near_end',
        order: 80
      },
      configuration: {
        preferredSections: ['Configuration', 'Config', 'Settings', 'Options'],
        fallbackPosition: 'after_installation',
        order: 30
      },
      security_warning: {
        preferredSections: ['Security', 'Security Considerations', 'Important'],
        fallbackPosition: 'near_top',
        order: 10
      },
      performance_tip: {
        preferredSections: ['Performance', 'Optimization', 'Best Practices'],
        fallbackPosition: 'after_configuration',
        order: 60
      },
      example_code: {
        preferredSections: ['Examples', 'Usage Examples', 'Code Examples'],
        fallbackPosition: 'after_api',
        order: 40
      },
      changelog_entry: {
        preferredSections: ['Changelog', 'Release Notes', 'Version History'],
        fallbackPosition: 'end',
        order: 90
      },
      dependency: {
        preferredSections: ['Dependencies', 'Requirements', 'Prerequisites'],
        fallbackPosition: 'before_installation',
        order: 15
      },
      migration_guide: {
        preferredSections: ['Migration', 'Upgrading', 'Migration Guide'],
        fallbackPosition: 'after_changelog',
        order: 85
      }
    };

    return rules[blockType] || {
      preferredSections: [],
      fallbackPosition: 'end',
      order: 100
    };
  }

  private determineNewSectionPosition(
    blockType: string,
    structure: any,
    blockRules: any
  ): any {
    // Look for natural document flow positions
    const commonSections = [
      'introduction', 'overview', 'features', 'installation', 
      'configuration', 'usage', 'api', 'examples', 'troubleshooting', 
      'changelog', 'license'
    ];

    const targetOrder = blockRules.order;
    
    // Find the best position based on document flow
    for (let i = commonSections.length - 1; i >= 0; i--) {
      const section = structure.sections.get(commonSections[i]);
      if (section && i * 10 < targetOrder) {
        return {
          type: 'after_heading',
          reference: section.text
        };
      }
    }

    // Fallback positions
    switch (blockRules.fallbackPosition) {
      case 'near_top':
        const firstH2 = structure.headings.find((h: any) => h.level === 2);
        return firstH2 
          ? { type: 'before_heading', reference: firstH2.text }
          : { type: 'start' };
          
      case 'near_end':
        const lastMainSection = [...structure.headings].reverse().find((h: any) => 
          h.level <= 2 && !h.normalizedText.includes('license')
        );
        return lastMainSection
          ? { type: 'after_heading', reference: lastMainSection.text }
          : { type: 'end' };
          
      case 'after_overview':
        const overview = structure.sections.get('overview') || 
                        structure.sections.get('introduction');
        return overview
          ? { type: 'after_heading', reference: overview.text }
          : { type: 'start' };
          
      default:
        return { type: 'end' };
    }
  }

  private findInsertionPoint(
    content: string,
    structure: any,
    placement: any,
    blockType: string
  ): number {
    if (placement.position === 'in_section' && placement.sectionHeading) {
      // Find end of section content (before next heading of same/higher level)
      const heading = placement.sectionHeading;
      const sectionEnd = heading.endPosition;
      
      // Look for good insertion point within section
      const sectionContent = content.substring(heading.position, sectionEnd);
      
      // If section has subsections, try to place appropriately
      if (sectionContent.includes('\n###')) {
        // Complex section - add at end of main content before subsections
        const firstSubsection = sectionContent.indexOf('\n###');
        return heading.position + firstSubsection;
      }
      
      // Simple section - add at end
      return sectionEnd - 1; // Before the next section
    }

    if (placement.createNewSection) {
      switch (placement.position) {
        case 'after_heading':
          const afterHeading = structure.headings.find((h: any) => 
            h.text === placement.reference
          );
          return afterHeading ? afterHeading.endPosition : content.length;
          
        case 'before_heading':
          const beforeHeading = structure.headings.find((h: any) => 
            h.text === placement.reference
          );
          return beforeHeading ? beforeHeading.position : 0;
          
        case 'start':
          // After any front matter
          const firstHeading = structure.headings[0];
          return firstHeading ? Math.min(firstHeading.position, 100) : 0;
          
        case 'end':
        default:
          return content.length;
      }
    }

    // Default: end of document
    return content.length;
  }

  private formatBlock(block: SmartBlock, structure: any): string {
    const { type, content, metadata = {} } = block;
    
    switch (type) {
      case 'installation_instructions':
        const lang = metadata.language || 'bash';
        const codeBlock = content.includes('```') ? content : `\`\`\`${lang}\n${content}\n\`\`\``;
        return metadata.os && metadata.os !== 'all' 
          ? `**${metadata.os}:**\n${codeBlock}`
          : codeBlock;
          
      case 'api_endpoint':
        const method = metadata.method || 'GET';
        const path = metadata.path || content.split(' ')[1] || '/api/...';
        return `### \`${method} ${path}\`\n\n${content}`;
        
      case 'troubleshooting':
        return `**Issue:** ${metadata.issue || 'Common problem'}\n\n**Solution:** ${content}`;
        
      case 'configuration':
        const configFormat = content.includes('```') ? content : `\`\`\`${metadata.format || 'json'}\n${content}\n\`\`\``;
        return metadata.description 
          ? `${metadata.description}\n\n${configFormat}`
          : configFormat;
          
      case 'security_warning':
        return `> ⚠️ **Security Warning**\n> \n> ${content.split('\n').join('\n> ')}`;
        
      case 'performance_tip':
        return `> 💡 **Performance Tip**\n> \n> ${content.split('\n').join('\n> ')}`;
        
      case 'example_code':
        const exampleLang = metadata.language || '';
        return content.includes('```') ? content : `\`\`\`${exampleLang}\n${content}\n\`\`\``;
        
      case 'changelog_entry':
        const version = metadata.version || 'Unreleased';
        const date = metadata.date || new Date().toISOString().split('T')[0];
        const category = metadata.category || 'Changed';
        return `### [${version}] - ${date}\n\n#### ${category}\n- ${content}`;
        
      case 'dependency':
        const depType = metadata.type || 'runtime';
        return `- ${content}${depType !== 'runtime' ? ` (${depType})` : ''}`;
        
      case 'migration_guide':
        const fromVersion = metadata.from || 'previous';
        const toVersion = metadata.to || 'current';
        return `### Migrating from ${fromVersion} to ${toVersion}\n\n${content}`;
        
      default:
        return content;
    }
  }

  private createSection(name: string, level: number, content: string): string {
    const heading = `${'#'.repeat(level)} ${name}`;
    return `\n\n${heading}\n\n${content}`;
  }

  private insertAtPosition(content: string, position: number, text: string): string {
    // Ensure clean spacing
    const before = content.slice(0, position);
    const after = content.slice(position);
    
    // Avoid multiple blank lines
    const cleanedText = text.replace(/\n{3,}/g, '\n\n');
    
    return before + cleanedText + after;
  }
}