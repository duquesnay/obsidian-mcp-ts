# LLM-Ergonomic Patch Content Migration Guide

## Overview

This guide explains the new LLM-ergonomic approach to content patching in Obsidian MCP. The new design prioritizes explicit, deterministic operations that LLMs can use reliably.

## Key Principles for LLM Ergonomics

1. **Explicit over Implicit** - Every parameter has clear meaning
2. **Deterministic References** - No ambiguous targeting
3. **Structured Errors** - Programmatically handleable failures
4. **Query-First Workflow** - Inspect before modifying

## New Tools

### 1. `obsidian_query_structure`

Query document structure before making modifications:

```typescript
// Query all headings
await obsidian_query_structure({
  filepath: "document.md",
  query: {
    type: "headings",
    filter: {
      text: "Overview",  // Find all Overview headings
      min_level: 2      // Only h2 and below
    }
  }
});

// Returns structured data with paths and occurrence numbers
{
  headings: [
    { text: "Overview", path: [], line: 10 },
    { text: "Overview", path: ["Implementation"], line: 45, occurrence: 1 },
    { text: "Overview", path: ["Implementation"], line: 67, occurrence: 2 }
  ]
}
```

### 2. `obsidian_patch_content_v2`

Explicit, structured content modifications:

```typescript
// Replace operation
await obsidian_patch_content_v2({
  filepath: "doc.md",
  operation: {
    type: "replace",
    replace: {
      pattern: "TODO",
      replacement: "DONE",
      options: {
        scope: {
          type: "section",
          section_path: ["Action Items"]
        }
      }
    }
  }
});

// Insert with unambiguous heading path
await obsidian_patch_content_v2({
  filepath: "doc.md",
  operation: {
    type: "insert",
    insert: {
      content: "New section content",
      location: {
        type: "heading",
        heading: {
          path: ["Implementation", "Overview"],
          occurrence: 2  // Second Overview under Implementation
        },
        position: "after"
      }
    }
  }
});
```

## Migration Examples

### Example 1: Simple Text Replace

#### Old Way (Confusing)
```typescript
await obsidian_patch_content({
  filepath: "notes.md",
  oldText: "TODO",
  newText: "DONE",
  targetType: "heading",  // Why needed?
  target: "Tasks"         // Unclear purpose
});
```

#### New Way (Clear)
```typescript
await obsidian_patch_content_v2({
  filepath: "notes.md",
  operation: {
    type: "replace",
    replace: {
      pattern: "TODO",
      replacement: "DONE"
      // No scope = document-wide
    }
  }
});
```

### Example 2: Insert After Heading

#### Old Way (Ambiguous)
```typescript
await obsidian_patch_content({
  filepath: "doc.md",
  content: "New content",
  targetType: "heading",
  target: "Overview",     // Which Overview?
  heading: "Overview",    // Redundant?
  insertAfter: true
});
```

#### New Way (Deterministic)
```typescript
// Step 1: Query structure
const structure = await obsidian_query_structure({
  filepath: "doc.md",
  query: { type: "headings", filter: { text: "Overview" } }
});

// Step 2: Build precise operation
await obsidian_patch_content_v2({
  filepath: "doc.md",
  operation: {
    type: "insert",
    insert: {
      content: "New content",
      location: {
        type: "heading",
        heading: {
          path: ["Implementation", "Overview"],
          occurrence: 1
        },
        position: "after"
      }
    }
  }
});
```

### Example 3: Frontmatter Updates

#### Old Way
```typescript
await obsidian_patch_content({
  filepath: "note.md",
  content: "reviewed",
  targetType: "frontmatter",
  target: "status"
});
```

#### New Way (Structured)
```typescript
await obsidian_patch_content_v2({
  filepath: "note.md",
  operation: {
    type: "update_frontmatter",
    update_frontmatter: {
      changes: {
        set: { status: "reviewed" },
        append: { tags: ["reviewed"] }
      }
    }
  }
});
```

## LLM Workflow Pattern

```typescript
// 1. Query structure when dealing with headings
const structure = await obsidian_query_structure({
  filepath: "doc.md",
  query: { type: "headings" }
});

// 2. Analyze structure to build precise references
const targetHeading = structure.headings.find(h => 
  h.text === "Budget" && h.path.includes("Planning")
);

// 3. Execute operation with deterministic reference
await obsidian_patch_content_v2({
  filepath: "doc.md",
  operation: {
    type: "insert",
    insert: {
      content: "Budget notes...",
      location: {
        type: "heading",
        heading: {
          path: targetHeading.path,
          line_hint: targetHeading.line
        },
        position: "after"
      }
    }
  }
});

// 4. Handle errors programmatically
if (result.error?.code === "AMBIGUOUS_HEADING_PATH") {
  // Use suggestions to retry with occurrence number
  const retry = {
    heading: {
      path: result.error.suggestions[0].path,
      occurrence: 1
    }
  };
}
```

## Benefits for LLMs

1. **No Parameter Guessing** - Clear structure shows what goes together
2. **Predictable Outcomes** - Explicit options mean deterministic results
3. **Better Error Recovery** - Structured errors with actionable suggestions
4. **Validation-Friendly** - Schema can express all constraints

## Backward Compatibility

The original `obsidian_patch_content` remains available but should be considered deprecated. New implementations should use:
- `obsidian_query_structure` - To inspect document structure
- `obsidian_patch_content_v2` - For modifications

## Summary

The new approach embraces LLM strengths:
- Complex nested structures are fine (LLMs handle them well)
- Explicit parameters prevent ambiguity
- Deterministic targeting via paths and occurrence numbers
- Query-first workflow for building accurate references

This design makes content patching reliable and predictable for LLM consumers.