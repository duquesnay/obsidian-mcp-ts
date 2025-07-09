# LLM Ergonomics Analysis: `patch_content_v2`

## How to enrich this document
- use new sections mentioning the time of the new analysis like
  "LLM Ergonomics Analysis 2023-02-01 10:12"


## LLM Ergonomics Analysis 2025-07-08 10:12

### Executive Summary

The `patch_content_v2` tool aims to provide powerful content modification capabilities but suffers from significant LLM ergonomics issues. The primary problem is that the interface optimizes for flexibility and completeness at the expense of simplicity and discoverability. This creates a steep learning curve that frustrates LLMs attempting basic operations.

### Current Design Problems

#### 1. Complex Nested Schema for Simple Operations

**Problem**: The tool requires deeply nested objects even for trivial tasks.

```javascript
// Current: Appending text requires understanding complex structure
{
  operation: {
    type: "insert",
    insert: {
      content: "Hello world",
      location: {
        type: "document",
        document: { position: "end" },
        position: "after"  // Redundant with document.position
      }
    }
  }
}

// Compare to append_content's simplicity:
{
  content: "Hello world"
}
```

**Impact**: LLMs default to simpler tools like `append_content` because the cognitive load is lower.

#### 2. Misleading Error Messages

**Problem**: The validation error about content format is confusing:
- Shows union validation attempts for `text`, `image`, `audio`, `resource` types
- Expects `content[0].type` but the schema shows `content` as a string
- No example of correct format provided

**Root Cause**: There's a mismatch between the TypeScript interface (content: string) and what the actual API expects. This suggests either:
1. The implementation is incorrectly handling the content field
2. The schema definition doesn't match the runtime behavior

#### 3. Redundant Position Specifications

**Problem**: Multiple ways to specify position create confusion:
```javascript
location: {
  type: "document",
  document: { position: "end" },    // Position here
  position: "after"                 // And also here?
}
```

**Impact**: LLMs must guess which position field takes precedence, leading to trial-and-error.

#### 4. Operation Type Abstraction Without Benefit

**Problem**: The `operation.type` pattern adds a layer of indirection without clear benefits:
```javascript
operation: {
  type: "insert",
  insert: { ... }  // Redundant - we already know it's insert
}
```

This pattern makes sense when operations share common fields, but here each operation type has completely different structures.

#### 5. Missing Progressive Disclosure

**Problem**: No shortcuts for common operations. Every use requires understanding the full schema.

**Example**: To append text to a document:
- Must specify operation type
- Must specify insert object
- Must specify location type
- Must specify document position
- Must specify position relative to location

That's 5 levels of nesting for what should be a one-liner.

### Specific Pain Points for LLMs

#### 1. Schema Discovery Friction

LLMs learn tool usage through:
1. Reading descriptions
2. Trying simple cases
3. Learning from errors

The current tool fails at steps 2 and 3:
- Simple cases require complex schemas
- Errors don't guide toward correct usage

#### 2. Conceptual Overhead

The tool introduces concepts that don't map to user intent:
- Users think: "Add this text to the end"
- Tool requires: "Create an insert operation with a document location targeting the end position"

#### 3. Validation Boundary Confusion

The error message suggests the API expects a different content format than the TypeScript types indicate. This creates uncertainty about whether to trust:
- The type definitions
- The error messages
- The documentation

### Concrete Improvement Suggestions

#### 1. Smart Defaults with Progressive Enhancement

```typescript
// Level 1: Simple string operations (90% of use cases)
{
  filepath: "notes.md",
  operation: "append",
  content: "New content"
}

// Level 2: Positioned operations
{
  filepath: "notes.md", 
  operation: "insert_after_heading",
  heading: "Introduction",
  content: "New content"
}

// Level 3: Full control (current complexity)
{
  filepath: "notes.md",
  operation: {
    type: "insert",
    insert: {
      content: "New content",
      location: {
        type: "heading",
        heading: { path: ["Chapter", "Introduction"], occurrence: 2 },
        position: "after"
      }
    }
  }
}
```

