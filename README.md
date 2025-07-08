# Obsidian MCP Server (TypeScript)

A TypeScript MCP server to interact with Obsidian via the Local REST API community plugin.

**Note**: This is a TypeScript port of the original [mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) Python project by MarkusPfundstein. All credit for the original concept and API design goes to the original author.

## Components

### Tools

The server implements multiple tools to interact with Obsidian:

- list_files_in_vault: Lists all files and directories in the root directory of your Obsidian vault
- list_files_in_dir: Lists all files and directories in a specific Obsidian directory (now returns empty array for empty directories instead of error)
- find_empty_directories: Find all empty directories in your vault by scanning the directory structure
- get_file_contents: Return the content of a single file in your vault
- batch_get_file_contents: Return the contents of multiple files in your vault, concatenated with headers
- simple_search: Simple search for documents matching a specified text query across all files in the vault
- complex_search: Complex search for documents using a JsonLogic query
- patch_content: Insert or replace content in a note - supports find/replace operations, inserting at headings/blocks, and frontmatter updates
- query_structure: Query document structure to get headings, blocks, and sections - useful for LLMs to build unambiguous references before modifying content
- patch_content_v2: LLM-ergonomic content modification with explicit operations and deterministic targeting - use query_structure first for unambiguous references
- append_content: Append content to a new or existing file in the vault
- delete_file: Delete a file or directory from your vault
- rename_file: Rename a file within the same directory while preserving history and updating links (requires updated REST API plugin)
- move_file: Move a file to a different location (can move between directories, rename in place, or both) while preserving history and updating links (requires updated REST API plugin)
- move_directory: Move an entire directory and all its contents to a different location while preserving the internal structure and updating all links
- copy_file: Copy a file to a new location within the vault, creating a duplicate with all content preserved
- copy_directory: Copy an entire directory and all its contents to a new location, preserving the internal structure
- check_path_exists: Check if a file or directory exists in the vault and determine its type
- create_directory: Create a new directory in the vault, with support for creating nested directory structures
- delete_directory: Delete a directory from the vault, with optional recursive deletion of contents
- get_all_tags: List all unique tags in the vault with their usage counts
- get_files_by_tag: Get all files that contain a specific tag
- rename_tag: Rename a tag across the entire vault
- manage_file_tags: Add or remove tags from a specific file
- get_periodic_note: Get current periodic note for the specified period (daily, weekly, monthly, quarterly, yearly)
- get_recent_periodic_notes: Get most recent periodic notes for the specified period type
- get_recent_changes: Get recently modified files in the vault
- advanced_search: Advanced search with comprehensive filtering options including content, frontmatter, file metadata, and tags
- get_file_metadata: Get file metadata (size, dates, permissions) without retrieving content - efficient for large files
- get_file_frontmatter: Get only the frontmatter of a file without content - efficient for metadata analysis
- get_file_formatted: Get file in different formats (plain text, HTML, etc.) for token optimization

### Example prompts

Its good to first instruct Claude to use Obsidian. Then it will always call the tool.

The use prompts like this:
- Get the contents of the last architecture call note and summarize them
- Search for all files where Azure CosmosDb is mentioned and quickly explain to me the context in which it is mentioned
- Summarize the last meeting notes and put them into a new note 'summary meeting.md'. Add an introduction so that I can send it via email.
- Rename my file 'draft-proposal.md' to 'final-proposal-2024.md'
- Replace all occurrences of '![[old-image.png]]' with '![[new-image.png]]' in my notes
- Find and replace 'TODO:' with '- [ ]' in meeting-notes.md to convert to checkboxes
- Move 'inbox/todo.md' to 'projects/active/todo.md' to reorganize it
- Move all files from the 'inbox' folder to 'processed/2024' folder
- Move the entire 'drafts/2023' directory to 'archive/2023/drafts' to organize old content
- Copy 'templates/meeting-template.md' to 'meetings/2024-07-02-standup.md' for today's meeting
- Check if 'projects/important-project/' directory exists before creating new files there
- Create a new directory 'projects/2024/q3-initiatives' for organizing quarterly work
- Delete the empty 'old-drafts/' directory (moves to trash by default)
- Permanently delete 'temp-folder/' and all its contents with recursive=true and permanent=true
- Copy 'projects/template-structure/' to 'projects/new-client/' to reuse project structure
- List all tags in my vault to see which ones are most used
- Find all files tagged with #project to review my active projects
- Rename the tag #todo to #task across all my notes
- Add tags #meeting #important to today's meeting notes
- Search for files containing "API" that were modified in the last week
- Find all notes with frontmatter field "status" equal to "in-progress"
- Search for markdown files larger than 10KB containing regex pattern "TODO|FIXME"
- Get just the metadata for large-notes.md to check its size before reading
- Extract only the frontmatter from meeting-notes.md to analyze the tags and status
- Get today's daily note in plain text format without markdown formatting
- Retrieve project-readme.md as HTML for sharing outside Obsidian
- Find all empty directories in my vault for cleanup
- Search for empty directories within the 'archive' folder only
- List files in 'projects/drafts/' - will return empty array if the directory is empty

## Configuration

### Obsidian REST API Key

There are two ways to configure the environment with the Obsidian REST API Key. 

1. Add to server config (preferred)

```json
{
  "obsidian-mcp-ts": {
    "command": "npx",
    "args": [
      "obsidian-mcp-ts"
    ],
    "env": {
      "OBSIDIAN_API_KEY": "<your_api_key_here>",
      "OBSIDIAN_HOST": "<your_obsidian_host>"
    }
  }
}
```

2. Create a `.env` file in the working directory with the following required variable:

```
OBSIDIAN_API_KEY=your_api_key_here
OBSIDIAN_HOST=your_obsidian_host
```

Note: You can find the key in the Obsidian plugin config.

## Quickstart

### Install

#### Install from npm

```bash
npm install -g obsidian-mcp-ts
```

#### Obsidian REST API

You need the Obsidian REST API community plugin running: https://github.com/coddingtonbear/obsidian-local-rest-api

Install and enable it in the settings and copy the api key.

#### Claude Desktop

On MacOS: `~/Library/Application\ Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

<details>
  <summary>Development/Unpublished Servers Configuration</summary>
  
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "node",
      "args": [
        "<path_to>/obsidian-mcp-ts/dist/index.js"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "<YOUR_OBSIDIAN_API_KEY>"
      }
    }
  }
}
```
</details>

<details>
  <summary>Published Servers Configuration</summary>
  
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": [
        "obsidian-mcp-ts"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "<YOUR_OBSIDIAN_API_KEY>"
      }
    }
  }
}
```
</details>

## Development

### Building

To prepare the package for distribution:

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

### Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run integration tests (requires compiled code)
npm run build
npm run test:integration

# Run E2E tests against real Obsidian API
OBSIDIAN_API_KEY=your-key npm run test:e2e

# Run tests in watch mode during development
npm run test -- --watch
```

### Debugging

Since MCP servers run over stdio, debugging can be challenging. For the best debugging
experience, we strongly recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

You can launch the MCP Inspector via [`npm`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) with this command:

```bash
# For development (with TypeScript)
npx @modelcontextprotocol/inspector tsx src/index.ts

# For production (compiled)
npx @modelcontextprotocol/inspector node dist/index.js
```

Upon launching, the Inspector will display a URL that you can access in your browser to begin debugging.

You can also watch the server logs with this command:

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp-server-obsidian-mcp-ts.log
```

### Development Commands

```bash
# Run in development mode with auto-reload
npm run dev

# Type check without building
npm run typecheck

# Build for production
npm run build

# Run the built server
npm start
```
