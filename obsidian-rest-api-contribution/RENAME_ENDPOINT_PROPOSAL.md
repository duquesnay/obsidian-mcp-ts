# Rename Endpoint Proposal for Obsidian Local REST API

## Overview
This document outlines the implementation of a rename/move endpoint for the Obsidian Local REST API plugin that properly preserves file history, metadata, and automatically updates links.

## Proposed Endpoint

### POST /vault/{oldPath}/rename
Renames or moves a file within the vault while preserving all metadata and updating links.

#### Request
- **Method**: POST
- **Path**: `/vault/{oldPath}/rename`
- **Headers**:
  - `Authorization: Bearer {API_KEY}`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "newPath": "path/to/new/location.md"
}
```

#### Response
- **Success (200 OK)**:
```json
{
  "message": "File successfully renamed",
  "oldPath": "old/path/file.md",
  "newPath": "new/path/file.md"
}
```

- **Error Responses**:
  - 404: Source file not found
  - 409: Destination file already exists
  - 400: Invalid path or request

## Implementation

### 1. Add to requestHandler.ts

```typescript
// In setupRouter() method, add:
this.api
  .route("/vault/*")
  .post(this.vaultRename.bind(this));

// Add new method:
async vaultRename(req: express.Request, res: express.Response) {
  const oldPath = this.getPathFromParams(req);
  
  if (!oldPath || oldPath.endsWith("/")) {
    this.returnCannedResponse(res, {
      errorCode: ErrorCode.RequestMethodValidOnlyForFiles,
    });
    return;
  }

  // Parse request body for new path
  const { newPath } = req.body;
  
  if (!newPath || typeof newPath !== 'string') {
    res.status(400).json({
      errorCode: 40001,
      message: "newPath is required in request body"
    });
    return;
  }

  // Check if source file exists
  const sourceFile = this.app.vault.getAbstractFileByPath(oldPath);
  if (!sourceFile || !(sourceFile instanceof TFile)) {
    this.returnCannedResponse(res, { statusCode: 404 });
    return;
  }

  // Check if destination already exists
  const destExists = await this.app.vault.adapter.exists(newPath);
  if (destExists) {
    res.status(409).json({
      errorCode: 40901,
      message: "Destination file already exists"
    });
    return;
  }

  try {
    // Use FileManager to rename the file (preserves history and updates links)
    await this.app.fileManager.renameFile(sourceFile, newPath);
    
    res.status(200).json({
      message: "File successfully renamed",
      oldPath: oldPath,
      newPath: newPath
    });
  } catch (error) {
    res.status(500).json({
      errorCode: 50001,
      message: `Failed to rename file: ${error.message}`
    });
  }
}
```

### 2. Update OpenAPI Documentation

Add to the OpenAPI spec:

```yaml
/vault/{oldPath}/rename:
  post:
    summary: Rename or move a file in the vault
    description: |
      Renames or moves a file to a new location while preserving all metadata,
      file history, and automatically updating all links to the file based on
      user preferences.
    parameters:
      - name: oldPath
        in: path
        required: true
        description: Current path of the file to rename (relative to vault root)
        schema:
          type: string
          format: path
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              newPath:
                type: string
                description: New path for the file (relative to vault root)
                format: path
            required:
              - newPath
    responses:
      '200':
        description: File successfully renamed
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                oldPath:
                  type: string
                newPath:
                  type: string
      '400':
        description: Invalid request (missing newPath or invalid paths)
      '404':
        description: Source file not found
      '409':
        description: Destination file already exists
      '500':
        description: Server error during rename operation
    tags:
      - Vault Files
```

## Benefits

1. **Preserves File History**: Using `FileManager.renameFile()` maintains Git history and file metadata
2. **Updates Links Automatically**: All links to the renamed file are updated based on user preferences
3. **Atomic Operation**: The rename is handled as a single operation by Obsidian
4. **Consistent with Obsidian**: Uses the same mechanism as manual renaming in Obsidian

## Testing

The implementation should be tested with:
1. Simple file rename in same directory
2. Moving file to different directory
3. Renaming file with many incoming links
4. Edge cases (non-existent files, existing destinations, invalid paths)

## Alternative Endpoint Design

If preferred, we could also support the operation as a PATCH request:

```
PATCH /vault/{oldPath}
Body: { "operation": "rename", "newPath": "new/path.md" }
```

This would be consistent with the existing PATCH operations for content modification.