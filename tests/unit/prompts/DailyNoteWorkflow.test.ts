import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DailyNoteWorkflow } from '../../../src/prompts/templates/DailyNoteWorkflow.js';
import { defaultCachedHandlers } from '../../../src/resources/CachedConcreteHandlers.js';

// Mock the resource handlers
vi.mock('../../../src/resources/CachedConcreteHandlers.js', () => ({
  defaultCachedHandlers: {
    daily: {
      handleRequest: vi.fn(),
    },
  },
}));

describe('DailyNoteWorkflow', () => {
  let workflow: DailyNoteWorkflow;

  beforeEach(() => {
    workflow = new DailyNoteWorkflow();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(workflow.name).toBe('daily_note_workflow');
    });

    it('should have description', () => {
      expect(workflow.description).toContain('daily note');
    });

    it('should define optional arguments', () => {
      expect(workflow.arguments).toHaveLength(2);
      expect(workflow.arguments[0].name).toBe('date');
      expect(workflow.arguments[0].required).toBe(false);
      expect(workflow.arguments[1].name).toBe('template');
      expect(workflow.arguments[1].required).toBe(false);
    });
  });

  describe('generate - existing note', () => {
    it('should generate prompt for existing note', async () => {
      // Mock successful note retrieval
      const mockContent = '# 2024-01-15\n\n## Tasks\n- Task 1\n- Task 2';
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockResolvedValue({
        contents: [{ text: mockContent }],
      } as any);

      const result = await workflow.generate({ date: '2024-01-15' });

      expect(result.description).toContain('note exists');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toContain('2024-01-15');
      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content.text).toContain('✓ Daily note exists');
      expect(result.messages[1].content.text).toContain('Statistics');
      expect(result.messages[1].content.text).toContain('Preview');
    });

    it('should handle base64 blob content', async () => {
      const mockContent = '# Note content';
      const base64Content = Buffer.from(mockContent).toString('base64');

      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockResolvedValue({
        contents: [{ blob: base64Content }],
      } as any);

      const result = await workflow.generate({ date: 'today' });

      expect(result.description).toContain('note exists');
      expect(result.messages[1].content.text).toContain('✓ Daily note exists');
    });

    it('should truncate long content in preview', async () => {
      const longContent = 'a'.repeat(600);
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockResolvedValue({
        contents: [{ text: longContent }],
      } as any);

      const result = await workflow.generate({ date: 'today' });

      expect(result.messages[1].content.text).toContain('...');
    });

    it('should include statistics (word count, line count)', async () => {
      const mockContent = 'word1 word2 word3\nline2\nline3';
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockResolvedValue({
        contents: [{ text: mockContent }],
      } as any);

      const result = await workflow.generate({ date: 'today' });

      // Content has 5 words total (word1, word2, word3, line2, line3)
      expect(result.messages[1].content.text).toContain('5 words');
      expect(result.messages[1].content.text).toContain('3 lines');
    });

    it('should provide action guidance', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockResolvedValue({
        contents: [{ text: 'content' }],
      } as any);

      const result = await workflow.generate({ date: 'today' });

      expect(result.messages[1].content.text).toContain('obsidian_get_file_contents');
      expect(result.messages[1].content.text).toContain('obsidian_append_content');
      expect(result.messages[1].content.text).toContain('obsidian_edit');
    });
  });

  describe('generate - new note', () => {
    it('should generate prompt for new note without template', async () => {
      // Mock note not found
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      const result = await workflow.generate({ date: '2024-01-15' });

      expect(result.description).toContain('creation needed');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content.text).toContain('does not exist yet');
      expect(result.messages[1].content.text).toContain('obsidian_append_content');
      expect(result.messages[1].content.text).toContain('Common Daily Note Templates');
    });

    it('should generate prompt for new note with template', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      const template = '# {{date}}\n\n## Tasks\n- [ ] ';
      const result = await workflow.generate({ date: '2024-01-15', template });

      expect(result.description).toContain('creation needed');
      expect(result.messages[1].content.text).toContain('Template Provided');
      expect(result.messages[1].content.text).toContain(template);
      expect(result.messages[1].content.text).toContain('obsidian_append_content');
    });

    it('should provide template examples', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      const result = await workflow.generate({ date: 'today' });

      expect(result.messages[1].content.text).toContain('Simple:');
      expect(result.messages[1].content.text).toContain('Journaling:');
      expect(result.messages[1].content.text).toContain('Productivity:');
    });

    it('should include createIfNotExists in instructions', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      const result = await workflow.generate({ date: 'today' });

      expect(result.messages[1].content.text).toContain('createIfNotExists: true');
    });
  });

  describe('date handling', () => {
    it('should default to "today" when no date provided', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      await workflow.generate({});

      expect(defaultCachedHandlers.daily.handleRequest).toHaveBeenCalledWith(
        'vault://daily/today'
      );
    });

    it('should use provided date', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      await workflow.generate({ date: '2024-12-25' });

      expect(defaultCachedHandlers.daily.handleRequest).toHaveBeenCalledWith(
        'vault://daily/2024-12-25'
      );
    });

    it('should handle "yesterday" keyword', async () => {
      vi.mocked(defaultCachedHandlers.daily.handleRequest).mockRejectedValue(
        new Error('Note not found')
      );

      await workflow.generate({ date: 'yesterday' });

      expect(defaultCachedHandlers.daily.handleRequest).toHaveBeenCalledWith(
        'vault://daily/yesterday'
      );
    });
  });

  describe('getDefinition', () => {
    it('should return prompt definition', () => {
      const definition = workflow.getDefinition();

      expect(definition.name).toBe('daily_note_workflow');
      expect(definition.description).toBeTruthy();
      expect(definition.arguments).toHaveLength(2);
      expect(definition.arguments![0].name).toBe('date');
      expect(definition.arguments![1].name).toBe('template');
    });
  });
});
