# User Story Map

**Project:** Obsidian MCP Modernization
**Created:** 2025-10-29
**Purpose:** Visualize agent journey and feature organization

---

## Story Mapping Structure

```
USER ACTIVITIES (horizontal)
    ↓
USER TASKS (horizontal)
    ↓
USER STORIES (vertical - priority)
```

---

## Agent Journey: Using Obsidian MCP

### Activity 1: Initial Discovery & Setup

**Agent starts new task involving Obsidian vault**

#### Task 1.1: Discover available capabilities
- **SDK-001:** Agent analyzes SDK changelog and identifies migration strategy
- **SDK-002:** Agent upgrades SDK dependency and validates compatibility
- **SDK-003:** Agent resolves breaking changes in core server setup

#### Task 1.2: Verify server functionality
- **TOOL-001:** Agent updates all 33 tools for SDK compatibility
- **RESOURCE-001:** Agent updates all 9 resources for protocol compliance

#### Task 1.3: Understand usage patterns
- **LOGGING-001:** Agent implements MCP logging for tool usage tracking
- **LOGGING-002:** Agent creates usage pattern analysis utilities

---

### Activity 2: Execute Common Workflows

**Agent performs typical vault operations**

#### Task 2.1: Get context-aware help
- **COMPLETION-001:** Agent implements context-aware completions
- **PROMPT-001:** Agent creates prompt templates for common workflows

#### Task 2.2: Perform advanced operations
- **SAMPLING-001:** Agent implements sampling for LLM integration

---

### Activity 3: Validate & Improve

**Agent validates work and identifies improvements**

#### Task 3.1: Ensure quality
- **TEST-001:** Agent validates Phase 1 with comprehensive testing

#### Task 3.2: Make strategic decisions
- **PHASE1-COMPLETE:** Agent documents Phase 1 completion and analyzes go/no-go for Phase 2

---

## Release Planning

### Release 1: Foundation (Phase 1 Core)
**Theme:** Modern SDK with protocol compliance

**Includes:**
- SDK-001, SDK-002, SDK-003
- TOOL-001, RESOURCE-001
- LOGGING-001, LOGGING-002
- TEST-001

**Value:** Agents can use modernized MCP with reliable logging

**Timeline:** Week 1-2

---

### Release 2: Enhancement (Phase 1 Complete)
**Theme:** Improved first-use effectiveness

**Includes:**
- COMPLETION-001
- PROMPT-001
- SAMPLING-001
- PHASE1-COMPLETE

**Value:** Agents get context-aware help and workflow guidance

**Timeline:** End of Week 2

---

### Release 3: Research-Driven (Phase 2 - Conditional)
**Theme:** Data-informed ergonomic improvements

**Includes:**
- RESEARCH-001 through RESEARCH-004
- Items identified from Phase 1 logging analysis

**Value:** Targeted improvements based on real usage patterns

**Timeline:** Week 3-4 (if go decision made)

---

## Story Map Evolution

This map will evolve as:
- **Phase 1 completes:** Logging data reveals actual usage patterns
- **Research findings emerge:** New workflows identified
- **Technical debt accumulates:** Capabilities added to restore health
- **Community feedback received:** Real-world patterns incorporated

**Update triggers:**
- After quality reviews
- At phase transitions
- When new workflows discovered
- When scope changes approved

---

## Workflow Categories

### Read Operations (Most Common - Expected)
- Get file contents
- Search vault
- List files/directories
- Get metadata

### Write Operations (Moderate Frequency)
- Create/edit notes
- Append content
- Update frontmatter
- Manage tags

### Structural Operations (Lower Frequency)
- Move/rename files
- Create directories
- Reorganize vault
- Batch operations

**Note:** Actual frequency distribution will be validated through LOGGING-002 analysis.

---

## Agent Persona Assumptions

**Primary Agent:** Claude Code
**Use Case:** Development workflow documentation and knowledge management

**Expected Behaviors:**
- Reads existing notes for context
- Creates new notes for learnings
- Searches for related information
- Updates frontmatter metadata
- Manages tags for organization

**Pain Points (Hypotheses to Validate):**
- Tool selection when multiple options exist
- Parameter formatting for complex operations
- Error recovery when operations fail
- Understanding vault organization

**Note:** These are assumptions - Phase 1 logging will validate or refute.

---

## Story Map Principles

**Outcome-Oriented:**
- Stories describe what agents accomplish, not implementation details
- Acceptance criteria focus on user-observable behavior
- Technical tasks delegated, not tracked in story map

**Data-Driven:**
- Phase 1 logging informs actual usage patterns
- Story priorities adjusted based on real data
- Hypotheses validated through metrics

**Incremental:**
- Stories deliverable independently
- Value delivered with each release
- Feedback loops built into workflow

---

**Story Map Status:** Initial draft based on planning assumptions. Will be refined with Phase 1 logging data.
