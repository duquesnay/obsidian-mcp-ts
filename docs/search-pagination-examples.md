# Search Pagination Examples

This document demonstrates the search pagination functionality implemented for the `vault://search/{query}` resource.

## Basic Usage

### Default Pagination (10 results per page)
```
vault://search/project%20notes
```
Returns first 10 results with relevance scoring.

### Custom Limit
```
vault://search/meeting?limit=5
```
Returns first 5 results.

### Offset Pagination
```
vault://search/todo?limit=10&offset=20
```
Returns results 21-30 (skip first 20, return next 10).

### Combined with Mode Parameter
```
vault://search/documentation?mode=full&limit=15&offset=0
```
Returns first 15 results with full context (no truncation).

## Continuation Tokens

When results are paginated, the response includes a `continuationToken` for consistent ordering:

```json
{
  "query": "project notes",
  "results": [...],
  "totalResults": 45,
  "hasMore": true,
  "continuationToken": "eyJ0eXBlIjoic2VhcmNoIiwib2Zmc2V0IjoxMCwicXVlcnkiOiJwcm9qZWN0IG5vdGVzIiwiY29udGV4dExlbmd0aCI6MTAwfQ=="
}
```

### Using Continuation Tokens
```
vault://search/project%20notes?token=eyJ0eXBlIjoic2VhcmNoIiwib2Zmc2V0IjoxMCwicXVlcnkiOiJwcm9qZWN0IG5vdGVzIiwiY29udGV4dExlbmd0aCI6MTAwfQ==
```

The token contains:
- `type`: "search" 
- `query`: Original search query
- `offset`: Next page starting position
- `contextLength`: Context mode used

## Relevance Scoring

Results include relevance scores (0.0 to 1.0) for ranking:

```json
{
  "results": [
    {
      "path": "Project Planning.md",
      "score": 0.95,
      "matches": [...]
    },
    {
      "path": "Meeting Notes.md", 
      "score": 0.87,
      "matches": [...]
    }
  ]
}
```

## Response Structure

### Full Response
```json
{
  "query": "search term",
  "results": [
    {
      "path": "note.md",
      "score": 0.95,
      "matches": [
        {
          "match": { "start": 10, "end": 20 },
          "context": "...search term found here..."
        }
      ]
    }
  ],
  "totalResults": 25,
  "hasMore": true,
  "continuationToken": "base64-encoded-token"
}
```

### Pagination Metadata
- `totalResults`: Total number of matching results
- `hasMore`: Boolean indicating if more results exist
- `continuationToken`: Token for next page (only present when `hasMore` is true)

## Performance Considerations

- Default limit is 10 for resource access (search is expensive)
- Results are cached for 1 minute via resource system
- Continuation tokens ensure consistent ordering across pages
- Relevance scores help prioritize most relevant results first

## Tool Integration

The `SimpleSearchTool` automatically handles pagination parameters:

```typescript
await tool.executeTyped({
  query: 'project notes',
  limit: 5,
  offset: 10
});
```

This gets translated to:
```
vault://search/project%20notes?mode=preview&limit=5&offset=10
```