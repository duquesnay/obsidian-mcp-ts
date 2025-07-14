#!/bin/bash
# Test 4: Replace content

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_vault"

/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "In my Obsidian notes, I need to update test-docs/project-overview.md by replacing 'Feature 1' with 'Advanced Analytics Module'" > claude-test-4-output.txt 2>&1

echo "Test 4 completed. Output saved to claude-test-4-output.txt"