# Obsidian MCP Resources - Work Coordination Backlog

## Development Principles
- Follow TDD for all changes
- Let architecture emerge from working code  
- Each item delivers user value
- Refactor when patterns repeat (Rule of Three)

## Work Items

### 1. Complete Vault Structure Resource (R6.3)
**Status**: Next Priority
**Description**: Implement vault://structure resource for full folder hierarchy
**Tasks**:
- Add VaultStructureHandler extending BaseResourceHandler
- Implement recursive directory traversal
- Return hierarchical JSON structure
- Add comprehensive tests
- Update resource registry

### 2. Implement Resource Caching (R7.1)
**Status**: Planned
**Description**: Add caching layer for resource performance
**Tasks**:
- Design cache strategy for different resource types
- Implement TTL-based caching
- Add cache invalidation mechanisms
- Performance testing with large vaults

### 3. Add Resource Templates for Discovery (R7.2)
**Status**: Planned
**Description**: Provide template/example resources for better discoverability
**Tasks**:
- Define template format
- Create example resources
- Update resource listing with templates
- Documentation for resource discovery

### 4. Implement Live Resource Updates (R8.1)
**Status**: Future
**Description**: Subscribe to resource changes for real-time updates
**Tasks**:
- Design subscription mechanism
- Implement change detection
- Add WebSocket or SSE support
- Client-side subscription handling

### 5. Add Search Results as Resources (R8.2)
**Status**: Future
**Description**: Expose search results via vault://search/{query} resources
**Tasks**:
- Design search resource URI pattern
- Implement SearchResultsHandler
- Cache search results appropriately
- Handle search result pagination

### 6. Optimize for Large Vaults (R9.1)
**Status**: Future
**Description**: Performance improvements for vaults with >10k notes
**Tasks**:
- Profile current performance bottlenecks
- Implement incremental loading
- Add streaming for large responses
- Memory usage optimization

### 7. Comprehensive Error Handling (R9.2)
**Status**: Future
**Description**: Improve error handling across all resource handlers
**Tasks**:
- Standardize error response format
- Add recovery suggestions
- Implement graceful degradation
- Error tracking and analytics

### 8. Resource Usage Documentation (R9.3)
**Status**: Future
**Description**: Complete documentation for resource usage patterns
**Tasks**:
- Create resource usage guide
- Add practical examples
- Document best practices
- Integration examples with AI tools

## Historical Context

### Completed Quality Improvements (T1-T10)
**Status**: ✅ Complete (63/63 tasks)
- All code quality, architecture, and performance improvements completed
- Dynamic tool discovery, error handling, caching, type safety implemented
- Project now has solid foundation for resource development

### Critical Issue Resolution
**RESOLVED**: Three resources were previously using hardcoded mock data:
- R1.2: vault://tags - Fixed to use real ObsidianClient.getAllTags()
- R3.1: vault://stats - Fixed to use real vault file counts  
- R3.2: vault://recent - Fixed to use real ObsidianClient.getRecentChanges()
- Resolution commits: a717927, 3f06de6, d5946fa

### Architecture Improvements (R5.1)
**Status**: ✅ Complete
- Implemented ResourceRegistry to eliminate if-else chains
- Created BaseResourceHandler to reduce code duplication
- Improved maintainability and extensibility for new resources

## Current Status
- **Active Branch**: feat/mcp-resources
- **Next Priority**: Item #1 - Complete Vault Structure Resource
- **Resource Implementation**: 7/10 planned resources complete (70%)
- **Focus**: Completing core resource coverage before advanced features