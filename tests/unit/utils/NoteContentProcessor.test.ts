import { describe, it, expect } from 'vitest';
import { NoteContentProcessor } from '../../../src/utils/NoteContentProcessor.js';

describe('NoteContentProcessor', () => {
  describe('extractFrontmatter', () => {
    it('should extract valid frontmatter', () => {
      const content = `---
title: "My Note"
tags: [project, important]
created: 2023-01-01
published: true
---

# Content here
More content.`;

      const result = NoteContentProcessor.extractFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        title: 'My Note',
        tags: ['project', 'important'],
        created: '2023-01-01',
        published: true
      });
      expect(result.contentWithoutFrontmatter).toBe('# Content here\nMore content.');
    });

    it('should handle content without frontmatter', () => {
      const content = '# Just a heading\n\nSome content here.';
      
      const result = NoteContentProcessor.extractFrontmatter(content);
      
      expect(result.frontmatter).toBeNull();
      expect(result.contentWithoutFrontmatter).toBe(content);
    });

    it('should handle empty frontmatter', () => {
      const content = `---

---

# Content`;
      
      const result = NoteContentProcessor.extractFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.contentWithoutFrontmatter).toBe('# Content');
    });

    it('should handle malformed YAML gracefully', () => {
      const content = `---
title: "Unclosed quote
invalid: [unclosed array
---

# Content`;
      
      const result = NoteContentProcessor.extractFrontmatter(content);
      
      expect(result.frontmatter).toBeNull();
      expect(result.contentWithoutFrontmatter).toBe('# Content');
    });

    it('should handle different line endings', () => {
      const content = `---\r\ntitle: "Windows"\r\n---\r\n\r\n# Content`;
      
      const result = NoteContentProcessor.extractFrontmatter(content);
      
      expect(result.frontmatter).toEqual({ title: 'Windows' });
      expect(result.contentWithoutFrontmatter).toBe('\r\n# Content');
    });
  });

  describe('generateStatistics', () => {
    it('should count words correctly', () => {
      const content = 'This is a test with five words.';
      
      const stats = NoteContentProcessor.generateStatistics(content);
      
      expect(stats.wordCount).toBe(7);
    });

    it('should count characters correctly', () => {
      const content = 'Hello world!';
      
      const stats = NoteContentProcessor.generateStatistics(content);
      
      expect(stats.characterCount).toBe(12);
    });

    it('should extract headings correctly', () => {
      const content = `# Main Title

Some content here.

## Section 1

More content.

### Subsection A

Even more content.

# Another Main Section`;
      
      const stats = NoteContentProcessor.generateStatistics(content);
      
      expect(stats.headingCount).toBe(4);
      expect(stats.headings).toEqual([
        'Main Title',
        'Section 1', 
        'Subsection A',
        'Another Main Section'
      ]);
    });

    it('should handle content with no headings', () => {
      const content = 'Just plain text with no headings at all.';
      
      const stats = NoteContentProcessor.generateStatistics(content);
      
      expect(stats.headingCount).toBe(0);
      expect(stats.headings).toEqual([]);
    });

    it('should handle empty content', () => {
      const content = '';
      
      const stats = NoteContentProcessor.generateStatistics(content);
      
      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBe(0);
      expect(stats.headingCount).toBe(0);
      expect(stats.headings).toEqual([]);
    });
  });

  describe('createPreview', () => {
    it('should truncate long content to specified length', () => {
      const content = 'This is a very long piece of content that should be truncated at exactly 50 characters for testing purposes.';
      
      const preview = NoteContentProcessor.createPreview(content, 50);
      
      expect(preview).toHaveLength(50);
      expect(preview).toBe('This is a very long piece of content that should b');
    });

    it('should return full content if shorter than limit', () => {
      const content = 'Short content';
      
      const preview = NoteContentProcessor.createPreview(content, 50);
      
      expect(preview).toBe(content);
      expect(preview.length).toBeLessThan(50);
    });

    it('should use default length of 200', () => {
      const content = 'x'.repeat(300);
      
      const preview = NoteContentProcessor.createPreview(content);
      
      expect(preview).toHaveLength(200);
    });
  });

  describe('processForPreview', () => {
    it('should process content with frontmatter correctly', () => {
      const content = `---
title: "My Note"
tags: [project, important]
created: 2023-01-01
---

# My Note

This is a long note with multiple paragraphs. This content should be truncated at 200 characters in preview mode. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 2

More content here that should not appear in preview mode.

### Subsection

Even more content that should be truncated.`;

      const result = NoteContentProcessor.processForPreview(content);
      
      expect(result.mode).toBe('preview');
      expect(result.frontmatter).toEqual({
        title: 'My Note',
        tags: ['project', 'important'],
        created: '2023-01-01'
      });
      expect(result.preview).toHaveLength(200);
      expect(result.preview).toBe('# My Note\n\nThis is a long note with multiple paragraphs. This content should be truncated at 200 characters in preview mode. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tem');
      expect(result.statistics).toEqual({
        wordCount: 63,
        characterCount: 382,
        headingCount: 3,
        headings: ['My Note', 'Section 2', 'Subsection']
      });
    });

    it('should process content without frontmatter correctly', () => {
      const content = `# Simple Note

This is a simple note without frontmatter. It should still work in preview mode and show the first 200 characters along with statistics.

More content here.`;

      const result = NoteContentProcessor.processForPreview(content);
      
      expect(result.mode).toBe('preview');
      expect(result.frontmatter).toBeNull();
      expect(result.preview.length).toBeLessThanOrEqual(200);
      expect(result.statistics.wordCount).toBe(29);
      expect(result.statistics.headingCount).toBe(1);
    });

    it('should handle short content correctly', () => {
      const content = `---
title: "Short"
---

# Short Note

This is short.`;

      const result = NoteContentProcessor.processForPreview(content);
      
      expect(result.mode).toBe('preview');
      expect(result.preview).toBe('# Short Note\n\nThis is short.');
      expect(result.preview.length).toBeLessThan(200);
    });
  });

  describe('processForFull', () => {
    it('should return complete content', () => {
      const content = `---
title: "Full Note"
---

# Complete Note

This is the complete content that should be returned in full mode without any truncation.

## All sections

All content should be preserved.`;

      const result = NoteContentProcessor.processForFull(content);
      
      expect(result.mode).toBe('full');
      expect(result.content).toBe(content);
    });
  });
});