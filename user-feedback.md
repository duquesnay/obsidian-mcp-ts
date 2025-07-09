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

