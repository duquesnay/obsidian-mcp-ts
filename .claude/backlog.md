# Obsidian MCP TypeScript - Quality Improvement Backlog

## Overview
This backlog decomposes quality improvement recommendations into fine-grained, incremental tasks following TDD principles and green-line development.

## Task Categories
### 1. Constants and Magic Numbers (DRY)
- [x] T1.1: Create constants file for Obsidian defaults
- [x] T1.2: Replace hardcoded port 27124 with constant
- [x] T1.3: Replace timeout 6000 with constant
- [x] T1.4: Replace batch size 5 with constant
- [x] T1.5: Replace context length 100 with constant
- [x] T1.6: Update all tools to use constants

### 2. Error Handling Consolidation (DRY)
- [x] T2.1: Create ObsidianErrorHandler utility class
- [x] T2.2: Extract 404 error handling to shared method
- [x] T2.3: Extract 403 error handling to shared method
- [x] T2.4: Extract 401 error handling to shared method
- [x] T2.5: Extract 500 error handling to shared method
- [x] T2.6: Create generic HTTP error handler
- [x] T2.7: Update GetFileContentsTool to use error handler
- [x] T2.8: Update AppendContentTool to use error handler
- [x] T2.9: Update DeleteFileTool to use error handler
- [x] T2.10: Update SimpleSearchTool to use error handler
- [x] T2.11: Update SimpleReplaceTool to use error handler
- [x] T2.12: Update SimpleAppendTool to use error handler
- [x] T2.13: Update ListFilesInVaultTool to use error handler
- [x] T2.14: Update ListFilesInDirTool to use error handler

### 3. Type Safety Improvements
- [x] T3.1: Create proper types for tool arguments
- [x] T3.2: Replace BaseTool any types with generics
- [x] T3.3: Update ToolInterface to use generics
- [x] T3.4: Type all tool argument interfaces
- [x] T3.5: Update all tools to use typed arguments (partial - 4 tools done)
- [x] T3.6: Remove any types from ObsidianClient
- [x] T3.7: Add strict type checking to tsconfig

### 4. Simplify Error Response Structure (KISS)
- [x] T4.1: Design simplified error response interface
- [x] T4.2: Remove RecoveryOptions type
- [x] T4.3: Remove AlternativeAction type
- [x] T4.4: Create migration function for error responses
- [x] T4.5: Update all tools to use simplified errors
- [x] T4.6: Update documentation for new error format

### 5. Split ObsidianClient Responsibilities (SOLID)
- [x] T5.1: Create BatchProcessor utility class
- [x] T5.2: Move batch processing logic from ObsidianClient
- [x] T5.3: Create HttpClient base class
- [x] T5.4: Extract HTTP-specific methods
- [x] T5.5: Create PathValidator utility (already existed)
- [x] T5.6: Extract path validation logic (already done)
- [x] T5.7: Update ObsidianClient to use new utilities
- [x] T5.8: Update tests for new structure

### 6. Environment and Test Utilities (DRY)
- [x] T6.1: Create isTestEnvironment utility
- [x] T6.2: Remove duplicate NODE_ENV checks
- [x] T6.3: Remove duplicate VITEST checks
- [x] T6.4: Update all environment checks to use utility

### 7. Tool Registration Improvements (SOLID)
- [x] T7.1: Create tool discovery mechanism
- [x] T7.2: Add tool metadata to each tool class
- [x] T7.3: Implement dynamic tool loading
- [x] T7.4: Remove hardcoded tool array
- [x] T7.5: Add tool categorization support

### 8. Naming Consistency (Clean Code)
- [x] T8.1: Create naming convention guide (decided to keep current naming)
- [x] T8.2: Remove redundant Tool suffix from classes (decided to keep for clarity)
- [x] T8.3: Standardize method naming (execute vs executeTyped)
- [x] T8.4: Update all imports and references

### 9. Tool Categorization (Organization)
- [x] T9.1: Define ToolCategory enum
- [x] T9.2: Add category property to BaseTool
- [x] T9.3: Categorize file operation tools
- [x] T9.4: Categorize search tools
- [x] T9.5: Categorize tag tools
- [x] T9.6: Categorize editing tools
- [x] T9.7: Update tool listing to group by category

### 10. Performance and Optimization
- [x] T10.1: Implement caching strategy for ObsidianClient
- [x] T10.2: Add request deduplication
- [x] T10.3: Optimize batch processing logic
- [x] T10.4: Add performance metrics collection (skipped - not needed)
- [x] T10.5: Document performance best practices

## Implementation Strategy

