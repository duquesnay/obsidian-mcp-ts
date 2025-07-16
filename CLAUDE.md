# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mcp-obsidian is a Model Context Protocol (MCP) server that provides an interface for AI assistants to interact with Obsidian vaults via the Local REST API community plugin. It enables reading, writing, searching, and managing notes programmatically.

## Development Commands

### Setup and Dependencies
```bash
# Install dependencies
uv sync

# Run the server directly (for debugging)
uv --directory /path/to/mcp-obsidian run mcp-obsidian
```

### Debugging
```bash
# Use MCP Inspector for interactive debugging
npx @modelcontextprotocol/inspector uv --directory /path/to/mcp-obsidian run mcp-obsidian

# View logs on macOS
tail -f ~/Library/Logs/Claude/mcp-server-mcp-obsidian.log

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

### SSL Verification Note
The Obsidian Local REST API plugin uses a self-signed SSL certificate on port 27124. This is expected behavior, and SSL verification must be disabled (`verifySsl: false`) to connect to the local Obsidian instance. This is not a security vulnerability but a requirement for local development with self-signed certificates.

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
    "mcp-obsidian": {
      "command": "uvx",
      "args": ["mcp-obsidian"],
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

## Git Workflow for Claude Development

### Commit Prefix Strategy (2025-07-02)

**Strict Rule**: Always separate Claude-related changes from actual code changes using commit prefixes.

#### For Feature/Bug Development:
```bash
git commit -m "feat: add new functionality"
git commit -m "fix: resolve issue with X"
git commit -m "refactor: improve code structure"
git commit -m "docs: update API documentation"
```

#### For Claude-Related Files:
```bash
git commit -m "claude: add feature backlog"
git commit -m "claude: update CLAUDE.md with insights"
git commit -m "claude: add debugging notes"
git commit -m "claude: document implementation patterns"
```

#### Files Considered Claude-Related:
- `CLAUDE.md` (this file)
- `BACKLOG.md` 
- Development notes and insights
- AI collaboration traces
- Project memory updates

#### Benefits:
- **Clean PRs**: Cherry-pick only non-`claude:` commits for upstream
- **Clear History**: Reviewers focus on actual code changes
- **Easy Filtering**: `git log --grep="^(?!claude:)"` shows only code commits

#### Cherry-pick for PRs:
```bash
# Create PR branch with only code changes
git checkout -b pr/feature-name
git cherry-pick $(git rev-list --grep="^(?!claude:)" main..source-branch)
```

**This strategy is MANDATORY for all future commits in this repository.**

## Development Learnings

### Tag Management Implementation & Code Review (2025-01-02)

**Methodological insights**:
- **Security Defaults Matter Most in Code Reviews**: Despite good architecture and patterns, a single poor default (`verifySsl: false`) creates a critical security vulnerability. Security reviews should prioritize defaults over features - a well-architected system with insecure defaults is more dangerous than a poorly architected system with secure defaults.

**Technical insights**:
- **API Endpoint Design Evolution**: The Obsidian REST API's tag management design showed excellent API evolution - using consistent patterns (`GET /tags`, `PATCH /tags/{tagname}`, `PATCH /vault/{filepath}` with headers) that follow RESTful principles while maintaining backward compatibility. The use of operation headers (`Target-Type: tag`, `Operation: add/remove`) is a clean way to extend existing endpoints without breaking changes.
- **TypeScript `any` Proliferation Pattern**: The codebase showed how `any` types propagate through inheritance - starting with `BaseTool.execute(args: any): Promise<any>`, this pattern infected all 25 tools. This demonstrates that type safety must be enforced at the base/interface level, as fixing it later requires changing every implementation.

### Move Directory Implementation (2025-07-02)

**Methodological insights**:
- **Direct API Testing Over Complex Debugging**: When move_directory failed with "No files found" errors, testing the actual API endpoint with curl immediately revealed the real issue (endpoint didn't exist) rather than building elaborate debugging tools or fallback mechanisms. This saved hours of complex workaround development.
- **Commit Prefix Strategy for AI-Human Collaboration**: Separating code changes from AI collaboration artifacts using strict commit prefixes (`feat:` vs `claude:`) enables clean cherry-picking for upstream PRs. This solves the fundamental problem of contributing AI-assisted work to open source projects while maintaining professional commit history.

**Technical insights**:
- **Request-Specific Timeouts for Heavy Operations**: Directory operations (40+ seconds for 214 files) require different timeout values than regular file operations (6 seconds). Using axios request-specific timeout options `{ timeout: 120000 }` allows granular control without affecting the entire client configuration, preventing timeout failures on substantial directory moves.

### TypeScript Conversion and Repository Separation (2025-06-24)

**Technical insights**:
- **Protocol-level API debugging approach**: Instead of just testing if the server "starts up," we built comprehensive E2E tests that actually exercise the MCP protocol handshake and tool execution. This caught critical API endpoint bugs (search using wrong HTTP method, periodic notes using POST instead of GET) that would have been missed by simpler testing approaches.
- **Git history surgery for clean attribution**: Creating separate clean branches from specific commit points (using `git checkout -b typescript-clean f6d4bff`) allowed us to maintain proper project attribution while removing AI collaboration traces. This technique enabled professional open-source contribution without implementation details leaking into commit history.

**Methodological insights**:
- **Systematic API endpoint verification**: When converting between languages, systematically testing each endpoint revealed multiple breaking changes in the original Python implementation. The TypeScript conversion became an opportunity to fix longstanding bugs rather than just a language port.
- **Repository separation strategy**: Rather than trying to force both Python improvements and TypeScript conversion into the same project timeline, cleanly separating them into distinct contributions (Python PR for upstream, TypeScript as independent project) avoided the complexity of mixed concerns and maintained clear project boundaries.

### MCP Bug Analysis and Git Atomic Commits (2025-01-07)

**Methodological insights**:
- **Verify API endpoints with live testing before assuming implementation errors**: The advanced search "bug" turned out to be an API version mismatch during refactoring. Testing the live API revealed the endpoint actually works, preventing unnecessary code removal. Always test against the actual running service when analyzing bug reports.

**Technical insights**:
- **Use git stash selectively to separate mixed changes**: When faced with multiple fixes in the same files, `git stash push -m "description" -- specific/file.ts` allows surgical separation of changes for atomic commits without interactive staging. This enables clean PR preparation even with interleaved changes.
- **Error detection should use status codes, not message parsing**: The copyFile fix showed that checking `error.code === 404` is more reliable than `error.message.includes('does not exist')` which is fragile and locale-dependent. Status codes are part of the API contract, while error messages are implementation details.

### LLM Ergonomics Improvement Cycle Design (2025-01-09)

**Methodological insights**:
- **Real LLM Testing Reveals Different Issues Than Simulated Analysis**: Actual Claude processes behave differently than simulated LLM behavior. When testing patch_content_v2 improvements, Claude chose `append_content` over the complex tool for simple operations, revealing that the issue wasn't just technical complexity but tool positioning and cognitive overhead. Ergonomic improvements must be tested with actual LLM processes, not theoretical analysis.
- **Tool Ergonomics Should Match Use Case Complexity**: LLMs naturally gravitate toward tools whose complexity matches their task complexity. For simple appends, they prefer simple tools even when complex tools are available. This suggests ergonomic design should focus on making complex tools excellent for complex operations, rather than trying to make them universal replacements for simpler tools.

**Technical insights**:
- **Permission Configuration Required for MCP Tool Testing**: Testing MCP tools with separate Claude processes requires explicit permission configuration using either `--allowedTools` flags or settings.json configuration. The tools list must include full MCP tool names like `mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2`. Without proper permissions, Claude processes will ask for permission but cannot execute, making testing ineffective.

### Multi-Agent Ergonomic Review Loop Creation (2025-01-10)

See `docs/ergonomic-loop-project/` for the complete multi-agent ergonomic review loop system, including:
- Implementation details and source code
- Retrospective analysis of the development process
- Key findings about LLM tool ergonomics
- Reusable framework for analyzing other tool ecosystems

The ergonomic loop project demonstrated that LLMs prefer simple, reliable tools over complex ones, and that subprocess delegation works better than spawning for multi-agent workflows.

### Tool Consolidation and Ergonomics Testing (2025-01-10)

**Methodological insights**:
- **Real User Testing Reveals Different Patterns Than Theoretical Analysis**: Actual user testing revealed completely different tool preferences than theoretical ergonomic analysis would suggest. Users consistently abandoned complex tools (even "ergonomically improved" ones) after first failure and fell back to simple tools with 100% success rates. The UnifiedEditTool succeeded in testing where others failed, but only through actual execution, not theoretical evaluation.
- **Scope Discipline Prevents Feature Creep in Analysis**: Initially misunderstood study scope and removed 30+ useful tools (file operations, tags, search) when analysis was only about complex editing tools. This highlighted how critical scope discipline is - without clear boundaries, improvement efforts can accidentally destroy working functionality outside their intended domain.

**Technical insights**:
- **Progressive Tool Architecture Matches LLM Mental Models**: The UnifiedEditTool's progressive complexity design (Stage 1: 100% simple operations → Stage 2: 90% structure-aware → Stage 3: 80% complex) successfully matched how LLMs approach document editing. Users naturally started with simple operations and escalated complexity only when needed, rather than being forced to understand complex schemas upfront.

## Insights and Memories

- **Obsidian MCP is only for obsidian notes, not filesystem access**
