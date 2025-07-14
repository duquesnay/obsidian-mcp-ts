# Iterative LLM Ergonomics Improvement Cycle

## Goal

Improve tools for editing structured content in Obsidian markdown notes based on real LLM user feedback.

## Resources

- User feedback: user-feedback.md
- Implementation logs: implementation-log.md
- Analysis: llm-ergonomics-analysis.md
- Obsidian tracking: Append summaries to (obsidian note) /Coding/AI/Obsidian MCP Ergo refinement log

## Cycle Process

Execute these steps in order:

### Step 1: Solution Effectiveness Check

Execute using the Task tool:
- description: "Assess LLM editing experience"
- prompt: @../../docs/step1-prompt.txt

**Decision:**
- If EFFECTIVE → Go to Step 5 (Refinement)
- If NEEDS_IMPROVEMENT → Proceed to Step 2

### Step 2: Solution Exploration (20-25 min)

Execute using the Task tool:
- description: "Explore ergonomic solutions"
- prompt: @../../docs/step2-prompt.txt

**After completion:** Commit the analysis:
```bash
git add llm-ergonomics-analysis.md
git commit -m "ergo: add solution exploration from cycle"
```

### Step 3: Solution Implementation (20-25 min)

Execute using the Task tool:
- description: "Implement ergonomic improvements"
- prompt: @../../docs/step3-prompt.txt

**Critical validation before proceeding:**
1. Check implementation was documented
2. Verify build succeeds: `npm run build`
3. If validation passes, commit only the implementation and its documentation

### Step 4: Real User Testing (5 min subprocess)

Analyze the implementation to determine which MCP tools are available, then execute as subprocess for isolation:
```bash
claude --model sonnet --permission-mode acceptEdits --allowedTools "[BUILD_TOOL_LIST]" --print @../../docs/step4-prompt.txt
```
Include standard tools (Bash, Write, Edit) plus any MCP tools from the implementation.

**After completion:** Commit the feedback:
```bash
git add user-feedback.md
git commit -m "ergo: add user test feedback from cycle"
```

**Return to Step 1 for next iteration.**

### Step 5: Solution Refinement

Execute using the Task tool:
- description: "Refine successful implementation"
- prompt: @../../docs/step5-prompt.txt

**After completion:** Commit refinements and return to Step 1.

## Cycle Tracking

At the end of each cycle, append a summary to Obsidian Note at /Coding/AI/Obsidian MCP Ergo refinement log with:
- Cycle number and timestamp
- Path taken (1→5 or 1→2→3→4→1)
- Key findings and changes
- Current success metrics

## Termination Criteria

Continue until 3 consecutive iterations show:
- LLMs successfully complete complex editing tasks
- Task completion feels natural and intuitive
- First-attempt success rate >70%
- Successful error recovery within 2 attempts

## Success Metrics

- **Primary**: LLMs effectively solve its editing needs with available tools
- **Critical**: Solutions feel natural and match LLM reasoning patterns
- **Performance**: First-attempt success rate >70%
- **Sustainability**: Tools chosen confidently without workarounds
