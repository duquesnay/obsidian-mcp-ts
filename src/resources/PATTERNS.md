# Emerging Patterns in MCP Resources Implementation

After implementing three resources (vault://tags, vault://stats, vault://recent), several patterns are emerging:

## Code Duplication Patterns

### 1. Resource Registration Pattern
Each resource follows the same structure in ListResources:
```typescript
{
  uri: 'vault://[resource-name]',
  name: '[Human Readable Name]',
  description: '[What this resource provides]',
  mimeType: 'application/json'
}
```

### 2. ReadResource Handler Pattern
Each resource handler follows identical structure:
```typescript
if (uri === 'vault://[resource-name]') {
  // Generate or fetch data
  const data = { /* resource-specific data */ };
  
  return {
    contents: [
      {
        uri: 'vault://[resource-name]',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}
```

### 3. Response Format Pattern
All resources return:
- A single content item in the contents array
- JSON mime type
- Pretty-printed JSON (null, 2)

## Observations

### Current Issues
1. **Linear if-else chain**: Each new resource adds another if statement
2. **Hardcoded data**: All three resources return static data
3. **No abstraction**: Direct implementation without helper functions

### Potential Refactoring (After Rule of Three)
Since we now have three resources with identical patterns, we could consider:

1. **Resource Registry**: Map of resource definitions
2. **Handler Factory**: Generate handlers from resource config
3. **Data Provider Interface**: Separate data fetching from response formatting

### Why Not Refactor Yet?
Following the project's principles:
- Architecture should emerge from working code
- Refactor when patterns repeat (Rule of Three) ✓
- Each increment should add user value

The patterns are clear, but:
- The next resources (R4.1, R4.2) will introduce dynamic paths (vault://note/{path})
- This will break the current pattern and require different handling
- Better to wait and see how dynamic resources affect the architecture

## Next Steps
- Implement R4.1 (dynamic paths) to see how patterns evolve
- Consider refactoring after R4.2 when we have 5 resources total
- Keep this document updated as patterns emerge or change