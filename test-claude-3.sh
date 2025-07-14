#!/bin/bash
# Test 3: Update frontmatter

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_vault"

/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "I have an Obsidian note at test-docs/mcp-guide.md and I need to add tags to its frontmatter. Please add the tags: technical, integration, and mcp" > claude-test-3-output.txt 2>&1

echo "Test 3 completed. Output saved to claude-test-3-output.txt"