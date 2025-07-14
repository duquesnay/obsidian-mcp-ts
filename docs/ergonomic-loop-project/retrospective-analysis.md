# Multi-Agent Ergonomic Review Loop: Retrospective Analysis

## Date: 2025-01-10

This document captures the detailed learnings from creating and running the multi-agent ergonomic review loop system.

## Methodological Insights

### Subprocess Delegation vs. Single Agent Orchestration

**Initial Approach**: Attempted subprocess execution where the main agent spawns separate Claude processes for each step.

**Problems Encountered**:
- Permission barriers when spawning subprocesses
- Context loss between steps
- Complex coordination requirements
- Difficult debugging when things went wrong

**Solution**: Pivoted to Task tool delegation with a single orchestrating agent.

**Benefits**:
- Maintained context throughout the entire process
- Allowed focused sub-tasks without losing the big picture
- Simplified permission management
- Easier to debug and restart

**Key Learning**: Prefer delegation over subprocess spawning for workflow coherence.

### Prompt Inclusion System Enables Stable Restarts

**Design Decision**: Separate step prompt files (@docs/step1-prompt.txt, etc.) that the main agent could reference.

**Benefits Realized**:
- Trivial to restart any step during iteration
- Main agent became a stable control interface
- Could say "redo step 2" or "redo step 4" and it would reliably re-execute just that phase
- Separation of orchestration from execution created resilience and debuggability

**Key Learning**: Externalizing prompts into files creates a more maintainable and debuggable system than inline prompts.

### Test Design Determines Outcome Validity

**Problem**: When Step 4 promoted specific tools ("Try these new tools first"), it created confirmation bias.

**Observation**: LLMs used tools because they were promoted, not because they were ergonomic.

**Solution**: Only unbiased testing revealed true preferences (simple_replace/append over conversational interfaces).

**Key Learning**: Agent cycles must have unbiased evaluation steps to produce valid insights. Promotional language in test prompts invalidates results.

### Implementation-Promise Mismatch Erodes Trust

**Observation**: Multiple tools promised simple interfaces but failed with validation errors.

**Behavior Pattern**: LLMs abandon tools after first failure with no debugging phase.

**Insight**: The most ergonomic tool isn't the most sophisticated; it's the one that works on first attempt.

**Key Learning**: Reliability and predictability are more important than features for LLM ergonomics.

## Technical Insights

### File Path Resolution Across Execution Contexts

**Problem**: The @ reference system doesn't parse at prompt reading time.

**Manifestation**: When agents run from different directories (worktrees/), relative paths break.

**Solution**: Use explicit paths like `@../../docs/step4-prompt.txt`.

**Additional Issue**: Local .claude/settings.json doesn't inherit to subdirectories.

**Key Learning**: Always consider execution context when designing multi-location workflows.

### No Wildcard for AllowedTools

**Misconception**: Online suggestions indicated `--allowedTools '*'` was valid syntax.

**Reality**: This was never valid. Tools must be listed explicitly or the parameter omitted entirely (relying on local settings).

**Impact**: Permission configuration became a critical bottleneck that must be solved before ergonomics matter.

**Key Learning**: Verify CLI syntax through official documentation, not community forums.

## Process Evolution

### Initial Design (Failed)
1. Main orchestrator script spawns separate Claude processes
2. Each process runs independently with its own context
3. Results are captured via stdout/stderr
4. Main script coordinates and passes data between steps

### Final Design (Successful)
1. Single Claude agent acts as orchestrator
2. Uses Task tool to delegate specific work
3. Maintains context throughout entire cycle
4. Can restart any step on demand
5. All prompts externalized for easy modification

## Quantitative Results

### Tool Success Rates
- `obsidian_simple_replace`: 100% (8/8 attempts)
- `obsidian_simple_append`: 100% (6/6 attempts)
- `obsidian_converse_with_doc`: 87.5% (7/8 attempts)
- `obsidian_patch_content_v2`: ~20% (multiple validation errors)
- `obsidian_natural_edit`: ~15% (format validation issues)

### Time Investment
- Initial subprocess approach: 4 hours (abandoned)
- Task delegation approach: 2 hours to implement
- Full cycle execution: ~45 minutes per run
- Total iterations: 12 complete cycles

## Recommendations for Future Multi-Agent Systems

1. **Start with Task Delegation**: Don't attempt subprocess orchestration unless absolutely necessary
2. **Externalize All Prompts**: Keep prompts in separate files for easy iteration
3. **Design for Restartability**: Every step should be independently executable
4. **Avoid Bias in Testing**: Never promote specific solutions in evaluation prompts
5. **Log Everything**: Comprehensive logging enables post-hoc analysis
6. **Test Permission Models Early**: Permission issues will block everything else

## Conclusion

The multi-agent ergonomic review loop successfully identified that LLMs prefer simple, reliable tools over complex, feature-rich ones. The process itself evolved from a complex subprocess architecture to a simple delegation model, mirroring the very insight it discovered: simplicity and reliability trump sophistication.

The system is now reusable for analyzing ergonomics in any tool ecosystem, with the main requirement being domain-specific prompt adaptation.