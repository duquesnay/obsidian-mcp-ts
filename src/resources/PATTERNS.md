# Emerging Patterns in MCP Resources Implementation

After implementing five resources (vault://tags, vault://stats, vault://recent, vault://note/{path}, vault://folder/{path}), several patterns are emerging:

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

### Current State (After R4.2)
1. **Linear if-else chain**: Five if-else branches for resource handling
2. **Mixed patterns**: Static resources (tags, stats, recent) vs dynamic resources (note/{path}, folder/{path})
3. **Duplication emerging**: Error handling, response formatting, client creation

### Dynamic Resource Patterns
With the addition of vault://note/{path} and vault://folder/{path}, new patterns emerged:

1. **Path extraction**: Different logic for extracting paths from URIs
   - Note: `uri.substring('vault://note/'.length)`
   - Folder: Special handling for root folder cases

2. **Error messages**: Resource-specific error messages
   - "Note not found: {path}"
   - "Folder not found: {path}"

3. **Response formatting**: Different content types
   - Notes: text/markdown with raw content
   - Folders: application/json with structured data

### Potential Refactoring (Now with 5 Resources)
With five resources and clear patterns, we could consider:

1. **Resource Handler Registry**: Map URI patterns to handler functions
2. **Dynamic Path Parser**: Extract paths based on resource type
3. **Response Builder**: Standardize response formatting
4. **Error Handler Factory**: Generate appropriate error messages

### Why Consider Refactoring Now?
- We have 5 resources (passed Rule of Three)
- Clear patterns between static and dynamic resources
- Next resources (R6.1-R6.3) will likely follow similar patterns
- Code is becoming harder to navigate with linear if-else chain

## Next Steps
- R5.1: Quality review and refactoring based on these patterns
- Consider resource handler architecture before implementing R6.x
- Focus on maintainability as we prepare to add more resources