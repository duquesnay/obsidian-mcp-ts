import { BaseTool } from "./base.js";
import { validatePath } from '../utils/pathValidator.js';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

export class ObsidianDiffEditTool extends BaseTool {
  name = 'obsidian_apply_diff';
  description = `Edit documents by showing changes in familiar diff format.

🎯 IMMEDIATE SUCCESS - Visual diff editing:
• Show before/after for sections
• Use + for additions, - for removals
• Visual representation of changes
• No complex position calculations

📝 REAL EXAMPLES:
{
  file: "project.md",
  diff: \`
    ## Features
    - User authentication
    - Data processing
    + - Real-time updates
    + - Advanced analytics
    
    ## Implementation
    - TODO: Design API
    + API design completed - see api.md
    
    + ## Performance Requirements
    + - Response time: <100ms
    + - Concurrent users: 1000+
  \`
}

{
  file: "readme.md",
  showContext: true,
  changes: [
    {
      find: "## Installation",
      diff: \`
        npm install myapp
        + 
        + For development:
        + npm install --save-dev
      \`
    }
  ]
}

✅ WHY THIS WORKS:
• Familiar format from code reviews
• Visual representation reduces errors
• No abstract position specifications
• Natural for version control users
• Clear before/after visualization

💡 DIFF PATTERNS:
• Lines starting with - are removed
• Lines starting with + are added
• Lines with no prefix are context
• Empty lines with + add blank lines
• Use indentation to maintain structure

🔍 SMART BEHAVIORS:
• Fuzzy matching for context lines
• Maintains proper line spacing
• Preserves markdown formatting
• Shows preview before applying
• Clear error if context not found`;

  inputSchema = {
    type: "object" as const,
    required: ["file"],
    properties: {
      file: {
        type: "string",
        description: "Path to file to edit (relative to vault root)"
      },
      diff: {
        type: "string",
        description: "Complete diff showing changes to apply (with +/- prefixes)"
      },
      changes: {
        type: "array",
        description: "Alternative: array of targeted changes with context",
        items: {
          type: "object",
          required: ["diff"],
          properties: {
            find: {
              type: "string",
              description: "Section or text to find (optional - uses context from diff)"
            },
            diff: {
              type: "string",
              description: "Diff for this specific section"
            }
          }
        }
      },
      options: {
        type: "object",
        properties: {
          preview: {
            type: "boolean",
            description: "Show preview of changes before applying (default: false)"
          },
          fuzzyMatch: {
            type: "boolean",
            description: "Use fuzzy matching for context lines (default: true)"
          },
          showContext: {
            type: "boolean",
            description: "Include more context in responses (default: false)"
          }
        }
      }
    }
  };

