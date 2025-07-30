# User Story Examples for Different Types

## File Operation Example

### F1: Create new notes and folders instantly
**User Story**: As an Obsidian user, I want to create new notes and folders with a single command, so that I can quickly capture ideas without interrupting my flow.

**Acceptance Criteria**:
- Create notes with specified content in any vault location
- Create nested folder structures with parent creation
- Handle special characters in file/folder names properly
- Return success confirmation with created path
- Fail gracefully with clear errors for invalid paths

**Implementation Notes**:
- Use Obsidian REST API's create endpoint
- Validate paths before creation
- Support both absolute and relative paths

## Search Operation Example

### S1: Search text across all notes instantly
**User Story**: As a knowledge worker, I want to search for text across my entire vault instantly, so that I can find relevant information without remembering where I stored it.

**Acceptance Criteria**:
- Search completes in under 2 seconds for vaults with 10k+ notes
- Returns results with surrounding context (100 chars)
- Supports case-sensitive and case-insensitive search
- Shows file path and match location
- Handles special characters and regex patterns

**Implementation Notes**:
- Leverage Obsidian's search index
- Implement result caching for repeated searches
- Support pagination for large result sets

## Tag Management Example

### T1: Manage all your tags from one central place
**User Story**: As a vault curator, I want to see and manage all tags in my vault from one interface, so that I can maintain a consistent taxonomy.

**Acceptance Criteria**:
- List all unique tags with usage counts
- Sort by frequency or alphabetically
- Include both inline (#tag) and frontmatter tags
- Show which files use each tag
- Update within 5 seconds of tag changes

**Implementation Notes**:
- Cache tag index with TTL
- Use subscription system for real-time updates
- Provide batch operations for efficiency

## Performance Feature Example

### PERF1: Open vaults with 10,000+ files instantly
**User Story**: As a power user with a large knowledge base, I want to open and work with massive vaults without delays, so that vault size doesn't limit my productivity.

**Acceptance Criteria**:
- Initial vault access completes in under 1 second
- No memory errors with vaults up to 100GB
- Smooth navigation without UI freezing
- Background indexing doesn't block operations
- Progress indicators for long operations

**Implementation Notes**:
- Use lazy loading and pagination
- Implement progressive enhancement
- Cache frequently accessed data
- Stream large datasets

## Error Handling Example

### Q1: Get clear error messages that help you fix issues
**User Story**: As a user encountering problems, I want error messages that clearly explain what went wrong and how to fix it, so that I can resolve issues independently.

**Acceptance Criteria**:
- Error messages include specific problem description
- Provide actionable fix suggestions
- Include relevant context (file path, operation)
- Distinguish between user errors and system errors
- Log detailed info for debugging without exposing internals

**Implementation Notes**:
- Centralized error handling system
- Error message templates with placeholders
- Context-aware suggestions based on operation type

## Integration Example

### I1: Integrate with Claude Desktop seamlessly
**User Story**: As a Claude Desktop user, I want obsidian-mcp to work seamlessly with my AI assistant, so that I can manage my notes without switching contexts.

**Acceptance Criteria**:
- One-click installation from Claude Desktop
- Auto-discovery of Obsidian vaults
- No manual configuration required for basic use
- Clear status indicators for connection state
- Graceful handling of Obsidian not running

**Implementation Notes**:
- MCP protocol compliance
- Automatic port detection
- Health check endpoints
- Clear setup documentation