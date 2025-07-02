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
| `create_directory` | ❌ | Create new directories in the vault | API may not support; workaround: create file in path |
| `delete_directory` | ❌ | Remove empty directories | API limitation; may need enhanced REST API |
| `move_directory` | ✅ | Move entire folder structures with contents | Implemented using recursive file operations |
| `copy_directory` | ❌ | Duplicate folder structures | Requires recursive file operations |

### 2. File Operations (High Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `copy_file` | ❌ | Duplicate files within the vault | Read content + create new file |
| `check_path_exists` | ❌ | Verify if file/directory exists | Try read with error handling |
| `get_file_metadata` | ❌ | Get size, dates, permissions | API may need enhancement |

### 3. Bulk Operations (High Priority)

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

### 5. Link Management (Medium Priority)

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

### 7. Tag Management (Medium Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_all_tags` | ❌ | List all tags in vault | Parse all files for tags |
| `get_files_by_tag` | ❌ | Find files with specific tags | Tag index needed |
| `rename_tag` | ❌ | Rename tags across files | Bulk find/replace |
| `add_tags_to_file` | ❌ | Add tags to files | Frontmatter manipulation |
| `remove_tags_from_file` | ❌ | Remove tags from files | Frontmatter parsing |

### 8. Advanced Search (Medium Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `search_by_frontmatter` | ❌ | Search frontmatter fields | YAML parser needed |
| `regex_search` | ❌ | Regular expression search | Regex engine integration |
| `search_with_filters` | ❌ | Date, type, path filters | Query builder |
| `search_history` | ❌ | Track recent searches | Local storage needed |

### 9. Content Operations (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_file_preview` | ❌ | Get first N lines/chars | Partial file reading |
| `get_file_sections` | ❌ | Extract specific sections | Markdown parser |
| `merge_files` | ❌ | Combine multiple files | Content concatenation |
| `split_file` | ❌ | Split by headings/criteria | Content analysis |

### 10. Integration Features (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `export_to_format` | ❌ | Export to PDF, HTML, etc. | Format converters |
| `import_from_format` | ❌ | Import various formats | Parser libraries |
| `sync_status` | ❌ | Check cloud sync status | Plugin API access |
| `plugin_interaction` | ❌ | Interact with other plugins | Plugin bridge API |

### 11. Performance & Caching (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `cache_management` | ❌ | Clear/manage MCP cache | Cache implementation |
| `batch_prefetch` | ❌ | Prefetch multiple files | Async optimization |
| `incremental_updates` | ❌ | Get only changed content | Change detection |

### 12. Security & Access (Low Priority)

| Feature | Status | Description | Technical Notes |
|---------|--------|-------------|-----------------|
| `get_permissions` | ❌ | Check file permissions | OS-level access |
| `set_permissions` | ❌ | Modify permissions | Security implications |
| `encrypt_content` | ❌ | Encrypt sensitive notes | Crypto library |
| `audit_log` | ❌ | Track MCP operations | Logging framework |

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

## Next Steps

1. Start with high-priority directory management features
2. Investigate API limitations and workarounds
3. Implement features incrementally with proper testing
4. Consider contributing to REST API plugin for missing endpoints