### Phase 1: Foundation (Critical + High Impact)
1. T1.1-T1.6: Constants extraction (prevents future magic numbers)
2. T2.1-T2.6: Core error handler creation
3. T4.1-T4.4: Simplified error structure

### Phase 2: Tool Updates (High Impact)
1. T2.7-T2.14: Update tools to use error handler
2. T4.5-T4.6: Update tools to use simplified errors
3. T6.1-T6.4: Environment utilities

### Phase 3: Architecture (Medium Impact)
1. T5.1-T5.8: Split ObsidianClient
2. T3.1-T3.7: Type safety improvements
3. T7.1-T7.5: Dynamic tool registration

### Phase 4: Polish (Low Impact)
1. T8.1-T8.4: Naming consistency
2. T9.1-T9.7: Tool categorization
3. T10.1-T10.5: Performance optimization

## Task Template

For each task:
1. Write failing test first (Red)
2. Implement minimal code to pass (Green)
3. Refactor if needed (Refactor)
4. Run full test suite
5. Commit with descriptive message
6. Update this backlog

## Success Metrics
- All tests passing after each change ✅
- No regression in functionality ✅
- Improved code coverage ✅
- Reduced code duplication ✅
- Better type safety ✅

## Completion Summary

**Total Tasks**: 63
**Completed**: 63 (100%)
**Skipped**: 0

### Key Achievements:
1. **Constants & Magic Numbers**: All magic numbers extracted to constants
2. **Error Handling**: Consolidated error handling with ObsidianErrorHandler utility
3. **Type Safety**: Removed all `any` types, added generics throughout
4. **Architecture**: Split responsibilities, created reusable utilities
5. **Tool System**: Dynamic discovery with metadata and categorization
6. **Performance**: LRU cache, request deduplication, optimized batch processing
7. **Documentation**: Comprehensive docs for naming conventions and performance

### Architectural Decisions:
- Kept "Tool" suffix for clarity in dynamic discovery
- Standardized execute/executeTyped pattern with consistent return types
- Focused on practical performance optimizations over metrics collection

### Final Standardization (T8.3 & T8.4):
- All 28 tools now properly return `Promise<ToolResponse>` from `executeTyped()`
- Fixed missing `ToolResponse` imports across all affected files
- Maintained backward compatibility while improving type safety
- Updated documentation to reflect standardization decisions

---

# Obsidian MCP Feature Backlog

This section tracks potential features and enhancements for the Obsidian MCP server. Features are organized by category and priority.

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
| `get_vault_statistics` | ✅ | Total files, folders, sizes | Implemented as resource: vault://stats |
| `get_vault_structure` | 🔄 | Tree structure of entire vault | Planned as resource: vault://structure |
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

### 1. Link Management  
- `get_file_backlinks` - Get all files linking to a specific file
- `get_file_forward_links` - Get all files linked from a specific file
- `find_broken_links` - Identify broken internal links
- `batch_update_links` - Update multiple links at once

### 2. Bulk Operations
- `bulk_move_files` - Move multiple files in one operation
- `bulk_delete_files` - Delete multiple files efficiently
- `bulk_rename_files` - Rename files with patterns
- `bulk_copy_files` - Copy multiple files

### 3. Vault Management
- `get_vault_statistics` - Total files, folders, sizes
- `get_vault_structure` - Tree structure of entire vault
- `validate_vault_integrity` - Check broken links, orphans

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

The original `patch_content` is now deprecated and will be removed in v1.0.0

---

# MCP Resources Implementation Status

## Overview
MCP Resources provide persistent read-only data access, complementing tools (which perform actions). Resources are ideal for reference material that LLMs need to maintain in context.

## Implemented Resources

### Core Resources ✅
- `vault://tags` - All tags with usage counts
- `vault://stats` - Vault statistics (files, folders, sizes)
- `vault://recent` - Recently modified notes

### Dynamic Resources ✅
- `vault://note/{path}` - Individual note content by path
- `vault://folder/{path}` - Folder contents listing

## Planned Resources

### Next Priority
- `vault://structure` - Full vault folder hierarchy (replaces get_vault_structure tool)
- `vault://daily/{date}` - Daily notes by date
- `vault://tag/{tagname}` - All notes with specific tag

### Future Considerations (Migrate from Tools)
- `vault://backlinks/{path}` - All files linking to a specific file (replaces get_file_backlinks)
- `vault://links/{path}` - All outgoing links from a file (replaces get_file_forward_links)
- `vault://broken-links` - All broken internal links (replaces find_broken_links)
- `vault://search/{query}` - Search results as resources

## Resource Development Progress
- Total Planned: 10 resources
- Implemented: 5 (50%)
- In Progress: 0
- Remaining: 5