#### 2. Operation-Specific Tools

Instead of one complex tool, consider multiple focused tools:
- `patch_content_simple` - String-based operations
- `patch_content_structured` - Advanced operations
- `patch_content_bulk` - Multiple operations

#### 3. Fix Content Format Handling

```typescript
// If content should be a string (as types suggest):
content: "My text content"

// If content needs structure (as error suggests):
content: [{type: "text", text: "My text content"}]

// Better: Accept both with smart conversion
content: string | ContentBlock[]
```

#### 4. Flatten Common Operations

```typescript
interface SimplifiedPatchContent {
  filepath: string;
  
  // Direct operation specification
  append?: string;
  prepend?: string;
  replace?: { find: string; with: string };
  insertAfter?: { heading: string; content: string };
  insertBefore?: { heading: string; content: string };
  
  // Advanced mode fallback
  advanced?: CurrentComplexOperation;
}
```

#### 5. Better Error Messages

```typescript
// Current error: Complex union validation output

// Improved error:
{
  error: "Invalid content format",
  message: "For simple text insertion, use: content: 'your text'",
  example: {
    operation: {
      type: "insert",
      insert: {
        content: "Your text here",
        location: { type: "document", document: { position: "end" }, position: "after" }
      }
    }
  },
  hint: "Tip: Use 'append_content' tool for simple appending"
}
```

### Implementation Patterns for Better Ergonomics

#### 1. Adaptive Interface Pattern

```typescript
class PatchContentV3 {
  async execute(args: SimplePatchArgs | AdvancedPatchArgs) {
    // Detect simple vs advanced based on present fields
    if (this.isSimpleOperation(args)) {
      return this.handleSimple(args as SimplePatchArgs);
    }
    return this.handleAdvanced(args as AdvancedPatchArgs);
  }
}
```

#### 2. Builder Pattern for Complex Operations

```typescript
// Allow LLMs to build operations incrementally
const operation = new PatchBuilder()
  .file("notes.md")
  .findHeading("Introduction")
  .insertAfter("New content")
  .build();
```

#### 3. Operation Templates

```typescript
// Provide common operation templates
const OPERATION_TEMPLATES = {
  appendText: (content: string) => ({
    type: "insert",
    insert: {
      content,
      location: { type: "document", document: { position: "end" }, position: "after" }
    }
  }),
  
  replaceInSection: (section: string, find: string, replace: string) => ({
    type: "replace",
    replace: {
      pattern: find,
      replacement: replace,
      options: { scope: { type: "section", section_path: [section] } }
    }
  })
};
```

### Lessons for LLM-Friendly Tool Design

#### 1. Start Simple, Allow Complexity
- Make the 80% use case trivial
- Hide complexity behind progressive disclosure
- Provide escape hatches for power users

#### 2. Errors as Teaching Moments
- Show what was expected
- Provide working examples
- Suggest simpler alternatives

#### 3. Conceptual Alignment
- Match user mental models
- Use terminology from the domain
- Avoid unnecessary abstraction

#### 4. Validation at the Right Level
- Client-side validation should match server expectations
- Type systems should reflect runtime behavior
- Provide clear migration paths

#### 5. Test with Real LLM Interactions
- Simulate how LLMs discover functionality
- Test error recovery paths
- Measure time-to-successful-operation

### Conclusion

The `patch_content_v2` tool represents a common pattern in API design where power and flexibility come at the cost of usability. For LLM-facing tools, the priority should be:

1. **Immediate success** with simple operations
2. **Clear error guidance** when things go wrong  
3. **Progressive complexity** only when needed
4. **Conceptual clarity** over architectural purity

The current implementation can be salvaged by:
1. Adding a simplified parameter mode
2. Fixing the content format confusion
3. Providing better error messages with examples
4. Creating operation shortcuts for common tasks

Most importantly, the tool should be tested with actual LLM users (like Claude) to ensure the interface matches how LLMs naturally attempt to use it.
