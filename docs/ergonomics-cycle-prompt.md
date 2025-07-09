# Iterative LLM Ergonomics Improvement Cycle

## Process Overview

Continuous improvement cycle for patch_content_v2 using real LLM feedback from separate Claude processes.

## Execution Model

This process uses a hybrid approach:

- **Steps 1, 2, 3, and 5**: Use the Task tool to spawn a subagent, passing the step's "Subtask Prompt" section as the prompt
- **Step 4**: Execute as a subprocess using `claude --permission-mode acceptEdits` (as specified in that step)

The orchestrator (you) should:
1. For Steps 1,2,3,5: Use Task tool with the subtask prompt
2. For Step 4: Use Bash tool to run the claude subprocess command
3. Wait for each step to complete before proceeding to the next
4. Continue the cycle until termination criteria are met

## CRITICAL: Step 4 Requirements

- **MUST** use `claude` bash command to spawn a fresh process
- **MUST** include `--allowedTools` flag with required MCP tool permissions
- **MUST NOT** simulate or guide the Claude process
- Each `claude` command creates a new instance with no prior knowledge
- **MUST** ensure `npm run build` completes successfully before testing

  ---

CRITICAL: Each step is a sub agent and must be completed in order.

## Step 1: Quick Decision Check (Sonnet 4)

**Simple Decision Task:**
Read the latest entry in local project file ./user-feedback.md.
Did the LLM successfully use patch_content_v2 for operations that require its capabilities (complex insertions,
structured operations, multi-step edits)?

Note: Using append_content for simple appends is acceptable and expected.

- YES (LLM used patch_content_v2 for complex operations) → Go to Step 5
- NO (LLM avoided patch_content_v2 for operations it should handle) → Proceed to Step 2, 3, 4, come back to Step 1

  ---

## Step 2: Ergonomics Analysis (Opus 4 Deep Thinking)

**Subtask Prompt:**
You are an LLM ergonomics specialist. Read ONLY the latest user feedback entry from local project file ./user-feedback.md

Focus on the most recent "## User Report YYYY-MM-DD HH:MM" section.

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

Provide improvements either ergonomical or technical that would have led to successful patch_content_v2 adoption for complex
operations.

**CRITICAL: Document your analysis by enriching the local project file ./worktrees/llm-ergonomic-patch/llm-ergonomics-analysis.md. Add a new section with the CURRENT timestamp in format "## LLM Ergonomics Analysis 2025-01-09 14:30" (use actual current date/time) with your findings and improvement recommendations.**

  ---

## Step 3: Implementation (Sonnet 4)

**Subtask Prompt:**
Based on the ergonomics analysis, implement improvements to patch_content_v2, use sub agents at each phase 

Target file:
- Source file ./src/tools/PatchContentToolV2.ts
- Constants and types associated with it

Focus on the specific friction points identified in the analysis.
Let the ergonomic analysis guide your changes - don't over-engineer.

CRITICAL: After implementation, run:
npm run build

Verify the build succeeds before proceeding. If build fails, fix errors and rebuild.
The Claude process in Step 4 will only see changes after successful build.

  ---

## Step 4: Real Claude User Testing (Sonnet 4)

**Execute this step as a subprocess using:**
```bash
claude --permission-mode acceptEdits --print "Run Step 4 user testing as described below"
```

**Subtask Prompt:**
Create test files and run a single Claude session to test patch_content_v2:

1. First, create test files:
```bash
mkdir -p ~/ObsidianNotes/test-docs
cat > ~/ObsidianNotes/test-docs/technical-spec.md << 'EOF'
# Architecture

This section describes the system architecture.

## Overview

The system consists of multiple components.

## Implementation

TBD
EOF

cat > ~/ObsidianNotes/test-docs/project-overview.md << 'EOF'
# Project Overview

This project implements document management.

## Features

- Feature 1
- Feature 2

## Status

In development
EOF
```

2. Run a single test session:
```bash
claude --permission-mode acceptEdits --print "Please complete these tasks on my Obsidian notes:
1. In test-docs/technical-spec.md, insert '### Database Layer\nUses PostgreSQL with connection pooling.\n\n### API Layer\nREST API with rate limiting.' after the ## Implementation heading
2. In test-docs/project-overview.md, replace 'Feature 1' with 'Advanced Analytics' and add a new section '## Conclusion\nProject shows promising results.' after the Status section
3. After completing these tasks, report your experience completing these tasks and append to user-feedback.md with a section titled '## User Report' followed by the CURRENT timestamp (e.g., '## User Report 2025-01-09 14:30')"
```

3. Verify user-feedback.md was updated with the test experience.

**Return to Step 1 for next iteration.**

## Step 5: Code Review and Quality (Sonnet 4)

Subtask Prompt:
Review the current patch_content_v2 implementation focusing on:

1. **Tool Positioning**: Does the tool description clearly indicate when to use it vs simpler alternatives?

2. **Complex Operation Ergonomics**: For multi-step or structured operations, is the interface intuitive?

3. **Error Guidance**: Do errors help LLMs succeed on retry?

4. **Discoverability**: Can LLMs easily understand when this tool is the right choice?

Examine:

- Tool description and examples
- Error message quality
- Parameter validation
- Code maintainability

Suggest specific refinements focused on complex operation scenarios.

After improvements, return to Step 1 for next iteration.

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
