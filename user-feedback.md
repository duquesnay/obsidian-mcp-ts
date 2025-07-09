# User Experience Report: `patch_content_v2`

## How to log experience report
- create new section at the end of this file with teimstamp
   "## User Report 2025-02-01 07:32"

## User Report 2025-07-08 10:10

### What I Tried
I attempted to insert content at the end of a document:
```javascript
mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2(
  filepath: "Productivity/Notes Reorganisation Project/Phase-5A-Empty-Files-Cleanup-Report.md",
  operation: {
    type: "insert", 
    insert: {
      content: "## ⚠️ CRITICAL ERROR...", 
      location: {type: "document", position: "end"}
    }
  }
)
```

### The Error
Got a complex validation error about `invalid_union` with multiple schema options expecting different content formats (text, image, audio, resource) with specific type fields.

### Pain Points

1. **Unclear content format**: The error shows I need `content[0].type` but it's not clear that content should be an array of objects with type fields

2. **No examples in error**: The error shows what's wrong but not what's right. An example of valid format would help

3. **Complex for simple tasks**: Just appending text required understanding a complex schema vs `append_content` which just works

4. **Union errors are confusing**: Multiple validation attempts shown in the error make it hard to understand which format to use

### Suggestions for Improvement

1. **Add examples to error messages**:
   ```
   Error: Invalid content format. Expected:
   content: [{type: "text", text: "your text here"}]
   ```

2. **Simpler shortcuts for common operations**:
   - For plain text operations, accept a string directly
   - Auto-wrap in the required format internally

3. **Better parameter documentation**:
   - Show examples for each operation type
   - Clarify when content needs to be an array vs single object

4. **Progressive disclosure**:
   - Simple mode for basic text operations
   - Advanced mode for mixed content types

5. **Type hints in tool description**:
   - Current description doesn't mention the content array structure
   - Should show example operations upfront

### What Would Make It LLM-Friendly

1. **Flat parameters for simple cases**: 
   ```javascript
   operation: "append_text",
   text: "content to append"
   ```

2. **Smart defaults**: If I'm inserting plain text, assume `[{type: "text", text: content}]`

3. **Clear operation names**: Instead of nested objects, maybe `operation_type` and `operation_params`

4. **Validation feedback**: "Did you mean to wrap your content in [{type: 'text', text: '...'}]?"

The tool seems powerful for complex operations, but the learning curve for simple tasks is steep compared to existing tools. Making common operations simpler while keeping advanced capabilities would improve adoption.

## User Report 2025-01-09 14:30

### Tools Used for Content Manipulation

I attempted to use the following tools for appending content and inserting after headings:
- `obsidian_append_content` - For simple appending to end of file
- `obsidian_patch_content` - For inserting content after headings (deprecated)
- `obsidian_patch_content_v2` - For more complex content operations
- `obsidian_patch_content_v3` - The simplified version with shortcuts

### What Was Intuitive

1. **append_content** - Very straightforward, just filepath and content
2. **patch_content_v3 shortcuts** - The simple operations like `{ append: "text" }` and `{ insertAfterHeading: { heading: "Title", content: "text" } }` were much easier to understand
3. The deprecation notice on patch_content clearly directing to v2

### What Was Confusing

1. **patch_content_v2** - The nested structure with operation types and location objects was overwhelming:
   - Had to specify `operation.type`, then nested `insert.location.type`, then further nested location details
   - The distinction between `location.position` and `location.document.position` was unclear
   - Too many options made it hard to know what was required vs optional

2. **patch_content (deprecated)** - Required targetType and target parameters that weren't immediately obvious

3. **Finding the right tool** - With patch_content, patch_content_v2, and patch_content_v3 all available, it wasn't clear which to use

### Tool Usage Pattern

I primarily fell back to simpler tools:
- Used `append_content` when I just needed to add to the end of a file
- Attempted patch_content_v2 but found the syntax too complex for simple operations
- Would have preferred patch_content_v3 if I had discovered it earlier, as its shortcuts match common use cases

### Recommendations

1. Consider hiding deprecated tools from the tool list to reduce confusion
2. The patch_content_v3 shortcuts are excellent - make these more prominent in the tool description
3. Add more examples in the tool descriptions showing common use cases
4. Consider making patch_content_v3 the primary tool and deprecating v2 for LLM usage

## User Report 2025-01-09 15:55

### Test Results from Claude Subprocess

The Claude subprocess attempting to use patch_content_v2 with the improved ergonomic shortcuts encountered the following issues:

1. **Validation Errors**: Despite the tool now having simple shortcuts like `{ append: "text" }` and `{ insertAfterHeading: { heading: "Title", content: "text" } }`, the subprocess still encountered validation errors when trying to use patch_content_v2.

2. **Tool Confusion**: The subprocess mentioned that "some MCP tools required permissions that weren't granted", suggesting permission configuration issues prevented proper testing.

3. **Fallback Pattern**: The subprocess ultimately used workarounds:
   - Used the Task tool for complex content modifications
   - Used `obsidian_append_content` for reliable file operations
   - Delegated complex operations when direct MCP tools failed

### Key Observation

Even with the ergonomic improvements (simple shortcuts merged from v3), the patch_content_v2 tool still failed to be adopted by the LLM. The subprocess preferred to fall back to simpler tools or delegate to the Task tool rather than use patch_content_v2.

### Possible Issues

1. **Build/Deployment**: The improvements might not be visible to the subprocess if the build wasn't properly deployed
2. **Permission Configuration**: The `--allowedTools` flag might need more specific configuration
3. **Tool Discovery**: The subprocess might not be seeing the updated tool description with the new shortcuts

### Next Steps

Need to verify that:
1. The improved patch_content_v2 is actually deployed and accessible
2. Permission configuration is correct for MCP tool usage
3. The tool description clearly shows the simple shortcuts in the tool listing

## User Report 2025-07-09 16:38

### Task Completion Experience

I was asked to complete three tasks on Obsidian notes:
1. Insert content after a heading in technical-spec.md
2. Replace text and add a section in project-overview.md
3. Report on the experience

### What Happened

1. **Initial Creation**: Used `obsidian_append_content` to create the initial test files - this worked perfectly
2. **patch_content_v2 Attempts**: Tried multiple approaches with patch_content_v2 but encountered complex validation errors:
   - `insertAfterHeading` syntax resulted in invalid_union errors
   - `replace` method also failed with schema validation issues
   - Complex error messages about content needing to be arrays with type fields
3. **Permission Issues**: Several tools required permissions that weren't granted (patch_content, delete_file)
4. **Successful Workaround**: Created new clean files with the required modifications using `append_content`

### What Worked Well

- `obsidian_append_content` - Simple, reliable, no confusion
- Task completion was possible through workarounds
- Error messages were detailed (though complex)

### What Was Problematic

1. **patch_content_v2 Ergonomics**: Despite supposed improvements, the tool still failed with complex validation errors
2. **Permission Management**: Multiple tools required permissions that weren't pre-granted
3. **Tool Selection Confusion**: Had to try multiple approaches to find what worked

### User Behavior

When faced with the complex patch_content_v2 errors, I naturally fell back to simpler tools that I knew would work. This suggests that even with ergonomic improvements, if the tool fails on first try, users will abandon it for reliable alternatives.

### Recommendations

1. **Fix the validation errors**: The simple shortcuts in patch_content_v2 should actually work
2. **Better permission management**: Pre-grant common permissions or provide clearer error messages
3. **Prioritize reliability**: A simple tool that works is better than a powerful tool that errors out