the most critical missing feature is move directory# Obsidian MCP Feature Backlog

This document tracks potential features and enhancements for the Obsidian MCP server. Features are organized by category and priority.

## Implementation Status

- ✅ Implemented
- 🚧 In Progress
- ❌ Not Started
- 🔍 Needs Investigation

## Feature Categories

### 1. Directory Management (High Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `create_directory` | ✅ | Create new directories in the vault | Implemented using new REST API endpoint |
| `delete_directory` | ✅ | Remove empty directories | Implemented with trash/permanent modes |
| `move_directory` | ✅ | Move entire folder structures with contents | Implemented using recursive file operations |
| `copy_directory` | ✅ | Duplicate folder structures | Implemented using new REST API endpoint |

### 2. File Operations (High Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `copy_file` | ✅ | Duplicate files within the vault | Implemented with overwrite protection |
| `check_path_exists` | ✅ | Verify if file/directory exists | Implemented with type detection |
| `get_file_metadata` | ✅ | Get size, dates, permissions | Implemented with content negotiation |

### 3. Bulk Operations (Medium Priority - Can implement with existing APIs)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `bulk_move_files` | ❌ | Move multiple files in one operation | Batch API calls with transaction support |
| `bulk_delete_files` | ❌ | Delete multiple files efficiently | Error handling for partial failures |
| `bulk_rename_files` | ❌ | Rename files with patterns | Pattern matching + validation |
| `bulk_copy_files` | ❌ | Copy multiple files | Memory considerations for large batches |

### 4. Vault Management (Medium Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_vault_statistics` | ❌ | Total files, folders, sizes | Traverse vault + aggregate data |
| `get_vault_structure` | ❌ | Tree structure of entire vault | Recursive directory traversal |
| `export_vault_data` | ❌ | Export vault in various formats | Format converters needed |
| `validate_vault_integrity` | ❌ | Check broken links, orphans | Link parser + validator |

### 5. Link Management (High Priority - User Interest)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_file_backlinks` | ❌ | Get all files linking to target | Parse vault for references |
| `get_file_forward_links` | ❌ | Get all outgoing links | Parse markdown links |
| `update_links_on_move` | ✅ | Update links when moving | Built into move/rename |
| `find_broken_links` | ❌ | Identify broken internal links | Link validation logic |
| `batch_update_links` | ❌ | Update multiple links at once | Complex find/replace |

### 6. Template Operations (Medium Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `apply_template` | ❌ | Apply templates to files | Template engine integration |
| `list_templates` | ❌ | Get available templates | Template folder scanning |
| `create_from_template` | ❌ | Create new file from template | Variable substitution |
| `manage_template_variables` | ❌ | Handle template placeholders | Parser for variables |

### 7. Content Modification (High Priority - LLM Ergonomics)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `patch_content` | ⚠️ | Legacy content patching | DEPRECATED - Remove in v1.0.0 |
| `query_structure` | ✅ | Query document structure for references | Returns headings, blocks, paths |
| `patch_content_v2` | ✅ | LLM-ergonomic content modification | Explicit operations, deterministic |
| Section-scoped replace | 🚧 | Replace within specific sections | Needs AST parsing |
| Frontmatter merge/append | 🚧 | Advanced frontmatter operations | Partial implementation |
| Pattern-based insert | ❌ | Insert at regex matches | Needs implementation |

### 8. Tag Management (High Priority - User Interest)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_all_tags` | ✅ | List all tags in vault | Implemented using GET /tags |
| `get_files_by_tag` | ✅ | Find files with specific tags | Implemented using GET /tags/{tagname} |
| `rename_tag` | ✅ | Rename tags across files | Implemented using PATCH /tags/{tagname} |
| `manage_file_tags` | ✅ | Add/remove tags from files | Implemented using PATCH /vault/{filepath} with Target-Type: tag |

### 9. Advanced Search (High Priority - User Interest)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `advanced_search` | ✅ | Comprehensive search with filters | Implemented using POST /search/advanced |
| `search_by_frontmatter` | ✅ | Search frontmatter fields | Part of advanced_search |
| `regex_search` | ✅ | Regular expression search | Part of advanced_search |
| `search_with_filters` | ✅ | Date, type, path filters | Part of advanced_search |
| `search_history` | ❌ | Track recent searches | Local storage needed |

