#!/bin/bash
# Request feedback after tests

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_vault"

/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "Please review the outputs from claude-test-1-output.txt through claude-test-4-output.txt and append your experience report about using the patch_content_v2 tool to ./user-feedback.md. Use the format '## User Report YYYY-MM-DD HH:MM' and describe what worked well, what was confusing, and any errors you encountered." > claude-feedback-output.txt 2>&1

echo "Feedback request completed. Output saved to claude-feedback-output.txt"