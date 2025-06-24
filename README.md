# Obsidian MCP Server (TypeScript)

A TypeScript MCP server to interact with Obsidian via the Local REST API community plugin.

**Note**: This is a TypeScript port of the original [mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) Python project by MarkusPfundstein. All credit for the original concept and API design goes to the original author.

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
  "mcp-obsidian": {
    "command": "uvx",
    "args": [
      "mcp-obsidian"
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
    "mcp-obsidian": {
      "command": "uv",
      "args": [
        "--directory",
        "<dir_to>/mcp-obsidian",
        "run",
        "mcp-obsidian"
      ]
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
    "mcp-obsidian": {
      "command": "uvx",
      "args": [
        "mcp-obsidian"
      ],
      "env": {
        "OBSIDIAN_API_KEY" : "<YOUR_OBSIDIAN_API_KEY>"
      }
    }
  }
}
```
</details>

## Development

### Building

To prepare the package for distribution:

1. Sync dependencies and update lockfile:
```bash
uv sync
```

### Testing

Run the test suite:

```bash
# Run all tests (unit tests only, unless OBSIDIAN_API_KEY is set)
uv run pytest

# Run only unit tests
uv run pytest tests/test_obsidian_client.py

# Run integration tests (requires Obsidian with REST API plugin)
OBSIDIAN_API_KEY=your-key uv run pytest tests/test_integration.py
```

See [TESTING.md](TESTING.md) for detailed testing instructions.

### Debugging

Since MCP servers run over stdio, debugging can be challenging. For the best debugging
experience, we strongly recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

You can launch the MCP Inspector via [`npm`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) with this command:

```bash
npx @modelcontextprotocol/inspector uv --directory /path/to/mcp-obsidian run mcp-obsidian
```

Upon launching, the Inspector will display a URL that you can access in your browser to begin debugging.

You can also watch the server logs with this command:

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp-server-mcp-obsidian.log
```
