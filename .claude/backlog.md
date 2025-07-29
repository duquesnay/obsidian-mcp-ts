# Obsidian MCP TypeScript - Product Backlog

## Product Backlog (User Capabilities)

- [x] RSM1.1: See vault structure without context overflow
  - [x] Create mode parameter interface (?mode=summary|preview|full) for this resource only
  - [x] Return folder/file names only without content (summary mode default)
  - [x] Include basic metadata (count, size estimates)
  - [x] Preserve full content mode with ?mode=full parameter
  - [x] Update corresponding tools to use summary mode by default
  - [x] Add comprehensive tests for all modes
  - [x] Document the new response mode system

- [x] RSM1.2: Scan recent changes with manageable previews
  - [x] Extend mode parameter system to vault://recent resource
  - [x] Return titles + first 100 characters preview (preview mode default)
  - [x] Include modification dates and file paths
  - [x] Preserve full content mode with ?mode=full parameter
  - [x] Update GetRecentChangesTool to use preview mode by default
  - [x] Add comprehensive tests for all modes
  - [x] Update documentation with new resource mode

- [x] RSM1.3: Preview individual notes efficiently
  - [x] Extend mode parameter system to vault://note/{path} resource
  - [x] Return frontmatter + first 200 characters of content (preview mode default)
  - [x] Include basic note statistics (word count, headers)
  - [x] Preserve full content mode with ?mode=full parameter
  - [x] Update GetFileContentsTool to use preview mode by default
  - [x] Add comprehensive tests for all modes
  - [x] Update documentation with new resource mode

- [x] RSM1.4: Navigate folder listings without overload
  - [x] Extend mode parameter system to vault://folder/{path} resource
  - [x] Return file listings without content previews (summary mode default)
  - [x] Include file counts and basic metadata
  - [x] Preserve full content mode with ?mode=full parameter
  - [x] Update ListFilesInDirTool to use summary mode by default
  - [x] Add comprehensive tests for all modes
  - [x] Update documentation with new resource mode

- [x] RSM1.5: Evaluate search results with context snippets
  - [x] Extend mode parameter system to vault://search/{query} resource
  - [x] Return search results with 100-character context snippets (preview mode default)
  - [x] Include match counts and file paths
  - [x] Preserve full content mode with ?mode=full parameter
  - [x] Update SimpleSearchTool to use preview mode by default
  - [x] Add comprehensive tests for all modes
  - [x] Update documentation with new resource mode

- [x] RSM1.6: Browse tag collections with usage patterns
  - [x] Extend mode parameter system to vault://tags resource
  - [x] Add metadata about tag usage patterns (already reasonable size)
  - [x] Include top tags by frequency with usage statistics
  - [x] Update GetAllTagsTool to use optimized response
  - [x] Add comprehensive tests for all modes
  - [x] Update documentation with new resource mode

- [x] RSM1.7: Control response sizes consistently across resources
  - [x] Extract common mode parameter handling into BaseResourceHandler
  - [x] Create shared response size utilities (summary <500 chars, preview <2000 chars)
  - [x] Optimize summary generation algorithms across all resources
  - [x] Add caching for computed previews
  - [x] Measure and document performance improvements
  - [x] Update all existing response mode implementations to use shared system

- [x] RPS1.1: Browse large vault structures in manageable chunks
  - [x] Create pagination interface (?limit=N&offset=N) for this resource only
  - [x] Default limit=50 files/folders per page
  - [x] Include pagination metadata (hasMore, total, nextUri)
  - [x] Maintain legacy unlimited mode with ?legacy=true
  - [x] Update ListFilesInVaultTool to handle paginated responses
  - [x] Add comprehensive tests for pagination behavior
  - [x] Document pagination parameters and usage

- [x] RPS1.2: Navigate recent changes with chronological pagination
  - [x] Extend pagination system to vault://recent resource
  - [x] Default limit=20 recent items per page
  - [x] Include modification dates and continuation tokens
  - [x] Optimize for time-based pagination (chronological ordering)
  - [x] Update GetRecentChangesTool to handle paginated responses
  - [x] Add comprehensive tests for time-based pagination
  - [x] Update documentation with pagination examples

- [x] RPS1.3: Explore folder contents in paged responses
  - [x] Extend pagination system to vault://folder/{path} resource
  - [x] Default limit=50 items per page
  - [x] Handle nested folder pagination efficiently
  - [x] Include directory metadata and item counts
  - [x] Update ListFilesInDirTool to handle paginated responses
  - [x] Add comprehensive tests for folder pagination
  - [x] Update documentation with folder pagination examples

