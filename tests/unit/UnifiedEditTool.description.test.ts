import { describe, it, expect } from 'vitest';
import { UnifiedEditTool } from '../../src/tools/UnifiedEditTool.js';

describe('UnifiedEditTool description format', () => {
  it('should not contain emojis in description', () => {
    const tool = new UnifiedEditTool();
    
    // Check for common emoji patterns
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const hasEmojis = emojiPattern.test(tool.description);
    
    expect(hasEmojis).toBe(false);
  });

  it('should not contain special formatting characters', () => {
    const tool = new UnifiedEditTool();
    
    // Check for bullet points and special characters that might break MCP
    const specialChars = ['🎯', '📝', '✅', '🔧', '💡', '•'];
    
    for (const char of specialChars) {
      expect(tool.description).not.toContain(char);
    }
  });

  it('should be a simple string without newlines', () => {
    const tool = new UnifiedEditTool();
    
    // MCP descriptions should be single-line strings
    expect(tool.description).not.toContain('\n');
  });

  it('should provide a concise description', () => {
    const tool = new UnifiedEditTool();
    
    // Description should be reasonably short for MCP protocol
    expect(tool.description.length).toBeLessThan(200);
  });
});