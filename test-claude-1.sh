#!/bin/bash
# Test 1: Add content to end of document

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_vault"

/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "Add 'In summary, this project demonstrates the power of MCP integration.' to the end of my Obsidian note at test-docs/project-overview.md" > claude-test-1-output.txt 2>&1

echo "Test 1 completed. Output saved to claude-test-1-output.txt"