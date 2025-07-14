#!/bin/bash
# Combined test with feedback logging

TOOLS="mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_dir,mcp__obsidian-ts-0_5-alpha__obsidian_list_files_in_vault"

echo "Running Claude test for patch_content_v2 ergonomics..."

# Create a test prompt that asks Claude to document their experience
/Users/guillaume/.claude/local/claude --allowedTools "$TOOLS" -p "I need you to test the Obsidian MCP tools and provide feedback. Try to: 1) Add 'Conclusion: This demonstrates MCP power.' to end of test-docs/project-overview.md, 2) Document your experience with any tools you tried to use, especially patch_content_v2, 3) Write your feedback to user-feedback.md with format '## User Report YYYY-MM-DD HH:MM'. Focus on what was intuitive vs confusing about the tool interfaces." > claude-combined-output.txt 2>&1

echo "Test completed. Check claude-combined-output.txt and user-feedback.md"