- [x] RPS1.4: Review search results in small batches
  - [x] Extend pagination system to vault://search/{query} resource
  - [x] Default limit=10 results per page (search results are expensive)
  - [x] Include relevance scoring and result ranking
  - [x] Support continuation tokens for consistent ordering
  - [x] Update SimpleSearchTool to handle paginated search results
  - [x] Add comprehensive tests for search pagination
  - [x] Update documentation with search pagination examples

- [x] RPS1.5: Browse tag collections with optimized pagination
  - [x] Extend pagination system to vault://tags resource
  - [x] Default limit=100 tags per page (tags are lightweight)
  - [x] Sort by usage frequency for better UX
  - [x] Include tag usage statistics in metadata
  - [x] Update GetAllTagsTool to handle paginated tag responses
  - [x] Add comprehensive tests for tag pagination
  - [x] Update documentation with tag pagination examples

- [x] RPS1.6: Access consistent pagination across all resources
  - [x] Extract common pagination logic into BaseResourceHandler
  - [x] Create shared pagination parameter parsing utilities
  - [x] Generate standardized pagination metadata across all resources
  - [x] Support multiple pagination styles (offset/limit, page/limit)
  - [x] Update all existing paginated implementations to use shared system
  - [x] Add performance benchmarks for paginated vs non-paginated responses

- [x] RPS1.7: Receive optimized caching for paginated data
  - [x] Update CachedResourceHandler to cache paginated responses by page parameters
  - [x] Implement smart cache invalidation for paginated data
  - [x] Handle partial cache updates when underlying data changes
  - [x] Optimize memory usage for large cached datasets
  - [x] Add cache hit/miss metrics for paginated resources
  - [x] Document caching behavior for paginated resources

- [x] POI1.1: Receive automatic cache invalidation on file changes
- [ ] POI1.2: Experience optimized batch processing with retry logic
- [ ] POI1.3: Benefit from automatic request deduplication
- [ ] POI1.4: Access well-documented configuration options

## Technical Backlog (Code Implementation)

### Performance Integration Tasks
- [ ] POI2.1: Integrate OptimizedBatchProcessor in FileOperationsClient
- [ ] POI2.2: Add streaming mode for large batch operations
- [ ] POI2.3: Configure retry logic with exponential backoff
- [ ] POI2.4: I. What wmplement RequestDeduplicator in ObsidianClient
- [ ] POI2.5: Add deduplication for high-frequency operations
- [ ] POI2.6: Create metrics tracking for deduplication
- [ ] POI2.7: Document configuration file hierarchy
- [ ] POI2.8: Create config file template and examples

## User Story Details

### RSM1.1: See vault structure without context overflow
**User Story**: As a user, I want to see vault structure with folder/file names and counts by default, so that conversations don't get overwhelmed with full content.
**Acceptance Criteria**: 
- Summary mode returns names + metadata by default
- Full mode available via ?mode=full parameter
- Response size under 2000 characters for typical vaults

### RSM1.2: Scan recent changes with manageable previews
**User Story**: As a user, I want to scan recent changes with titles and brief previews by default, so that I can quickly identify relevant recent activity.
**Acceptance Criteria**:
- Preview mode returns titles + 100 chars by default
- Full content available via ?mode=full parameter
- Chronological ordering with modification dates

### RSM1.3: Preview individual notes efficiently
**User Story**: As a user, I want to preview individual notes with frontmatter and content snippets by default, so that I can decide if I need full content.
**Acceptance Criteria**:
- Preview mode returns frontmatter + 200 chars by default
- Complete note available via ?mode=full parameter
- Basic note statistics included (word count, headers)

### RSM1.4: Navigate folder listings without overload
**User Story**: As a user, I want to navigate folder listings with file names and counts by default, so that I can browse without content overload.
**Acceptance Criteria**:
- Summary mode returns file lists + metadata by default
- File previews available via ?mode=full parameter
- Nested folder structure preserved

### RSM1.5: Evaluate search results with context snippets
**User Story**: As a user, I want to evaluate search results with context snippets by default, so that I can assess relevance quickly.
**Acceptance Criteria**:
- Preview mode returns snippets + match counts by default
- Complete matches available via ?mode=full parameter
- Relevance scoring included

### RSM1.6: Browse tag collections with usage patterns
**User Story**: As a user, I want to browse tag listings with usage statistics and patterns, so that I can understand my tagging behavior.
**Acceptance Criteria**:
- Tags display with counts and frequency patterns
- Usage metadata and trends included
- Sort by frequency or alphabetical

