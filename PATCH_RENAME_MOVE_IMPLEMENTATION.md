# PATCH Implementation for Rename/Move Operations in Obsidian Local REST API

## Overview

The Obsidian Local REST API implements file rename and move operations through the PATCH endpoint with specific headers. This implementation uses Obsidian's internal `fileManager.renameFile()` method which:
- Preserves file history and metadata
- Automatically updates all backlinks based on user preferences
- Handles the operation atomically

## API Details

### Endpoint
```
PATCH /vault/{file-path}
```

### Required Headers

1. **Authorization**: `Bearer {API_KEY}`
2. **Content-Type**: `text/plain`
3. **Operation**: Either `rename` or `move`
4. **Target-Type**: Must be `file`
5. **Target**: 
   - For rename: Must be `name`
   - For move: Must be `path`

### Request Body
- For **rename**: Just the new filename (e.g., `new-file.md`)
- For **move**: The complete new path (e.g., `folder2/subfolder/file.md`)

## Examples

### Rename Operation
Rename a file while keeping it in the same directory:

```bash
curl -X PATCH "https://localhost:27124/vault/folder/old-file.md" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/plain" \
  -H "Operation: rename" \
  -H "Target-Type: file" \
  -H "Target: name" \
  -d "new-file.md" \
  -k
```

Response:
```json
{
  "message": "File successfully renamed",
  "oldPath": "folder/old-file.md",
  "newPath": "folder/new-file.md"
}
```

### Move Operation
Move a file to a different directory (can also rename at the same time):

```bash
curl -X PATCH "https://localhost:27124/vault/folder1/file.md" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/plain" \
  -H "Operation: move" \
  -H "Target-Type: file" \
  -H "Target: path" \
  -d "folder2/subfolder/renamed-file.md" \
  -k
```

Response:
```json
{
  "message": "File successfully moved",
  "oldPath": "folder1/file.md",
  "newPath": "folder2/subfolder/renamed-file.md"
}
```

## Implementation Details

### Code Location
The implementation is in `requestHandler.ts`:

1. **Main PATCH handler** (`_vaultPatchV3`): Lines 482-605
   - Checks for file-level operations at lines 518-551
   - Routes to `handleRenameOperation` for rename/move operations

2. **Rename/Move handler** (`handleRenameOperation`): Lines 717-817
   - Validates the operation type and target
   - Checks file existence and destination availability
   - Creates parent directories if needed (for move operations)
   - Uses `app.fileManager.renameFile()` to perform the operation

### Key Features

1. **Semantic Operations**: Uses `Operation` header to specify intent clearly
2. **Target Validation**: Ensures correct `Target` header value for each operation
3. **Path Handling**: 
   - Rename: Constructs new path by replacing filename only
   - Move: Uses the provided path directly
4. **Directory Creation**: Automatically creates parent directories for move operations
5. **Error Handling**: Comprehensive error responses with specific error codes

### Error Responses

- **400**: Invalid request (wrong headers, missing body, etc.)
  - Error code 40003: Invalid Target value
  - Error code 40004: rename operation must use Target: name
  - Error code 40005: move operation must use Target: path
  - Error code 40006: Operation is only valid for Target-Type: file
- **404**: Source file not found
- **409**: Destination file already exists (Error code 40901)
- **500**: Server error during operation (Error code 50001)

## Benefits

1. **Preserves Backlinks**: All references to the file are automatically updated
2. **Maintains History**: Git history and file metadata are preserved
3. **Atomic Operation**: The entire operation succeeds or fails as one unit
4. **Consistent with Obsidian**: Uses the same internal mechanism as manual renaming

## Testing

The implementation includes comprehensive tests in `requestHandler.test.ts` (lines 832-957) covering:
- Successful rename operations
- Successful move operations
- Header validation
- Error conditions
- Directory creation for move operations