# Obsidian MCP TypeScript - MCP Resources Development Scratchpad

## Current Focus
Implementing MCP Resources feature to enable persistent knowledge context for LLMs alongside existing tools.

## Working Notes

### Why Resources?
- Enable persistent context for project documentation
- Allow LLMs to maintain reference material without repeated tool calls
- Support subscription-based updates for real-time changes
- Complement tools (actions) with resources (data)

### Architectural Orientation (Emergent Design)
While following incremental development, keep these patterns in mind:
- Resources are read-only (tools handle mutations)
- Use existing ObsidianClient for data access
- Leverage LRUCache for performance
- URI scheme: `vault://` prefix for all resources
- Dynamic discovery similar to tools pattern
- Let abstractions emerge from concrete implementations

### Implementation Approach
Following emergent architecture and TDD:
1. Start with simplest working resource (vault://tags)
2. Extract patterns after 2-3 implementations
3. Add dynamic URIs when static ones work
4. Templates emerge from dynamic URI patterns
5. Performance optimization based on real usage
6. Subscriptions as advanced feature when needed

### Emergent Patterns (Will Discover)
- BaseResource abstract class (after 2-3 resources)
- ResourceRegistry (when manual registration gets painful)
- URI parsing utilities (when patterns repeat)
- Caching strategy (when performance matters)
- Template system (when URI patterns stabilize)

## Quick Commands

```bash
# Run tests
npm test

# Run specific test file
npm test -- src/resources/base.test.ts

# Type check
npm run type-check

# Build
npm run build

# Run dev mode
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector tsx src/index.ts
```

## Progress Tracking
- [ ] Phase 1: Foundation (R1.1-R1.10)
  - [ ] R1.1: Add resources capability
  - [ ] R1.2: Import resource schemas
  - [ ] R1.3: Create BaseResource class
  - [ ] R1.4: Create ResourceResponse type
  - [ ] R1.5: Add discovery mechanism
  - [ ] R1.6: Create ResourceRegistry
  - [ ] R1.7: ListResources handler
  - [ ] R1.8: ReadResource handler
  - [ ] R1.9: URI validation
  - [ ] R1.10: Caching strategy
- [ ] Phase 2: Static Resources (R2.1-R2.8)
- [ ] Phase 3: Dynamic Resources (R3.1-R3.14)
- [ ] Phase 4: Subscriptions (R4.1-R4.11)
- [ ] Phase 5: Polish (R5.1-R5.8, R6.1-R6.7)

## Resource Examples

### Static Resources
```typescript
// vault://tags
{
  uri: "vault://tags",
  name: "Vault Tags",
  mimeType: "application/json",
  text: JSON.stringify({
    tags: [
      { name: "#project", count: 42 },
      { name: "#meeting", count: 15 }
    ]
  })
}
```

### Dynamic Resources
```typescript
// vault://note/Projects/CurrentProject/README.md
{
  uri: "vault://note/Projects/CurrentProject/README.md",
  name: "README.md",
  mimeType: "text/markdown",
  text: "# Current Project\n\nProject documentation..."
}
```

### Subscription Resources
```typescript
// vault://activity/recent
{
  uri: "vault://activity/recent",
  name: "Recent Activity",
  mimeType: "application/json",
  text: JSON.stringify({
    changes: [
      { path: "Daily/2024-01-15.md", modified: "2024-01-15T10:30:00Z" }
    ]
  })
}
```

## Testing Notes
- Test resource discovery independently
- Mock ObsidianClient for unit tests
- Use real vault for integration tests
- Verify subscription updates with file watchers
- Check cache behavior for performance

## Implementation Reminders
- Maintain green tests throughout
- One task at a time
- Commit frequently with descriptive messages
- Update backlog after each task
- Document as you go