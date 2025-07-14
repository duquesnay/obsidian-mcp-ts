#!/bin/bash
# Test Claude with explicit tool permissions

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir"

echo "Running Claude test 1 with permissions..."
/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "Add 'In summary, this project demonstrates the power of MCP integration.' to the end of my Obsidian note at test-docs/project-overview.md" > claude-perm-test-1.txt 2>&1

echo "Running Claude test 2 with permissions..."
/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "In my Obsidian vault, add content after the '## Overview' section in test-docs/technical-spec.md. Add: 'The system uses a microservices architecture.'" > claude-perm-test-2.txt 2>&1

echo "Tests completed. Check output files."