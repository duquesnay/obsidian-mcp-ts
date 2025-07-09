#!/bin/bash
# Test 2: Insert content after a specific heading

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_vault"

/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "In my Obsidian vault, I want to add content after the '## Overview' section in test-docs/technical-spec.md. Add a paragraph about 'The system uses a microservices architecture with Docker containers for deployment.'" > claude-test-2-output.txt 2>&1

echo "Test 2 completed. Output saved to claude-test-2-output.txt"