import { describe, it, expect, beforeEach } from 'vitest';
import { BatchTagOperation } from '../../../src/prompts/templates/BatchTagOperation.js';

describe('BatchTagOperation', () => {
  let prompt: BatchTagOperation;

  beforeEach(() => {
    prompt = new BatchTagOperation();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(prompt.name).toBe('batch_tag_operation');
    });

    it('should have description', () => {
      expect(prompt.description).toContain('batch tag');
    });

    it('should define required and optional arguments', () => {
      expect(prompt.arguments).toHaveLength(4);

      const sourceTag = prompt.arguments.find(a => a.name === 'source_tag');
      expect(sourceTag?.required).toBe(true);

      const operation = prompt.arguments.find(a => a.name === 'operation');
      expect(operation?.required).toBe(true);

      const targetTag = prompt.arguments.find(a => a.name === 'target_tag');
      expect(targetTag?.required).toBe(false);

      const location = prompt.arguments.find(a => a.name === 'location');
      expect(location?.required).toBe(false);
    });
  });

  describe('validation', () => {
    it('should require source_tag', async () => {
      await expect(
        prompt.generate({ operation: 'add' })
      ).rejects.toThrow("Required argument 'source_tag' is missing");
    });

    it('should require operation', async () => {
      await expect(
        prompt.generate({ source_tag: 'test' })
      ).rejects.toThrow("Required argument 'operation' is missing");
    });

    it('should validate operation type', async () => {
      await expect(
        prompt.generate({ source_tag: 'test', operation: 'invalid' })
      ).rejects.toThrow('Invalid operation');
    });

    it('should require target_tag for rename operation', async () => {
      await expect(
        prompt.generate({ source_tag: 'old', operation: 'rename' })
      ).rejects.toThrow('target_tag is required for rename operation');
    });

    it('should validate location parameter', async () => {
      await expect(
        prompt.generate({
          source_tag: 'test',
          operation: 'add',
          location: 'invalid',
        })
      ).rejects.toThrow('Invalid location');
    });

    it('should accept valid operations', async () => {
      for (const op of ['add', 'remove', 'rename']) {
        const args: Record<string, string> = {
          source_tag: 'test',
          operation: op,
        };
        if (op === 'rename') {
          args.target_tag = 'new';
        }

        const result = await prompt.generate(args);
        expect(result.messages).toBeDefined();
      }
    });

    it('should accept valid locations', async () => {
      for (const loc of ['frontmatter', 'inline', 'both']) {
        const result = await prompt.generate({
          source_tag: 'test',
          operation: 'add',
          location: loc,
        });
        expect(result.messages).toBeDefined();
      }
    });
  });

  describe('add operation', () => {
    it('should generate add tag prompt with default location', async () => {
      const result = await prompt.generate({
        source_tag: 'project',
        operation: 'add',
      });

      expect(result.description).toContain('Batch add tag #project');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toContain('#project');
      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content.text).toContain('Batch Tag Addition');
    });

    it('should include tool usage guidance', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'add',
      });

      const instructions = result.messages[1].content.text;
      expect(instructions).toContain('obsidian_simple_search');
      expect(instructions).toContain('obsidian_list_files_in_dir');
      expect(instructions).toContain('obsidian_get_files_by_tag');
      expect(instructions).toContain('obsidian_manage_file_tags');
    });

    it('should provide workflow steps', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'add',
      });

      const instructions = result.messages[1].content.text;
      expect(instructions).toContain('Step 1');
      expect(instructions).toContain('Step 2');
    });

    it('should mention batch processing benefits', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'add',
      });

      expect(result.messages[1].content.text).toContain('10-100x faster');
      expect(result.messages[1].content.text).toContain('Auto-deduplication');
    });

    it('should respect custom location', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'add',
        location: 'inline',
      });

      expect(result.messages[0].content.text).toContain('inline');
      expect(result.messages[1].content.text).toContain('location: "inline"');
    });
  });

  describe('remove operation', () => {
    it('should generate remove tag prompt', async () => {
      const result = await prompt.generate({
        source_tag: 'archived',
        operation: 'remove',
      });

      expect(result.description).toContain('Batch remove tag #archived');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content.text).toContain('Batch Tag Removal');
    });

    it('should use obsidian_get_files_by_tag to find files', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'remove',
      });

      expect(result.messages[1].content.text).toContain('obsidian_get_files_by_tag');
      expect(result.messages[1].content.text).toContain('tagName: "test"');
    });

    it('should provide removal workflow', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'remove',
      });

      const instructions = result.messages[1].content.text;
      expect(instructions).toContain('Step 1');
      expect(instructions).toContain('Step 2');
      expect(instructions).toContain('operation: "remove"');
    });

    it('should include safety warning', async () => {
      const result = await prompt.generate({
        source_tag: 'test',
        operation: 'remove',
      });

      expect(result.messages[1].content.text).toContain('Safety');
      expect(result.messages[1].content.text).toContain('Review file list');
    });
  });

  describe('rename operation', () => {
    it('should generate rename tag prompt', async () => {
      const result = await prompt.generate({
        source_tag: 'old-tag',
        operation: 'rename',
        target_tag: 'new-tag',
      });

      expect(result.description).toContain('Batch rename tag #old-tag to #new-tag');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content.text).toContain('Batch Tag Rename');
    });

    it('should recommend obsidian_rename_tag tool', async () => {
      const result = await prompt.generate({
        source_tag: 'old',
        operation: 'rename',
        target_tag: 'new',
      });

      const instructions = result.messages[1].content.text;
      expect(instructions).toContain('Option 1: Direct Rename (Recommended)');
      expect(instructions).toContain('obsidian_rename_tag');
      expect(instructions).toContain('oldTagName: "old"');
      expect(instructions).toContain('newTagName: "new"');
    });

    it('should provide manual two-step alternative', async () => {
      const result = await prompt.generate({
        source_tag: 'old',
        operation: 'rename',
        target_tag: 'new',
      });

      const instructions = result.messages[1].content.text;
      expect(instructions).toContain('Option 2: Manual Two-Step Process');
      expect(instructions).toContain('Step 1: Add new tag');
      expect(instructions).toContain('Step 2: Remove old tag');
    });

    it('should explain automatic benefits', async () => {
      const result = await prompt.generate({
        source_tag: 'old',
        operation: 'rename',
        target_tag: 'new',
      });

      const instructions = result.messages[1].content.text;
      expect(instructions).toContain('automatically');
      expect(instructions).toContain('Updates both inline');
      expect(instructions).toContain('frontmatter');
    });
  });

  describe('getDefinition', () => {
    it('should return prompt definition', () => {
      const definition = prompt.getDefinition();

      expect(definition.name).toBe('batch_tag_operation');
      expect(definition.description).toBeTruthy();
      expect(definition.arguments).toHaveLength(4);
    });
  });
});
