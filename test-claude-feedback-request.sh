#!/bin/bash
# Request Claude to provide feedback about the tools

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content"

echo "Requesting Claude to provide feedback..."
/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS,Write" -p "Based on your recent experience with Obsidian MCP tools, please write a feedback report to user-feedback.md. Include: 1) Which tools you tried to use for appending content and inserting after headings, 2) What was intuitive vs confusing, 3) Whether you used patch_content_v2 or fell back to simpler tools like append_content. Format as '## User Report YYYY-MM-DD HH:MM'" > claude-feedback-request.txt 2>&1

echo "Feedback request completed."