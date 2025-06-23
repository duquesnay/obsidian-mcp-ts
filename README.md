# MCP server for Obsidian

MCP server to interact with Obsidian via the Local REST API community plugin.

<a href="https://glama.ai/mcp/servers/3wko1bhuek"><img width="380" height="200" src="https://glama.ai/mcp/servers/3wko1bhuek/badge" alt="server for Obsidian MCP server" /></a>

## Components

### Tools

The server implements multiple tools to interact with Obsidian:

- list_files_in_vault: Lists all files and directories in the root directory of your Obsidian vault
- list_files_in_dir: Lists all files and directories in a specific Obsidian directory
- get_file_contents: Return the content of a single file in your vault
- batch_get_file_contents: Return the contents of multiple files in your vault, concatenated with headers
- simple_search: Simple search for documents matching a specified text query across all files in the vault
- complex_search: Complex search for documents using a JsonLogic query
- patch_content: Insert content into an existing note relative to a heading, block reference, or frontmatter field
- append_content: Append content to a new or existing file in the vault
- delete_file: Delete a file or directory from your vault
- rename_file: Rename a file within the same directory while preserving history and updating links (requires updated REST API plugin)
- move_file: Move a file to a different location (can move between directories, rename in place, or both) while preserving history and updating links (requires updated REST API plugin)
- get_periodic_note: Get current periodic note for the specified period (daily, weekly, monthly, quarterly, yearly)
- get_recent_periodic_notes: Get most recent periodic notes for the specified period type
- get_recent_changes: Get recently modified files in the vault

### Example prompts

Its good to first instruct Claude to use Obsidian. Then it will always call the tool.

The use prompts like this:
- Get the contents of the last architecture call note and summarize them
- Search for all files where Azure CosmosDb is mentioned and quickly explain to me the context in which it is mentioned
- Summarize the last meeting notes and put them into a new note 'summary meeting.md'. Add an introduction so that I can send it via email.
- Rename my file 'draft-proposal.md' to 'final-proposal-2024.md'
- Move 'inbox/todo.md' to 'projects/active/todo.md' to reorganize it
- Move all files from the 'inbox' folder to 'processed/2024' folder

## Configuration

### Obsidian REST API Key

There are two ways to configure the environment with the Obsidian REST API Key. 

1. Add to server config (preferred)

```json
{
  "obsidian": {
    "command": "uvx",
    "args": [
      "obsidian-mcp"
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
    "obsidian": {
      "command": "node",
      "args": [
        "<path_to>/obsidian-mcp/dist/index.js"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "<YOUR_OBSIDIAN_API_KEY>",
        "OBSIDIAN_HOST": "127.0.0.1"
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
    "obsidian": {
      "command": "npx",
      "args": [
        "obsidian-mcp"
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
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Type checking
npm run typecheck
```

### Development Mode

For development with automatic recompilation:

```bash
npm run dev
```

### Debugging

Since MCP servers run over stdio, debugging can be challenging. For the best debugging
experience, we strongly recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

You can launch the MCP Inspector via [`npm`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) with this command:

```bash
npx @modelcontextprotocol/inspector node /path/to/obsidian-mcp/dist/index.js
```

Upon launching, the Inspector will display a URL that you can access in your browser to begin debugging.

You can also watch the server logs with this command:

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp-server-obsidian.log
```