  async execute(args: any): Promise<any> {
    const { file, diff, changes, options = {} } = args;
    const { preview = false, fuzzyMatch = true, showContext = false } = options;

    if (!diff && !changes) {
      throw new Error("Either 'diff' or 'changes' must be provided");
    }

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

    // Process diffs
    let modifiedContent = content;
    const appliedChanges: any[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    if (diff) {
      // Single diff for entire document
      const result = this.applyDiff(modifiedContent, diff, fuzzyMatch);
      modifiedContent = result.content;
      totalAdditions = result.additions;
      totalDeletions = result.deletions;
      appliedChanges.push({
        type: 'full_diff',
        additions: result.additions,
        deletions: result.deletions,
        location: 'entire document'
      });
    } else if (changes) {
      // Multiple targeted changes
      for (const change of changes) {
        try {
          const location = change.find || 'context from diff';
          const beforeLength = modifiedContent.length;
          
          const result = change.find
            ? this.applyTargetedDiff(modifiedContent, change.find, change.diff, fuzzyMatch)
            : this.applyDiff(modifiedContent, change.diff, fuzzyMatch);
            
          modifiedContent = result.content;
          totalAdditions += result.additions;
          totalDeletions += result.deletions;
          
          appliedChanges.push({
            type: 'targeted_diff',
            location,
            additions: result.additions,
            deletions: result.deletions,
            success: true
          });
        } catch (error: any) {
          appliedChanges.push({
            type: 'targeted_diff',
            location: change.find || 'context from diff',
            error: error.message,
            success: false
          });
        }
      }
    }

    // Generate preview if requested
    if (preview) {
      const diffPreview = this.generateUnifiedDiff(content, modifiedContent);
      return this.formatResponse({
        file,
        preview: true,
        diff: diffPreview,
        summary: {
          additions: totalAdditions,
          deletions: totalDeletions,
          changes: appliedChanges
        },
        message: "Preview mode - no changes applied. Remove preview option to apply changes."
      });
    }

    // Apply the changes
    if (modifiedContent !== content) {
      validatePath(file);
      await this.getClient().updateFile(file, modifiedContent);
    }

    // Generate response
    const summary = {
      file,
      modified: modifiedContent !== content,
      additions: totalAdditions,
      deletions: totalDeletions,
      changes: appliedChanges
    };

    if (showContext) {
      (summary as any)['diff'] = this.generateUnifiedDiff(content, modifiedContent);
    }

    return this.formatResponse(summary);
  }

  private applyDiff(content: string, diff: string, fuzzyMatch: boolean): any {
    const lines = content.split('\n');
    const diffLines = this.parseDiff(diff);
    
    // Find where to apply the diff
    const contextLines = diffLines.filter(d => d.type === 'unchanged');
    if (contextLines.length === 0) {
      throw new Error('Diff must include context lines (lines without +/- prefix)');
    }

    // Find matching position
    const matchPosition = this.findMatchPosition(lines, contextLines, fuzzyMatch);
    if (matchPosition === -1) {
      throw new Error('Could not find matching context in document');
    }

    // Apply the diff
    const result = this.applyDiffAtPosition(lines, diffLines, matchPosition);
    
    return {
      content: result.lines.join('\n'),
      additions: result.additions,
      deletions: result.deletions
    };
  }

  private applyTargetedDiff(
    content: string, 
    target: string, 
    diff: string, 
    fuzzyMatch: boolean
  ): any {
    const lines = content.split('\n');
    
    // Find target section
    const targetLine = lines.findIndex(line => 
      fuzzyMatch 
        ? this.fuzzyTextMatch(line, target)
        : line.includes(target)
    );
    
    if (targetLine === -1) {
      throw new Error(`Target not found: "${target}"`);
    }

    // Apply diff starting from target
    const diffLines = this.parseDiff(diff);
    
    // If diff starts with the target line as context, adjust position
    if (diffLines.length > 0 && diffLines[0].type === 'unchanged') {
      const firstContext = diffLines[0].content;
      if (this.fuzzyTextMatch(lines[targetLine], firstContext)) {
        // Start from target line
        const result = this.applyDiffAtPosition(lines, diffLines, targetLine);
        return {
          content: result.lines.join('\n'),
          additions: result.additions,
          deletions: result.deletions
        };
      }
    }

    // Otherwise, find best match near target
    const searchStart = Math.max(0, targetLine - 5);
    const searchEnd = Math.min(lines.length, targetLine + 10);
    const searchLines = lines.slice(searchStart, searchEnd);
    
    const contextLines = diffLines.filter(d => d.type === 'unchanged');
    const relativeMatch = this.findMatchPosition(searchLines, contextLines, fuzzyMatch);
    
    if (relativeMatch === -1) {
      throw new Error(`Could not find matching context near "${target}"`);
    }

    const actualPosition = searchStart + relativeMatch;
    const result = this.applyDiffAtPosition(lines, diffLines, actualPosition);
    
    return {
      content: result.lines.join('\n'),
      additions: result.additions,
      deletions: result.deletions
    };
  }

  private parseDiff(diff: string): DiffLine[] {
    const lines = diff.split('\n');
    const diffLines: DiffLine[] = [];
    
    for (const line of lines) {
      if (line.startsWith('+')) {
        diffLines.push({
          type: 'added',
          content: line.substring(1).trimEnd()
        });
      } else if (line.startsWith('-')) {
        diffLines.push({
          type: 'removed',
          content: line.substring(1).trimEnd()
        });
      } else if (line.trim() !== '') {
        // Context line (unchanged)
        diffLines.push({
          type: 'unchanged',
          content: line.trimEnd()
        });
      }
    }
    
    return diffLines;
  }

  private findMatchPosition(
    lines: string[], 
    contextLines: DiffLine[], 
    fuzzyMatch: boolean
  ): number {
    if (contextLines.length === 0) return -1;
    
    // Try to find a position where all context lines match
    for (let i = 0; i <= lines.length - contextLines.length; i++) {
      let allMatch = true;
      let matchedCount = 0;
      
      for (let j = 0; j < contextLines.length; j++) {
        const docLine = lines[i + j]?.trimEnd() || '';
        const contextLine = contextLines[j].content;
        
        const matches = fuzzyMatch
          ? this.fuzzyTextMatch(docLine, contextLine)
          : docLine === contextLine;
          
        if (matches) {
          matchedCount++;
        } else if (matchedCount === 0) {
          // Haven't matched anything yet, keep searching
          allMatch = false;
          break;
        }
      }
      
      if (allMatch || matchedCount >= Math.max(1, contextLines.length * 0.7)) {
        return i;
      }
    }
    
    return -1;
  }

  private fuzzyTextMatch(text1: string, text2: string): boolean {
    // Normalize for comparison
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const n1 = normalize(text1);
    const n2 = normalize(text2);
    
    // Exact match after normalization
    if (n1 === n2) return true;
    
    // One contains the other (useful for partial matches)
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Levenshtein distance for small differences
    if (Math.abs(n1.length - n2.length) <= 3) {
      const distance = this.levenshteinDistance(n1, n2);
      const threshold = Math.max(3, Math.floor(Math.min(n1.length, n2.length) * 0.2));
      return distance <= threshold;
    }
    
    return false;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  private applyDiffAtPosition(
    lines: string[], 
    diffLines: DiffLine[], 
    startPosition: number
  ): any {
    const newLines = [...lines];
    let currentPos = startPosition;
    let additions = 0;
    let deletions = 0;
    let offset = 0; // Track how positions shift due to additions/deletions
    
    for (const diffLine of diffLines) {
      switch (diffLine.type) {
        case 'unchanged':
          // Context line - just verify and move forward
          currentPos++;
          break;
          
        case 'removed':
          // Remove line if it matches
          const lineToRemove = newLines[currentPos + offset];
          if (lineToRemove !== undefined) {
            newLines.splice(currentPos + offset, 1);
            deletions++;
            offset--;
          }
          break;
          
        case 'added':
          // Insert new line
          newLines.splice(currentPos + offset, 0, diffLine.content);
          additions++;
          offset++;
          currentPos++;
          break;
      }
    }
    
    return {
      lines: newLines,
      additions,
      deletions
    };
  }

  private generateUnifiedDiff(original: string, modified: string): string {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    // Simple diff generation (could be enhanced with better algorithm)
    const diff: string[] = [];
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    let i = 0, j = 0;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        // Rest are additions
        diff.push(`+ ${modifiedLines[j]}`);
        j++;
      } else if (j >= modifiedLines.length) {
        // Rest are deletions
        diff.push(`- ${originalLines[i]}`);
        i++;
      } else if (originalLines[i] === modifiedLines[j]) {
        // Unchanged
        diff.push(`  ${originalLines[i]}`);
        i++;
        j++;
      } else {
        // Changed - show as delete + add
        diff.push(`- ${originalLines[i]}`);
        diff.push(`+ ${modifiedLines[j]}`);
        i++;
        j++;
      }
    }
    
    return diff.join('\n');
  }
}