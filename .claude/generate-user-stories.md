# User Story Generation Templates

## Template Patterns by Capability Type

### Pattern 1: Create/Add Operations
For items like "Create new notes", "Add tags", "Create folders"
```markdown
### {ID}: {Capability}
**User Story**: As a {user_type}, I want to {action} quickly and reliably, so that I can {benefit}.

**Acceptance Criteria**:
- Complete {action} with single command/operation
- Handle edge cases (special characters, conflicts)
- Provide clear success confirmation
- Fail gracefully with actionable error messages
- Support both simple and advanced use cases

**Implementation Notes**:
- Use appropriate Obsidian REST API endpoint
- Validate inputs before execution
- Return created/modified resource details
```

### Pattern 2: Search/Find Operations
For items like "Search text", "Find empty directories", "Get files by tag"
```markdown
### {ID}: {Capability}
**User Story**: As a {user_type}, I want to {search_action} efficiently, so that I can {benefit}.

**Acceptance Criteria**:
- Return results in under {time} for large vaults
- Include relevant context with each result
- Support filtering and sorting options
- Handle zero results gracefully
- Paginate large result sets

**Implementation Notes**:
- Leverage search indexes where available
- Cache results for repeated queries
- Implement progressive loading
```

### Pattern 3: View/Browse Operations
For items like "View vault structure", "Browse folders", "Preview notes"
```markdown
### {ID}: {Capability}
**User Story**: As a {user_type}, I want to {view_action} without overwhelming detail, so that I can {benefit}.

**Acceptance Criteria**:
- Display information in digestible chunks
- Provide options for detail levels
- Load quickly even for large datasets
- Support navigation/drilling down
- Remember user preferences

**Implementation Notes**:
- Use response modes (summary/preview/full)
- Implement efficient data fetching
- Cache frequently accessed views
```

### Pattern 4: Edit/Modify Operations
For items like "Edit notes", "Rename files", "Update tags"
```markdown
### {ID}: {Capability}
**User Story**: As a {user_type}, I want to {edit_action} safely and efficiently, so that I can {benefit}.

**Acceptance Criteria**:
- Preserve data integrity during modifications
- Support undo/rollback where applicable
- Update all references automatically
- Preview changes before applying
- Handle concurrent edits gracefully

**Implementation Notes**:
- Use transactions where possible
- Implement optimistic locking
- Validate changes before committing
```

### Pattern 5: Performance/Optimization Features
For items like "Open large vaults instantly", "Cache frequently accessed data"
```markdown
### {ID}: {Capability}
**User Story**: As a {user_type}, I want {performance_benefit}, so that I can work efficiently regardless of vault size.

**Acceptance Criteria**:
- Meet specific performance targets
- Scale linearly with data size
- Provide progress indicators for long operations
- Allow cancellation of operations
- Degrade gracefully under load

**Implementation Notes**:
- Implement appropriate caching strategy
- Use lazy loading and pagination
- Monitor performance metrics
```

### Pattern 6: Error/Quality Features
For items like "Get clear error messages", "Recover from errors"
```markdown
### {ID}: {Capability}
**User Story**: As a {user_type}, I want {quality_feature}, so that I can {benefit}.

**Acceptance Criteria**:
- Provide clear, actionable information
- Include relevant context
- Suggest solutions where possible
- Log appropriately for debugging
- Maintain security (don't expose sensitive data)

**Implementation Notes**:
- Centralized error handling
- Consistent message formatting
- Context-aware suggestions
```

## Bulk Generation Process

1. **Group backlog items** by pattern type
2. **Extract key information**:
   - User type (from context)
   - Action verb (from capability)
   - Benefit (inferred from capability)
   - Performance requirements (if applicable)
3. **Apply appropriate template**
4. **Customize based on specific capability**
5. **Review and refine**

## User Types Reference
- Obsidian user (general)
- Knowledge worker (professionals)
- Power user (large vaults)
- Vault curator (organization-focused)
- Researcher (search-heavy)
- Content creator (editing-focused)
- Team member (collaboration)
- Developer (integration/API usage)