### 10. Content Operations (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_file_preview` | ❌ | Get first N lines/chars | Partial file reading |
| `get_file_sections` | ❌ | Extract specific sections | Markdown parser |
| `merge_files` | ❌ | Combine multiple files | Content concatenation |
| `split_file` | ❌ | Split by headings/criteria | Content analysis |

### 11. Integration Features (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `export_to_format` | ❌ | Export to PDF, HTML, etc. | Format converters |
| `import_from_format` | ❌ | Import various formats | Parser libraries |
| `sync_status` | ❌ | Check cloud sync status | Plugin API access |
| `plugin_interaction` | ❌ | Interact with other plugins | Plugin bridge API |

### 12. Performance & Caching (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `cache_management` | ❌ | Clear/manage MCP cache | Cache implementation |
| `batch_prefetch` | ❌ | Prefetch multiple files | Async optimization |
| `incremental_updates` | ❌ | Get only changed content | Change detection |

### 13. Security & Access (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_permissions` | ❌ | Check file permissions | OS-level access |
| `set_permissions` | ❌ | Modify permissions | Security implications |
| `encrypt_content` | ❌ | Encrypt sensitive notes | Crypto library |
| `audit_log` | ❌ | Track MCP operations | Logging framework |

## Next Priority Features (User Interest)

Based on user feedback, the following features are prioritized for next implementation:

### 1. Tag Management
- `get_all_tags` - List all tags in the vault
- `get_files_by_tag` - Find all files with specific tags
- `rename_tag` - Rename tags across all files
- `add_tags_to_file` - Add tags to files
- `remove_tags_from_file` - Remove tags from files

### 2. Link Management  
- `get_file_backlinks` - Get all files linking to a specific file
- `get_file_forward_links` - Get all files linked from a specific file
- `find_broken_links` - Identify broken internal links
- `batch_update_links` - Update multiple links at once

### 3. Advanced Search
Status: **COMPLETED** ✅
- `advanced_search` - Comprehensive search with all filters combined

### 4. File Metadata & Content Negotiation
Status: **COMPLETED** ✅
- `get_file_metadata` - Get size, creation/modification dates without content
- `get_file_frontmatter` - Extract only frontmatter for efficient metadata analysis 
- `get_file_formatted` - Retrieve files in different formats (plain, HTML) for token optimization
- Enhanced `get_file_contents` - Now supports format parameter for all content types

## Implementation Guidelines

### Adding New Features

1. **Check API Support**: Verify if Obsidian REST API supports the operation
2. **Design Tool Interface**: Follow existing tool patterns in `src/tools/`
3. **Update Client**: Add methods to `ObsidianClient` if needed
4. **Error Handling**: Use appropriate `McpError` codes
5. **Documentation**: Update README with new tool info
6. **Testing**: Add unit and integration tests

### Priority Considerations

- **High Priority**: Core functionality gaps that block common workflows
- **Medium Priority**: Enhance usability and enable advanced workflows
- **Low Priority**: Nice-to-have features or edge cases

### API Limitations

Some features may require enhancements to the Obsidian Local REST API plugin:
- Directory operations (create, delete, move)
- File metadata access
- Bulk operations with transaction support
- Plugin interaction APIs

## Recent Updates

### LLM-Ergonomic Content Patching (2025-01-08)
Status: **IMPLEMENTED** ✅

Added new tools designed specifically for LLM consumers:
- `query_structure` - Query document structure to build unambiguous references
- `patch_content_v2` - Deterministic content modification with explicit operations

Key improvements:
- Explicit operation types (replace, insert, update_frontmatter)
- Deterministic heading references using paths and occurrence numbers
- Structured error responses for programmatic handling
- Query-first workflow for accurate targeting

The original `patch_content` is now deprecated and will be removed in v1.0.0.

## Next Steps

1. Complete full implementation of patch_content_v2 features:
   - Section-scoped replacements
   - Advanced frontmatter operations (append, remove, merge)
   - Pattern-based insertion
   - Full AST-based document parsing

2. Continue with high-priority features:
   - Remaining link management tools
   - Bulk operations
   - Vault statistics

3. Consider contributing to REST API plugin for missing endpoints
