# UnifiedEditTool Extensive Testing Scenarios

## Objective
Test the UnifiedEditTool (`obsidian_edit`) against the same scenarios that caused other tools to fail in user feedback, to determine if it should become the primary editing tool.

## Test Scenarios (Based on User Feedback Failures)

### Scenario 1: Simple Append (Where patch_content_v2 failed)
**User Feedback**: "Just appending text required understanding a complex schema vs `append_content` which just works"

**Test**: Simple text append using UnifiedEditTool's Stage 1 (100% reliability)
```javascript
{
  file: "test-doc.md",
  append: "## New Section\n\nThis is additional content."
}
```

**Expected**: Should work as simply as append_content but through unified interface

### Scenario 2: Insert After Heading (Where insert_after_heading failed)
**User Feedback**: "invalid-target error despite the heading existing", "failed to locate target heading"

**Test**: Structure-aware insertion using UnifiedEditTool's Stage 2 (90%+ reliability)
```javascript
{
  file: "test-doc.md", 
  after: "Implementation",
  add: "### Database Layer\n\nDescribe database architecture here."
}
```

**Expected**: Should work where insert_after_heading failed with "invalid-target"

### Scenario 3: Complex Multi-line Replacement (Where validation errors occurred)
**User Feedback**: "complex validation errors", "union errors are confusing"

**Test**: Text replacement using UnifiedEditTool's Stage 2
```javascript
{
  file: "test-doc.md",
  find: "TBD",
  replace: "### Database Layer\n\nPostgreSQL database with:\n- User authentication\n- Data persistence\n- Query optimization"
}
```

**Expected**: Should handle complex replacements without validation errors

### Scenario 4: Mixed Operations (Complex document modifications)
**User Feedback**: Users needed multiple tool calls for complex edits

**Test**: Multiple operations in sequence to test tool consistency
```javascript
// First operation
{ file: "test-doc.md", find: "Feature 1", replace: "Advanced Analytics" }

// Second operation  
{ file: "test-doc.md", after: "Features", add: "- Real-time Dashboards" }

// Third operation
{ file: "test-doc.md", append: "## Conclusion\n\nProject completed successfully." }
```

**Expected**: All operations should work consistently with same tool

### Scenario 5: Error Recovery (Test progressive fallback)
**User Feedback**: "When complex tools failed, users fell back to simple tools"

**Test**: Intentionally test error scenarios and recovery
```javascript
// Intentionally bad heading name
{ file: "test-doc.md", after: "NonExistentHeading", add: "content" }
```

**Expected**: Should provide helpful error recovery suggestions

## Success Criteria

### If UnifiedEditTool Succeeds (80%+ scenarios work):
1. **Recenter architecture** around UnifiedEditTool as primary editing tool
2. **Remove redundant tools**: 
   - InsertAfterHeadingTool (replaced by unified after/before)
   - PatchContentTool, PatchContentToolV2 (replaced by unified operations)
   - ObsidianNaturalEditTool, ObsidianEditTool (replaced by unified)
3. **Keep minimal set**:
   - UnifiedEditTool (primary)
   - SimpleAppendTool, SimpleReplaceTool (reliable fallbacks)
   - Core file/search tools
4. **Reduce tool count** from 9 editing tools to 3

### If UnifiedEditTool Fails (< 80% scenarios work):
1. **Keep simple tools** that work (SimpleReplaceTool, SimpleAppendTool)
2. **Remove complex tools** including UnifiedEditTool
3. **Focus on reliability** over sophistication

## Testing Process
1. Create test documents
2. Execute each scenario with UnifiedEditTool
3. Compare results to user feedback on failed tools
4. Document success/failure rates
5. Make architectural decisions based on results