/**
 * Batch Tag Operation Prompt
 *
 * Orchestrates batch tag operations across multiple files
 */

import { BasePrompt } from '../BasePrompt.js';
import type { PromptResult } from '../types.js';

/**
 * Batch Tag Operation Prompt
 *
 * Provides step-by-step guidance for performing batch tag operations:
 * - Add tags to files matching criteria
 * - Remove tags from files
 * - Rename tags across all files
 */
export class BatchTagOperation extends BasePrompt {
  readonly name = 'batch_tag_operation';
  readonly description =
    'Guide for batch tag operations: add, remove, or rename tags across multiple files. Provides workflow for finding files and performing operations.';

  readonly arguments = [
    {
      name: 'source_tag',
      description: 'Tag to find files with (for add/remove) or tag to rename (for rename)',
      required: true,
    },
    {
      name: 'operation',
      description: 'Operation to perform: "add", "remove", or "rename"',
      required: true,
    },
    {
      name: 'target_tag',
      description: 'New tag name (required for rename operation)',
      required: false,
    },
    {
      name: 'location',
      description: 'Where to modify tags: "frontmatter", "inline", or "both" (default: frontmatter)',
      required: false,
    },
  ];

  /**
   * Generate batch tag operation prompt
   */
  async generate(args: Record<string, string>): Promise<PromptResult> {
    this.validateArguments(args);

    const sourceTag = args.source_tag;
    const operation = args.operation.toLowerCase();
    const targetTag = args.target_tag;
    const location = args.location || 'frontmatter';

    // Validate operation type
    if (!['add', 'remove', 'rename'].includes(operation)) {
      throw new Error(
        `Invalid operation '${operation}'. Must be: add, remove, or rename`
      );
    }

    // Validate rename operation has target tag
    if (operation === 'rename' && !targetTag) {
      throw new Error('target_tag is required for rename operation');
    }

    // Validate location
    if (!['frontmatter', 'inline', 'both'].includes(location)) {
      throw new Error(
        `Invalid location '${location}'. Must be: frontmatter, inline, or both`
      );
    }

    // Generate appropriate prompt based on operation
    switch (operation) {
      case 'add':
        return this.generateAddTagPrompt(sourceTag, location);
      case 'remove':
        return this.generateRemoveTagPrompt(sourceTag, location);
      case 'rename':
        return this.generateRenameTagPrompt(sourceTag, targetTag!, location);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Generate prompt for adding tags
   */
  private generateAddTagPrompt(tag: string, location: string): PromptResult {
    const userMessage = this.createUserMessage(
      `Add tag #${tag} to files in ${location}`
    );

    const assistantMessage = this.createAssistantMessage(
      `**Batch Tag Addition Workflow**\n\n` +
        `**Goal:** Add #${tag} to files (location: ${location})\n\n` +
        `**Step 1: Find Target Files**\n` +
        `First, identify which files should receive the tag. Common approaches:\n\n` +
        `1. Search for content:\n` +
        `   \`\`\`\n` +
        `   obsidian_simple_search({ query: "search term" })\n` +
        `   \`\`\`\n\n` +
        `2. Find files in folder:\n` +
        `   \`\`\`\n` +
        `   obsidian_list_files_in_dir({ dirpath: "folder/path" })\n` +
        `   \`\`\`\n\n` +
        `3. Find files with another tag:\n` +
        `   \`\`\`\n` +
        `   obsidian_get_files_by_tag({ tagName: "existing-tag" })\n` +
        `   \`\`\`\n\n` +
        `**Step 2: Add Tags to Files**\n` +
        `For each file path from Step 1, add the tag:\n\n` +
        `\`\`\`\n` +
        `obsidian_manage_file_tags({\n` +
        `  filePath: "path/to/file.md",\n` +
        `  operation: "add",\n` +
        `  tags: ["${tag}"],\n` +
        `  location: "${location}"\n` +
        `})\n` +
        `\`\`\`\n\n` +
        `**Batch Processing:**\n` +
        `- Process multiple files in sequence\n` +
        `- The tool supports adding multiple tags at once (10-100x faster than individual operations)\n` +
        `- Auto-deduplication: Skips tags that already exist\n\n` +
        `**Example Workflow:**\n` +
        `\`\`\`\n` +
        `// 1. Find files in project folder\n` +
        `const files = await obsidian_list_files_in_dir({ dirpath: "Projects/Active" });\n\n` +
        `// 2. Add tag to each file\n` +
        `for (const file of files) {\n` +
        `  await obsidian_manage_file_tags({\n` +
        `    filePath: file.path,\n` +
        `    operation: "add",\n` +
        `    tags: ["${tag}"],\n` +
        `    location: "${location}"\n` +
        `  });\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `Ready to start? Identify your target files first!`
    );

    return {
      description: `Batch add tag #${tag} to files`,
      messages: [userMessage, assistantMessage],
    };
  }

  /**
   * Generate prompt for removing tags
   */
  private generateRemoveTagPrompt(tag: string, location: string): PromptResult {
    const userMessage = this.createUserMessage(
      `Remove tag #${tag} from files in ${location}`
    );

    const assistantMessage = this.createAssistantMessage(
      `**Batch Tag Removal Workflow**\n\n` +
        `**Goal:** Remove #${tag} from files (location: ${location})\n\n` +
        `**Step 1: Find Files with Tag**\n` +
        `Find all files that have the tag:\n\n` +
        `\`\`\`\n` +
        `obsidian_get_files_by_tag({ tagName: "${tag}" })\n` +
        `\`\`\`\n\n` +
        `This returns a list of files that contain #${tag}.\n\n` +
        `**Step 2: Remove Tag from Files**\n` +
        `For each file from Step 1, remove the tag:\n\n` +
        `\`\`\`\n` +
        `obsidian_manage_file_tags({\n` +
        `  filePath: "path/to/file.md",\n` +
        `  operation: "remove",\n` +
        `  tags: ["${tag}"],\n` +
        `  location: "${location}"\n` +
        `})\n` +
        `\`\`\`\n\n` +
        `**Batch Processing:**\n` +
        `- Process multiple files in sequence\n` +
        `- The tool supports removing multiple tags at once (10-100x faster)\n` +
        `- Auto-skip: Ignores tags that don't exist\n\n` +
        `**Example Workflow:**\n` +
        `\`\`\`\n` +
        `// 1. Find all files with the tag\n` +
        `const files = await obsidian_get_files_by_tag({ tagName: "${tag}" });\n\n` +
        `// 2. Remove tag from each file\n` +
        `for (const file of files) {\n` +
        `  await obsidian_manage_file_tags({\n` +
        `    filePath: file.path,\n` +
        `    operation: "remove",\n` +
        `    tags: ["${tag}"],\n` +
        `    location: "${location}"\n` +
        `  });\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `**Safety:** Review file list before removal to avoid unintended changes.\n\n` +
        `Ready to proceed?`
    );

    return {
      description: `Batch remove tag #${tag} from files`,
      messages: [userMessage, assistantMessage],
    };
  }

  /**
   * Generate prompt for renaming tags
   */
  private generateRenameTagPrompt(
    oldTag: string,
    newTag: string,
    location: string
  ): PromptResult {
    const userMessage = this.createUserMessage(
      `Rename tag #${oldTag} to #${newTag} in ${location}`
    );

    const assistantMessage = this.createAssistantMessage(
      `**Batch Tag Rename Workflow**\n\n` +
        `**Goal:** Rename #${oldTag} → #${newTag} (location: ${location})\n\n` +
        `**Option 1: Direct Rename (Recommended)**\n` +
        `Use the built-in rename tool for automatic, vault-wide renaming:\n\n` +
        `\`\`\`\n` +
        `obsidian_rename_tag({\n` +
        `  oldTagName: "${oldTag}",\n` +
        `  newTagName: "${newTag}"\n` +
        `})\n` +
        `\`\`\`\n\n` +
        `This automatically:\n` +
        `- Finds all files with #${oldTag}\n` +
        `- Updates both inline (#${oldTag}) and frontmatter tags\n` +
        `- Handles all edge cases\n` +
        `- Provides summary of changes\n\n` +
        `**Option 2: Manual Two-Step Process**\n` +
        `If you need more control, use a two-step approach:\n\n` +
        `**Step 1: Add new tag**\n` +
        `\`\`\`\n` +
        `// Find files with old tag\n` +
        `const files = await obsidian_get_files_by_tag({ tagName: "${oldTag}" });\n\n` +
        `// Add new tag to each file\n` +
        `for (const file of files) {\n` +
        `  await obsidian_manage_file_tags({\n` +
        `    filePath: file.path,\n` +
        `    operation: "add",\n` +
        `    tags: ["${newTag}"],\n` +
        `    location: "${location}"\n` +
        `  });\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `**Step 2: Remove old tag**\n` +
        `\`\`\`\n` +
        `// Remove old tag from each file\n` +
        `for (const file of files) {\n` +
        `  await obsidian_manage_file_tags({\n` +
        `    filePath: file.path,\n` +
        `    operation: "remove",\n` +
        `    tags: ["${oldTag}"],\n` +
        `    location: "${location}"\n` +
        `  });\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `**Recommendation:** Use Option 1 (obsidian_rename_tag) for simplicity and reliability.\n\n` +
        `Which approach would you like to use?`
    );

    return {
      description: `Batch rename tag #${oldTag} to #${newTag}`,
      messages: [userMessage, assistantMessage],
    };
  }
}
