import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from '../../../src/prompts/PromptRegistry.js';
import { BasePrompt } from '../../../src/prompts/BasePrompt.js';
import type { PromptResult } from '../../../src/prompts/types.js';

// Mock prompt for testing
class MockPrompt extends BasePrompt {
  readonly name = 'test_prompt';
  readonly description = 'A test prompt';
  readonly arguments = [
    { name: 'arg1', description: 'First argument', required: true },
    { name: 'arg2', description: 'Second argument', required: false },
  ];

  async generate(args: Record<string, string>): Promise<PromptResult> {
    this.validateArguments(args);
    return {
      description: 'Test result',
      messages: [
        this.createUserMessage('Test user message'),
        this.createAssistantMessage(`Response with ${args.arg1}`),
      ],
    };
  }
}

// Another mock prompt
class AnotherMockPrompt extends BasePrompt {
  readonly name = 'another_prompt';
  readonly description = 'Another test prompt';
  readonly arguments = [];

  async generate(_args: Record<string, string>): Promise<PromptResult> {
    return {
      messages: [this.createUserMessage('Simple prompt')],
    };
  }
}

describe('PromptRegistry', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  describe('registerPrompt', () => {
    it('should register a prompt successfully', () => {
      const prompt = new MockPrompt();
      registry.registerPrompt(prompt);
      expect(registry.size).toBe(1);
      expect(registry.hasPrompt('test_prompt')).toBe(true);
    });

    it('should throw error for duplicate prompt names', () => {
      const prompt1 = new MockPrompt();
      const prompt2 = new MockPrompt();

      registry.registerPrompt(prompt1);
      expect(() => registry.registerPrompt(prompt2)).toThrow(
        "Prompt 'test_prompt' is already registered"
      );
    });

    it('should allow multiple prompts with different names', () => {
      registry.registerPrompt(new MockPrompt());
      registry.registerPrompt(new AnotherMockPrompt());
      expect(registry.size).toBe(2);
    });
  });

  describe('registerPrompts', () => {
    it('should register multiple prompts at once', () => {
      const prompts = [new MockPrompt(), new AnotherMockPrompt()];
      registry.registerPrompts(prompts);
      expect(registry.size).toBe(2);
    });

    it('should throw error if any prompt has duplicate name', () => {
      const prompts = [new MockPrompt(), new MockPrompt()];
      expect(() => registry.registerPrompts(prompts)).toThrow();
      // First one registered, second failed
      expect(registry.size).toBe(1);
    });
  });

  describe('listPrompts', () => {
    it('should return empty array when no prompts registered', () => {
      expect(registry.listPrompts()).toEqual([]);
    });

    it('should return all registered prompt definitions', () => {
      registry.registerPrompt(new MockPrompt());
      registry.registerPrompt(new AnotherMockPrompt());

      const prompts = registry.listPrompts();
      expect(prompts).toHaveLength(2);
      expect(prompts[0].name).toBe('test_prompt');
      expect(prompts[0].description).toBe('A test prompt');
      expect(prompts[0].arguments).toHaveLength(2);
      expect(prompts[1].name).toBe('another_prompt');
      expect(prompts[1].arguments).toBeUndefined(); // Empty array becomes undefined
    });

    it('should include argument definitions', () => {
      registry.registerPrompt(new MockPrompt());
      const prompts = registry.listPrompts();

      expect(prompts[0].arguments).toBeDefined();
      expect(prompts[0].arguments![0]).toEqual({
        name: 'arg1',
        description: 'First argument',
        required: true,
      });
    });
  });

  describe('getPrompt', () => {
    it('should retrieve registered prompt by name', () => {
      const prompt = new MockPrompt();
      registry.registerPrompt(prompt);

      const retrieved = registry.getPrompt('test_prompt');
      expect(retrieved).toBe(prompt);
    });

    it('should throw error for non-existent prompt', () => {
      expect(() => registry.getPrompt('nonexistent')).toThrow(
        "Prompt 'nonexistent' not found"
      );
    });
  });

  describe('hasPrompt', () => {
    it('should return true for registered prompt', () => {
      registry.registerPrompt(new MockPrompt());
      expect(registry.hasPrompt('test_prompt')).toBe(true);
    });

    it('should return false for non-existent prompt', () => {
      expect(registry.hasPrompt('nonexistent')).toBe(false);
    });
  });

  describe('generate', () => {
    it('should generate prompt with valid arguments', async () => {
      registry.registerPrompt(new MockPrompt());

      const result = await registry.generate('test_prompt', { arg1: 'value1' });

      expect(result.description).toBe('Test result');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content.text).toContain('value1');
    });

    it('should throw error for missing required arguments', async () => {
      registry.registerPrompt(new MockPrompt());

      await expect(registry.generate('test_prompt', {})).rejects.toThrow(
        "Required argument 'arg1' is missing"
      );
    });

    it('should throw error for non-existent prompt', async () => {
      await expect(registry.generate('nonexistent', {})).rejects.toThrow(
        "Prompt 'nonexistent' not found"
      );
    });

    it('should work with empty arguments for prompts without requirements', async () => {
      registry.registerPrompt(new AnotherMockPrompt());

      const result = await registry.generate('another_prompt', {});
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('size', () => {
    it('should return correct prompt count', () => {
      expect(registry.size).toBe(0);

      registry.registerPrompt(new MockPrompt());
      expect(registry.size).toBe(1);

      registry.registerPrompt(new AnotherMockPrompt());
      expect(registry.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all registered prompts', () => {
      registry.registerPrompts([new MockPrompt(), new AnotherMockPrompt()]);
      expect(registry.size).toBe(2);

      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.listPrompts()).toEqual([]);
    });
  });
});
