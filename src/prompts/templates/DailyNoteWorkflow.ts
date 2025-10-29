/**
 * Daily Note Workflow Prompt
 *
 * Orchestrates daily note access and creation workflow
 */

import { BasePrompt } from '../BasePrompt.js';
import type { PromptResult } from '../types.js';
import { defaultCachedHandlers } from '../../resources/CachedConcreteHandlers.js';

/**
 * Daily Note Workflow Prompt
 *
 * Provides intelligent guidance for accessing or creating daily notes.
 * Checks if the note exists and provides appropriate next steps.
 */
export class DailyNoteWorkflow extends BasePrompt {
  readonly name = 'daily_note_workflow';
  readonly description =
    'Access or create daily note with optional template. Checks if note exists and guides through creation if needed.';

  readonly arguments = [
    {
      name: 'date',
      description:
        'Date in YYYY-MM-DD format, or "today"/"yesterday" (default: today)',
      required: false,
    },
    {
      name: 'template',
      description: 'Optional template content for new daily notes',
      required: false,
    },
  ];

  /**
   * Generate daily note workflow prompt
   */
  async generate(args: Record<string, string>): Promise<PromptResult> {
    this.validateArguments(args);

    // Default to today if no date provided
    const date = args.date || 'today';
    const template = args.template;

    // Check if daily note exists via resource
    const dailyUri = `vault://daily/${date}`;
    let noteExists = false;
    let noteContent = '';

    try {
      // Try to access the daily note resource
      const result = await defaultCachedHandlers.daily.handleRequest(dailyUri);

      // Note exists - extract content from text or blob response
      noteExists = true;
      if ('text' in result.contents[0]) {
        noteContent = result.contents[0].text;
      } else if ('blob' in result.contents[0]) {
        // Decode base64 blob
        noteContent = Buffer.from(result.contents[0].blob, 'base64').toString('utf-8');
      }
    } catch (error) {
      // Note doesn't exist - this is expected for new notes
      noteExists = false;
    }

    // Generate appropriate messages based on note existence
    if (noteExists) {
      return this.generateExistingNotePrompt(date, noteContent);
    } else {
      return this.generateNewNotePrompt(date, template);
    }
  }

  /**
   * Generate prompt for existing note
   */
  private generateExistingNotePrompt(date: string, content: string): PromptResult {
    // Provide preview of existing content (first 500 chars)
    const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
    const wordCount = content.split(/\s+/).length;
    const lineCount = content.split('\n').length;

    const userMessage = this.createUserMessage(
      `Access my daily note for ${date}`
    );

    const assistantMessage = this.createAssistantMessage(
      `✓ Daily note exists for ${date}\n\n` +
        `**Statistics:**\n` +
        `- ${wordCount} words\n` +
        `- ${lineCount} lines\n\n` +
        `**Preview:**\n\`\`\`\n${preview}\n\`\`\`\n\n` +
        `**Available Actions:**\n` +
        `1. Read full content: Use \`obsidian_get_file_contents\` tool\n` +
        `2. Append content: Use \`obsidian_append_content\` tool\n` +
        `3. Edit content: Use \`obsidian_edit\` tool\n\n` +
        `The note is ready for your updates!`
    );

    return {
      description: `Daily note workflow for ${date} - note exists`,
      messages: [userMessage, assistantMessage],
    };
  }

  /**
   * Generate prompt for new note creation
   */
  private generateNewNotePrompt(date: string, template?: string): PromptResult {
    const userMessage = this.createUserMessage(
      template
        ? `Create my daily note for ${date} with template`
        : `Create my daily note for ${date}`
    );

    let instructions = `✓ Daily note for ${date} does not exist yet\n\n`;

    if (template) {
      instructions +=
        `**Template Provided:**\n\`\`\`\n${template}\n\`\`\`\n\n` +
        `**Next Step:**\n` +
        `Create the note using \`obsidian_append_content\` with:\n` +
        `- filepath: The daily note path (e.g., "Daily Notes/${date}.md")\n` +
        `- content: The template above\n` +
        `- createIfNotExists: true\n\n`;
    } else {
      instructions +=
        `**Next Step:**\n` +
        `Create the note using \`obsidian_append_content\` with:\n` +
        `- filepath: Your daily note path (e.g., "Daily Notes/${date}.md")\n` +
        `- content: Your initial note content\n` +
        `- createIfNotExists: true\n\n`;
    }

    instructions +=
      `**Common Daily Note Templates:**\n` +
      `1. Simple: "# ${date}\\n\\n## Tasks\\n- \\n\\n## Notes\\n"\n` +
      `2. Journaling: "# ${date}\\n\\n## Morning\\n\\n## Afternoon\\n\\n## Evening\\n"\n` +
      `3. Productivity: "# ${date}\\n\\n## Goals\\n- \\n\\n## Achievements\\n- \\n\\n## Reflections\\n"\n\n` +
      `Once created, you can append additional content throughout the day!`;

    const assistantMessage = this.createAssistantMessage(instructions);

    return {
      description: `Daily note workflow for ${date} - creation needed`,
      messages: [userMessage, assistantMessage],
    };
  }
}
