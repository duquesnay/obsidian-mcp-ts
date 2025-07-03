# Changelog

## [0.4.0] - 2025-01-03

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