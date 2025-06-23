# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

obsidian-mcp is a Model Context Protocol (MCP) server that provides an interface for AI assistants to interact with Obsidian vaults via the Local REST API community plugin. It enables reading, writing, searching, and managing notes programmatically.

## Development Commands

### Setup and Dependencies
```bash
# Install dependencies
uv sync

# Run the server directly (for debugging)
uv --directory /path/to/obsidian-mcp run obsidian-mcp
```

### Debugging
```bash
# Use MCP Inspector for interactive debugging
npx @modelcontextprotocol/inspector uv --directory /path/to/obsidian-mcp run obsidian-mcp

# View logs on macOS
tail -f ~/Library/Logs/Claude/mcp-server-obsidian-mcp.log

# Environment setup for development
export OBSIDIAN_API_KEY=your_api_key_here
export OBSIDIAN_HOST=127.0.0.1  # Optional, defaults to 127.0.0.1
```

## Architecture

### Core Components

1. **server.py** - MCP server implementation
   - Handles stdio communication
   - Registers and invokes tools
   - Manages environment configuration

2. **tools.py** - Tool handlers
   - Implements 12 distinct MCP tools
   - Each tool is a standalone function with proper type hints
   - Handles parameter validation and error reporting

3. **obsidian.py** - REST API client
   - Manages HTTP communication with Obsidian
   - Handles authentication and request formatting
   - Implements proper error handling and timeouts

### Available Tools

1. **File Operations**
   - `obsidian_list_files_in_vault` - List all files
   - `obsidian_list_files_in_dir` - List files in directory
   - `obsidian_get_file_contents` - Read single file
   - `obsidian_batch_get_file_contents` - Read multiple files
   - `obsidian_delete_file` - Delete files/directories

2. **Content Manipulation**
   - `obsidian_append_content` - Append to files
   - `obsidian_patch_content` - Insert at headings/blocks

3. **Search**
   - `obsidian_simple_search` - Text search
   - `obsidian_complex_search` - JsonLogic queries

4. **Periodic Notes**
   - `obsidian_get_periodic_note` - Get current periodic note
   - `obsidian_get_recent_periodic_notes` - Get recent notes
   - `obsidian_get_recent_changes` - Track modifications

## Code Patterns

### Tool Implementation Pattern
```python
async def tool_name(arguments: dict[str, Any]) -> Any:
    """Tool description for MCP."""
    # 1. Extract and validate parameters
    param = arguments.get("param_name")
    
    # 2. Call Obsidian API client
    try:
        result = obsidian_client.method(param)
    except Exception as e:
        raise McpError(ErrorCode.INTERNAL_ERROR, str(e))
    
    # 3. Return formatted result
    return result
```

### Error Handling
- Use `McpError` with appropriate error codes
- Always provide meaningful error messages
- Handle API timeouts gracefully (3s connect, 6s read)

### API Client Conventions
- URL encode special characters in paths
- Use `verify=False` for self-signed certificates
- Include proper auth headers with bearer token
- Implement retries for transient failures

## Common Development Tasks

### Adding a New Tool
1. Define the tool function in `tools.py`
2. Add type hints and docstring
3. Register in `TOOLS` dictionary
4. Implement corresponding method in `obsidian.py` if needed
5. Update README.md with tool documentation

### Testing with Obsidian
1. Install Local REST API plugin in Obsidian
2. Generate API key from plugin settings
3. Ensure plugin is running (check port 27124)
4. Set `OBSIDIAN_API_KEY` environment variable
5. Use MCP Inspector to test individual tools

### Debugging Issues
- Check Obsidian plugin is running: `curl -k https://127.0.0.1:27124/`
- Verify API key is correct
- Monitor Claude logs for MCP errors
- Use MCP Inspector for interactive debugging
- Check network connectivity to Obsidian

## Configuration

### Development Setup
```bash
# .env file
OBSIDIAN_API_KEY=your_key_here
OBSIDIAN_HOST=127.0.0.1
```

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "obsidian": {
      "command": "uvx",
      "args": ["obsidian-mcp"],
      "env": {
        "OBSIDIAN_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Contributing Guidelines

### Code Standards
- Python >=3.11 required
- Type hints for all functions
- Docstrings for tools (used in MCP descriptions)
- Follow existing error handling patterns
- Maintain backwards compatibility with API

### Pull Request Process
1. Test changes with real Obsidian vault
2. Update README if adding new tools
3. Ensure all tools have proper documentation
4. Test with MCP Inspector before submitting
5. Update version in `pyproject.toml` if needed

## Known Limitations
- Requires Obsidian to be running with REST API plugin
- SSL verification disabled for self-signed certificates
- Binary file operations not supported
- Large vaults may have performance implications
- Some Obsidian-specific features (e.g., canvas) not accessible via REST API