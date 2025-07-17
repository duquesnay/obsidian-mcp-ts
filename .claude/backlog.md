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
- [ ] T7.1: Create tool discovery mechanism
- [ ] T7.2: Add tool metadata to each tool class
- [ ] T7.3: Implement dynamic tool loading
- [ ] T7.4: Remove hardcoded tool array
- [ ] T7.5: Add tool categorization support

### 8. Naming Consistency (Clean Code)
- [ ] T8.1: Create naming convention guide
- [ ] T8.2: Remove redundant Tool suffix from classes
- [ ] T8.3: Standardize method naming (execute vs executeTyped)
- [ ] T8.4: Update all imports and references

### 9. Tool Categorization (Organization)
- [ ] T9.1: Define ToolCategory enum
- [ ] T9.2: Add category property to BaseTool
- [ ] T9.3: Categorize file operation tools
- [ ] T9.4: Categorize search tools
- [ ] T9.5: Categorize tag tools
- [ ] T9.6: Categorize editing tools
- [ ] T9.7: Update tool listing to group by category

### 10. Performance and Optimization
- [ ] T10.1: Implement caching strategy for ObsidianClient
- [ ] T10.2: Add request deduplication
- [ ] T10.3: Optimize batch processing logic
- [ ] T10.4: Add performance metrics collection
- [ ] T10.5: Document performance best practices

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
- All tests passing after each change
- No regression in functionality
- Improved code coverage
- Reduced code duplication
- Better type safety