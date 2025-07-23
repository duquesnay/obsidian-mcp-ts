# Emerging Patterns in obsidian-mcp-resources

## Dynamic Resource URIs

### Pattern: Path Parameters in Resource URIs

With R4.1, we introduced the first dynamic resource URI pattern: `vault://note/{path}`

**Key implementation details:**

1. **URI Structure**: Use `{param}` notation to indicate dynamic parts
   - Example: `vault://note/{path}` where `{path}` is replaced with actual note path
   - In ListResources, show the template with placeholders
   - In ReadResource, parse actual values from the URI

2. **URI Parsing**: Simple string manipulation for path extraction
   ```typescript
   if (uri.startsWith('vault://note/')) {
     const path = uri.substring('vault://note/'.length);
     // Use path to fetch content
   }
   ```

3. **Resource Listing**: Include dynamic resources as templates
   ```typescript
   {
     uri: 'vault://note/{path}',
     name: 'Note',
     description: 'Individual note by path (e.g., vault://note/Daily/2024-01-01.md)',
     mimeType: 'text/markdown'
   }
   ```

4. **Error Handling**: Provide specific error messages for dynamic resources
   - For missing notes: `Note not found: ${path}` instead of generic `Resource not found: ${uri}`

### Future Patterns to Consider

As we add more dynamic resources (R4.2: folders, R6.1: daily notes, R6.2: tags), consider:

1. **Consistent URI parsing strategy** - Extract common URI parsing logic if patterns repeat
2. **Resource validation** - Validate dynamic parameters before fetching
3. **Resource discovery** - How to help users discover available dynamic resources
4. **Caching strategy** - Dynamic resources may benefit from caching with path-based keys

## Testing Patterns

### Pattern: Mock ObsidianClient in Resource Tests

For testing resources that need ObsidianClient:

1. Extend Server interface to include optional obsidianClient
2. Inject mock client in tests
3. Use production client creation as fallback

```typescript
interface ServerWithClient extends Server {
  obsidianClient?: ObsidianClient;
}

function getObsidianClient(server: ServerWithClient): ObsidianClient {
  if (server.obsidianClient) {
    return server.obsidianClient;
  }
  // Create production client
}
```

This pattern allows clean testing without modifying production code paths.