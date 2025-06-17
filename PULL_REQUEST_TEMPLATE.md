# Add File Rename/Move Endpoint

## Description
This PR adds a new endpoint to rename or move files within an Obsidian vault. The implementation uses Obsidian's `FileManager.renameFile()` method to ensure that:
- File history and metadata are preserved
- All links to the renamed file are automatically updated
- The operation is atomic and consistent with Obsidian's native behavior

Fixes #122

## Changes
- Added `POST /vault/{oldPath}/rename` endpoint to rename/move files
- Added proper error handling for edge cases (non-existent files, existing destinations)
- Updated OpenAPI documentation with the new endpoint
- Added comprehensive test suite for the rename functionality

## Implementation Details
The endpoint accepts a POST request with the current file path in the URL and the new path in the request body:

```bash
POST /vault/old-file.md/rename
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "newPath": "new-file.md"
}
```

## Why This Approach?
1. **POST with `/rename` suffix**: Clear and explicit about the operation being performed
2. **Uses FileManager.renameFile()**: Ensures proper link updates and metadata preservation
3. **Consistent error handling**: Returns appropriate HTTP status codes for different scenarios

## Alternative Considered
I also implemented a more RESTful approach using the MOVE method with a Destination header, similar to WebDAV. Both implementations are included for consideration.

## Testing
- [x] Simple file rename in same directory
- [x] Moving file to different directory  
- [x] Error handling for non-existent source files
- [x] Error handling for existing destination files
- [x] Special characters in filenames
- [x] Link update verification

## Breaking Changes
None. This is a new endpoint that doesn't affect existing functionality.

## Checklist
- [x] Code follows the project's style guidelines
- [x] Self-review completed
- [x] Tests added and passing
- [x] Documentation updated
- [x] No breaking changes introduced