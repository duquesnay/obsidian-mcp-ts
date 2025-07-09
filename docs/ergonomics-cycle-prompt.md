# Iterative LLM Ergonomics Improvement Cycle

## Process Overview

Continuous improvement cycle for patch_content_v2 using real LLM feedback from separate Claude processes.

## Execution Model

All steps run as subprocesses for full visibility:

The orchestrator (you) should:
1. Execute each step using the Bash tool to run the claude subprocess command
2. Use `--verbose` flag to see detailed execution logs
3. Wait for each step to complete before proceeding to the next
4. Continue the cycle until termination criteria are met
5. At the end of each cycle (after Step 4 or Step 5), append a summary log to Obsidian at "/Coding/AI/Obsidian MCP Ergo refinement log" with:
   - Cycle number and timestamp
   - Which path was taken (1→5 or 1→2→3→4→1)
   - Key findings and changes made
   - Current success metrics

## CRITICAL: Step 4 Requirements

- **MUST** use `claude` bash command to spawn a fresh process
- **MUST** include `--allowedTools` flag with required MCP tool permissions
- **MUST NOT** simulate or guide the Claude process
- Each `claude` command creates a new instance with no prior knowledge
- **MUST** ensure `npm run build` completes successfully before testing

  ---

CRITICAL: Each step is a sub agent and must be completed in order.

## Step 1: Quick Decision Check (Sonnet 4)

**Execute:**
```bash
claude --model sonnet --permission-mode acceptEdits --verbose --print << 'EOF'
Read the latest entry in local project file ./user-feedback.md. 

Did the LLM successfully use patch_content_v2 for operations that require its capabilities (complex insertions, structured operations, multi-step edits)? 

Note: Using append_content for simple appends is acceptable and expected. 

Answer with: YES (LLM used patch_content_v2 for complex operations) or NO (LLM avoided patch_content_v2 for operations it should handle)
EOF
```

- If YES → Go to Step 5
- If NO → Proceed to Step 2, 3, 4, then return to Step 1

  ---

## Step 2: Ergonomics Analysis (Opus 4 Deep Thinking)

**Execute:**
```bash
claude --model opus --permission-mode acceptEdits --verbose --print << 'EOF'
You are an LLM ergonomics specialist. Read ONLY the latest user feedback entry from local project file ./user-feedback.md. 

Focus on the most recent '## User Report YYYY-MM-DD HH:MM' section.

Analyze the LLM's experience with patch_content_v2:
1. What complex operations did the LLM attempt?
2. For which operations did they avoid patch_content_v2 when they should have used it?
3. What specific friction points prevented successful use?
4. What mental model did they have vs. what the tool required?

Consider:
- Schema complexity vs task complexity
- Error message effectiveness
- Parameter discovery friction
- Tool selection reasoning

Provide improvements either ergonomical or technical that would have led to successful patch_content_v2 adoption for complex operations.

CRITICAL: Document your analysis by enriching the local project file ./worktrees/llm-ergonomic-patch/llm-ergonomics-analysis.md. Add a new section with the CURRENT timestamp (use the actual current date and time when you write this, not the example). Format: '## LLM Ergonomics Analysis YYYY-MM-DD HH:MM' with your findings and improvement recommendations.
EOF
```

  ---

## Step 3: Implementation (Sonnet 4)

**Execute:**
```bash
claude --model sonnet --permission-mode acceptEdits --verbose --print << 'EOF'
Based on the ergonomics analysis in ./worktrees/llm-ergonomic-patch/llm-ergonomics-analysis.md, implement improvements to patch_content_v2.

Target files:
- ./src/tools/PatchContentToolV2.ts
- Any constants/types associated with it

Focus on the specific friction points identified in the latest analysis entry.
Let the ergonomic analysis guide your changes - don't over-engineer.

CRITICAL: After implementation, run 'npm run build' and verify the build succeeds. If build fails, fix errors and rebuild. The Claude process in Step 4 will only see changes after successful build.
EOF
```

  ---

## Step 4: Real Claude User Testing (Sonnet 4)

**Execute:**
```bash
claude --model sonnet --permission-mode acceptEdits --allowedTools "Write,Edit,mcp__obsidian-ts-0_5-alpha__obsidian_append_content,mcp__obsidian-ts-0_5-alpha__obsidian_patch_content_v2,mcp__obsidian-ts-0_5-alpha__obsidian_get_file_contents" --verbose --print << 'EOF'
First, create test files by running:

mkdir -p ~/ObsidianNotes/test-docs

echo '# Architecture

This section describes the system architecture.

## Overview

The system consists of multiple components.

## Implementation

TBD' > ~/ObsidianNotes/test-docs/technical-spec.md

echo '# Project Overview

This project implements document management.

## Features

- Feature 1
- Feature 2

## Status

In development' > ~/ObsidianNotes/test-docs/project-overview.md

Then complete these tasks on the Obsidian notes:

1. In test-docs/technical-spec.md, insert the following after the ## Implementation heading:
   ### Database Layer
   Uses PostgreSQL with connection pooling.
   
   ### API Layer
   REST API with rate limiting.

2. In test-docs/project-overview.md:
   - Replace 'Feature 1' with 'Advanced Analytics'
   - Add a new section after the Status section:
     ## Conclusion
     Project shows promising results.

3. After completing these tasks, report your experience completing these tasks and append to the LOCAL PROJECT FILE ./user-feedback.md (NOT in Obsidian, but in the current working directory) with a section titled '## User Report' followed by the ACTUAL CURRENT timestamp (do not use '2025-01-09 14:30' - that's just an example format). Use the Write or Edit tool, not Obsidian tools.
EOF
```

**Return to Step 1 for next iteration.**

## Step 5: Code Review and Quality (Sonnet 4)

**Execute:**
```bash
claude --model sonnet --permission-mode acceptEdits --verbose --print << 'EOF'
Review the current patch_content_v2 implementation in ./src/tools/PatchContentToolV2.ts focusing on:

1. Tool Positioning: Does the tool description clearly indicate when to use it vs simpler alternatives?

2. Complex Operation Ergonomics: For multi-step or structured operations, is the interface intuitive?

3. Error Guidance: Do errors help LLMs succeed on retry?

4. Discoverability: Can LLMs easily understand when this tool is the right choice?

Examine:
- Tool description and examples
- Error message quality
- Parameter validation
- Code maintainability

Suggest specific refinements focused on complex operation scenarios and document them in ./worktrees/llm-ergonomic-patch/llm-ergonomics-analysis.md.
EOF
```

**After improvements, return to Step 1 for next iteration.**

  ---
## Termination Criteria:

Continue cycle until 3 consecutive iterations show:

- LLMs naturally choose patch_content_v2 for content editing tasks
- No fallback to append_content after patch_content_v2 failures
- First-attempt success rate >70%
- Successful error recovery within 2 attempts

Success Metrics:

- Primary: LLMs intuitively use patch_content_v2 for intended editing operations
- Critical: No fallback patterns to append_content after patch_content_v2 failures
- Performance: First-attempt success rate >70% (indicates intuitive interface)

Documentation Requirements:

- Update local project file ./user-feedback.md with each Claude test cycle
- Document design decisions in local project file ./llm-ergonomics-analysis.md
- Track tool selection patterns across iterations