### RSM1.7: Control response sizes consistently across resources
**User Story**: As a power user, I want to control response modes consistently across all resources, so that I can predict and manage response sizes.
**Acceptance Criteria**:
- All resources support ?mode parameter with consistent behavior
- Mode parameter works across vault://, tool calls, and resource access
- Documented mode options (summary, preview, full)

### RPS1.1: Browse large vault structures in manageable chunks
**User Story**: As a user with a large vault, I want to browse vault structure in manageable chunks, so that I don't overwhelm the conversation with thousands of files.
**Acceptance Criteria**:
- Default limit of 50 files/folders per page
- Pagination interface (?limit=N&offset=N) available
- Pagination metadata includes hasMore, total, nextUri
- Legacy unlimited mode available with ?legacy=true

### RPS1.2: Navigate recent changes with chronological pagination
**User Story**: As a user with an active vault, I want to navigate recent changes in chronological pages, so that I can efficiently review recent activity.
**Acceptance Criteria**:
- Default limit of 20 recent items per page
- Time-based pagination with chronological ordering
- Modification dates and continuation tokens included
- Efficient for large vault histories

### RPS1.3: Explore folder contents in paged responses
**User Story**: As a user browsing large folders, I want to explore folder contents in pages, so that I can navigate without performance issues.
**Acceptance Criteria**:
- Default limit of 50 items per page
- Nested folder pagination handled efficiently
- Directory metadata and item counts included
- Preserves folder hierarchy navigation

### RPS1.4: Review search results in small batches
**User Story**: As a user searching large vaults, I want to review search results in small batches, so that I can assess relevance without overwhelming responses.
**Acceptance Criteria**:
- Default limit of 10 results per page (search is expensive)
- Relevance scoring and result ranking maintained
- Continuation tokens for consistent ordering
- Progressive result refinement possible

### RPS1.5: Browse tag collections with optimized pagination
**User Story**: As a user with many tags, I want to browse tag collections in organized pages, so that I can explore my tagging system efficiently.
**Acceptance Criteria**:
- Default limit of 100 tags per page (tags are lightweight)
- Sorted by usage frequency for better UX
- Tag usage statistics included in metadata
- Efficient for vaults with hundreds of tags

### RPS1.6: Access consistent pagination across all resources
**User Story**: As a power user, I want to access consistent pagination patterns across all resources, so that I can predict and control data loading behavior.
**Acceptance Criteria**:
- Common pagination logic shared across all resources
- Multiple pagination styles supported (offset/limit, page/limit)
- Standardized pagination metadata format
- Performance benchmarks validate improvements

### RPS1.7: Receive optimized caching for paginated data
**User Story**: As a user working with large datasets, I want to receive optimized caching for paginated responses, so that navigation between pages is fast and efficient.
**Acceptance Criteria**:
- Paginated responses cached by page parameters
- Smart cache invalidation for paginated data
- Partial cache updates when underlying data changes
- Memory usage optimized for large cached datasets

### POI1.1: Receive automatic cache invalidation on file changes
**User Story**: As a user editing notes, I want to receive automatic cache invalidation when files change, so that I always see current data without manual cache clearing.
**Acceptance Criteria**:
- File operations trigger cache invalidation events automatically
- Subscription system connects NotificationManager to CacheSubscriptionManager
- Cache synchronization works across all tools and resources
- Integration tests verify subscription event flow

### POI1.2: Experience optimized batch processing with retry logic
**User Story**: As a user working with multiple files, I want to experience optimized batch processing with retry logic, so that bulk operations are reliable and efficient.
**Acceptance Criteria**:
- OptimizedBatchProcessor replaces standard BatchProcessor in FileOperationsClient
- Streaming mode available for large operations
- Retry logic configured for batch operations with exponential backoff
- Progress callbacks available for batch tools
- Memory-efficient streaming for operations on hundreds of files

### POI1.3: Benefit from automatic request deduplication
**User Story**: As a user making frequent requests, I want to benefit from automatic request deduplication, so that identical concurrent requests don't create unnecessary load.
**Acceptance Criteria**:
- RequestDeduplicator integrated into ObsidianClient services
- High-frequency operations wrapped (getFileContents, search operations)
- Deduplication keys generated for different request types
- Metrics tracking shows deduplication effectiveness
- Concurrent identical requests return same cached response

### POI1.4: Access well-documented configuration options
**User Story**: As a user setting up the MCP server, I want to access well-documented configuration options, so that I can customize behavior for my specific needs.
**Acceptance Criteria**:
- Config file hierarchy documented in README.md
- Examples of config file usage provided
- Environment variable precedence clearly explained
- Config file template available for common scenarios


