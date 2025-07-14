# LLM Ergonomics Analysis & Refinement Recommendations

## Current State Analysis

Based on user feedback from multiple testing cycles, a clear pattern emerges:

### Tools That Consistently Work Well
1. **obsidian_simple_replace** - 100% success rate, intuitive parameters
2. **obsidian_simple_append** - Reliable, straightforward interface
3. **obsidian_converse_with_doc** - 87.5% success rate (7/8 commands), natural language interface

### Tools That Struggle
1. **obsidian_patch_content_v2** - Complex validation errors despite ergonomic shortcuts
2. **obsidian_natural_edit** - Validation errors about content format
3. **obsidian_insert_after_heading** - "invalid-target" errors even when headings exist

## Key User Behavior Patterns

### 1. Fallback to Reliability
**Observation**: When complex tools fail, users immediately switch to simple tools that work.
**Implication**: Reliability trumps features. A simple tool that works is preferred over a powerful tool that errors.

### 2. Permission Fatigue
**Observation**: Permission barriers prevent tool evaluation and create workflow friction.
**Implication**: Tools need pre-configured permissions or clearer permission management.

### 3. Tool Selection Confusion
**Observation**: Users struggle to choose between patch_content, patch_content_v2, and simple tools.
**Implication**: Too many overlapping tools create cognitive overhead.

## Refinement Recommendations

### 1. Tool Clarity & Discoverability

#### Current Problem
- Conflicting tool descriptions that don't clearly differentiate use cases
- Technical jargon in descriptions doesn't match user mental models
- No clear guidance on which tool to use when

#### Recommended Fixes

**A. Simplify Tool Descriptions**
```typescript
// BEFORE: Technical jargon
description = `Smart content modification with progressive complexity. Start simple - the tool handles complexity automatically.`

// AFTER: Clear use case mapping
description = `For document editing. Use this when:
• Adding text to end of file → append: "text"
• Find and replace → replace: { find: "old", with: "new" }
• Insert after heading → insertAfterHeading: { heading: "Title", content: "text" }

⚠️ For simple appending, obsidian_simple_append is more reliable.`
```

**B. Add Discovery Hints in Descriptions**
- Each tool should clearly state its primary use case in the first line
- Include "When NOT to use this tool" guidance
- Cross-reference simpler alternatives

### 2. Error Handling Improvements

#### Current Problem
- Complex validation errors that don't help users recover
- Error messages use technical terms (invalid_union, validation errors)
- No immediate working examples in error responses

#### Recommended Fixes

**A. Error Message Templates**
```typescript
// BEFORE: Technical error
"Validation error: invalid_union"

// AFTER: Recovery-focused error
"❌ Input format issue. ✅ Try this instead:
{ filepath: 'file.md', append: 'your text here' }

Need something else? Use obsidian_simple_replace for find/replace."
```

**B. Immediate Recovery Examples**
Every error should include:
1. What went wrong (in user terms)
2. Exact working example for their use case
3. Alternative tool suggestion if applicable

### 3. Tool Interface Optimization

#### Current Problem
- insert_after_heading fails despite correct parameters
- patch_content_v2 still has validation issues despite shortcuts
- Permission errors block tool evaluation

#### Recommended Fixes

**A. Robust Target Resolution**
```typescript
// Enhanced heading resolution in insert_after_heading
private async findHeading(filepath: string, headingText: string): Promise<any> {
  // Try exact match first
  // Fall back to case-insensitive
  // Try partial match
  // Provide specific suggestions
  // Show all available headings if none match
}
```

**B. Content Format Normalization**
```typescript
// Bulletproof content handling
private normalizeContent(content: any): string {
  // Handle all possible formats silently
  // Never throw validation errors for content format
  // Log warnings but continue processing
}
```

### 4. Tool Portfolio Rationalization

#### Current Problem
- Too many overlapping tools confuse selection
- patch_content (deprecated) still appears in tool lists
- Complex tools aren't significantly more powerful than simple ones

#### Recommended Fixes

**A. Hide Deprecated Tools**
Remove patch_content from tool registration to reduce confusion.

**B. Clear Tool Hierarchy**
```
Level 1 (Daily Use): obsidian_simple_append, obsidian_simple_replace
Level 2 (Structured): obsidian_insert_after_heading, obsidian_converse_with_doc  
Level 3 (Advanced): obsidian_patch_content_v2 (for multi-location edits only)
```

**C. Tool Description Hierarchy**
Start simple tool descriptions with "⭐ RECOMMENDED:" for common use cases.

### 5. Permission Management

#### Current Problem
- Tools require permissions that aren't pre-granted
- Permission errors provide no recovery path
- Users can't test tools without permission configuration

#### Recommended Fixes

**A. Better Permission Errors**
```typescript
if (permissionDenied) {
  return {
    error: {
      message: "Permission required for this tool",
      recovery: "Alternative: Use obsidian_simple_append which works without additional permissions",
      permissionConfig: "To enable this tool: add 'mcp__obsidian-ts-0_5-alpha__*' to allowedTools"
    }
  }
}
```

## Implementation Priority

### High Priority (Immediate Impact)
1. **Fix insert_after_heading reliability** - This tool should work when headings exist
2. **Simplify error messages** - Replace technical errors with recovery-focused messages
3. **Hide deprecated tools** - Remove patch_content from active tool list

### Medium Priority (User Experience)
4. **Update tool descriptions** - Clear use case mapping and alternatives
5. **Improve permission errors** - Provide alternatives and configuration guidance
6. **Add discovery hints** - Help users choose the right tool

### Low Priority (Polish)
7. **Tool hierarchy indicators** - Mark recommended tools clearly
8. **Cross-tool suggestions** - Reference simpler alternatives in complex tools

## Success Metrics

- **Reliability Rate**: Simple operations should have 95%+ success rate
- **Fallback Reduction**: Users should not need to try multiple tools for common tasks
- **Error Recovery**: Users should successfully complete tasks after encountering errors
- **Tool Adoption**: Users should consistently choose appropriate tools for their tasks

## Key Insight: Simplicity Wins

The data clearly shows that simple, reliable tools with clear interfaces are preferred over complex, powerful tools with validation issues. The refinement strategy should prioritize:

1. **Reliability over features** - A working simple tool beats a broken complex one
2. **Clear interfaces over flexibility** - Obvious parameters beat configuration options
3. **Immediate success over progressive disclosure** - Tools should work on first try

The goal is not to make the most powerful tools, but to make tools that LLMs can use successfully and confidently.
