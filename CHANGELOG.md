# Changelog

## [2.4.0] - 2025-10-07

### Added
- **MCP4 - Binary File Support**: Access images, PDFs, audio, and video through resources
  - Auto-detection based on file extension (20+ binary formats supported)
  - Base64-encoded blob responses for binary files
  - 10 MB size limit for safety and performance
  - Supports images (PNG, JPG, GIF, SVG, etc.), PDFs, audio (MP3, WAV, etc.), video (MP4, WebM, etc.)
  - Seamless integration with existing `vault://note/{path}` URI pattern
  - Returns `BlobResourceContents` for binary files vs `TextResourceContents` for text

### Technical
- New `BinaryFileHandler` utility for binary file detection and processing
- MIME type mapping for 20+ binary file extensions
- Size validation and error handling for oversized files
- Base64 encoding integrated into resource response pipeline

## [2.3.0] - 2025-10-07

### Added
- **MCP1 - Resource Size Metadata**: All resources now include size information in `_meta` field
  - File size in bytes for precise calculations
  - Human-readable formatted size (e.g., "1.5 KB", "2.3 MB")
  - Enables resource filtering and performance monitoring without additional API calls
- **MCP2 - Last Modified Timestamps**: Resources include modification timestamps
  - ISO 8601 format timestamps in UTC for consistency
  - Enables cache validation and freshness checking
  - Supports efficient cache invalidation strategies
- **MCP3 - Protocol-Compliant Error Codes**: Error handling now uses standard MCP error codes
  - HTTP 404 → `MethodNotFound` (-32601)
  - HTTP 400/401/403 → `InvalidParams` (-32602)
  - HTTP 500+ → `InternalError` (-32603)
  - Improves interoperability with MCP clients and tools

### Changed
- Error handling refactored to throw `McpError` instances with appropriate error codes
- Resource responses now include optional `_meta` field with metadata
- `ResourceMetadataUtil` provides efficient metadata fetching with graceful degradation

### Technical
- New `ResourceMetadataUtil` class for efficient metadata operations
  - Single file metadata fetching
  - Batch metadata fetching with concurrency control
  - Size formatting utility (bytes → human-readable)
  - Timestamp formatting utility (Unix → ISO 8601)
- `ResourceErrorHandler` maps HTTP status codes to MCP error codes
- Graceful degradation: resources work even if metadata fetch fails

## [0.4.0] - 2025-07-03

### Added
- New `obsidian_find_empty_directories` tool to find all empty directories in the vault
  - Supports searching within specific paths
  - Option to include/exclude hidden files when determining if a directory is empty
  - Returns list of empty directories with count and search parameters

### Changed
- Enhanced `obsidian_list_files_in_dir` to handle empty directories gracefully
  - Now returns an empty array `[]` instead of throwing a 404 error for empty directories
  - Improved consistency for directory listing operations

### Fixed
- Empty directory detection now properly works with the Obsidian REST API limitations
  - API doesn't return empty directories in listings, but the tools now handle this correctly

## [0.3.0] - Previous Release
- Content negotiation for token optimization
- Advanced search functionality
- Tag management system
- Directory operations (move, copy, delete)
