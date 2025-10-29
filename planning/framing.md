# Project Framing: Obsidian MCP Modernization

**Project:** obsidian-mcp-ts SDK Upgrade & Protocol Enhancement
**Created:** 2025-10-29
**Status:** Ready for Implementation

---

## Framing Status

- [x] Motives & Success
- [x] Product Vision
- [x] What & Story Map
- [x] Architecture
- [x] Risks
- [x] Success Validation Strategy
- [x] Execution Approach
- [x] Scope Definition
- [x] Integration Verification

---

## 1. Ambition: Motives & Success

### Problem Statement
Current obsidian-mcp-ts implementation:
- Uses outdated MCP SDK (v1.13.1, released 2024-12)
- Lacks modern protocol features (prompts, completions, sampling, logging)
- Agent usability needs validation through systematic research
- Missing data-driven insights into tool usage patterns

This limits:
- Protocol compliance and future compatibility
- Agent effectiveness on first interaction
- Ability to identify and prioritize ergonomic improvements
- Strategic decision-making based on real usage data

### Success Criteria
**Primary Outcome:** "It works and agents are using the MCP better at first use"

**Measurable Indicators:**
1. **Protocol Compliance:** All SDK v1.20.2 features implemented and tested
2. **First-Use Effectiveness:** Agents successfully complete common tasks without clarification prompts
3. **Data-Driven Validation:** MCP logging captures tool usage patterns with actionable metrics
4. **Research Findings:** Documented insights from synthetic user testing inform Phase 2 priorities

**Definition of Done:**
- SDK upgraded to v1.20.2 with all breaking changes addressed
- All protocol features (prompts, completions, sampling, logging) implemented
- Test suite passes (unit, integration, E2E)
- Research phase completed with documented findings in planning/research/
- Decision point reached for Phase 2 based on quantitative data

### Timeline & Budget Expectations
**Total Estimated Effort:** ~43 hours

**Phase 1 - Modernization:** ~29 hours
- SDK upgrade: 8-12 hours
- Protocol features: 12-15 hours
- Testing & validation: 4-6 hours

**Phase 2 - Ergonomics Research:** ~14 hours
- Synthetic user testing setup: 3-4 hours
- Test execution & analysis: 6-8 hours
- Documentation & recommendations: 4-6 hours

**Constraint:** Time investment must justify benefits - if Phase 1 research reveals marginal gains, Phase 2 scope may be reduced or deferred

---

## 2. Product Vision

### Unique Value Proposition
**Modern Protocol Foundation + Research-Driven Ergonomics**

Combining technical modernization with systematic UX research creates a unique approach:
- **Not just an upgrade:** Adding protocol features that enable future capabilities
- **Research-backed:** Using synthetic user testing to validate and prioritize improvements
- **Data-informed:** MCP logging provides quantitative insights for strategic decisions
- **Incremental delivery:** Backlog-based approach ensures value delivered in manageable steps

### Target Beneficiaries
1. **AI Agents (Primary):** More intuitive first-use experience, better tool discovery, clearer error handling
2. **MCP Server Maintainers:** Modern SDK reduces technical debt, easier future upgrades
3. **Obsidian Users:** More reliable and capable AI integration with their vaults
4. **Claude Code:** Better tool selection and context management through logging insights

### Strategic Positioning
Position obsidian-mcp-ts as:
- **Reference implementation** for modern MCP servers
- **Research-informed** design decisions based on synthetic user testing
- **Performance-conscious** with practical optimizations
- **Production-ready** with comprehensive testing and error handling

---

## 3. What & Story Map

### Core Deliverable
**Modern MCP server with protocol compliance and research-validated ergonomics**

### User Journey: Agent Interaction with Obsidian MCP

#### Journey 1: Initial Discovery (Phase 1 Focus)
```
Agent starts task → Discovers tools → Selects appropriate tool → Executes successfully
```

**Phase 1 Enhancements:**
- Tool metadata improvements
- Prompt templates for common workflows
- Sampling integration for context-aware operations
- Logging to track decision patterns

#### Journey 2: Complex Operations (Phase 2 Research Target)
```
Agent plans multi-step workflow → Chains tools → Handles errors → Achieves outcome
```

**Research Questions:**
- Which tool combinations are most common?
- Where do agents get stuck or make mistakes?
- What error recovery patterns emerge?

#### Journey 3: Iterative Refinement (Phase 2 Outcome)
```
Analysis reveals patterns → Prioritize improvements → Implement changes → Validate impact
```

### Feature Priorities

#### Must-Have (Phase 1)
1. **SDK Upgrade to v1.20.2**
   - Address breaking changes
   - Update dependencies
   - Verify compatibility

2. **Protocol Features Implementation**
   - Prompts: Templates for common workflows
   - Completions: Context-aware suggestions
   - Sampling: LLM integration for smart operations
   - Logging: Usage tracking and metrics

3. **Tool Enhancement (All 33 Tools)**
   - Response mode system integration
   - Improved error messages
   - Metadata completeness

4. **Resource Enhancement (All 9 Resources)**
   - Protocol compliance
   - Performance optimization
   - Error handling

5. **Testing Infrastructure**
   - Unit tests for new features
   - Integration tests for protocol compliance
   - E2E tests with real vault

#### Should-Have (Phase 2 - Research Dependent)
6. **Ergonomics Research**
   - Synthetic user testing framework
   - Common workflow scenarios
   - Usage pattern analysis
   - Improvement recommendations

7. **Data-Driven Improvements**
   - Based on logging insights
   - Prioritized by frequency/impact
   - Validated through testing

#### Nice-to-Have (Future)
8. **Advanced Analytics**
   - Dashboard for usage metrics
   - Trend analysis over time
   - Performance profiling

9. **Community Feedback Integration**
   - Real-world usage patterns
   - Feature requests prioritization

---

## 4. Architecture

### Tech Stack & Constraints

**Current Foundation:**
- TypeScript with strict mode
- MCP SDK v1.13.1 → upgrading to v1.20.2
- Obsidian Local REST API v4.1.0+
- Axios for HTTP client
- Vitest for testing

**New Dependencies:**
- None required - SDK upgrade is drop-in replacement
- May add logging libraries for Phase 2 analytics

**Architecture Principles:**
- Clean separation of concerns
- Dynamic tool discovery
- Type-safe implementations
- Performance-conscious patterns

### Integration Points

**External Systems:**
1. **Obsidian Local REST API**
   - Version: 4.1.0+ required
   - Batch tag operations support
   - Self-signed SSL certificates

2. **MCP Protocol**
   - Version: Latest (via SDK v1.20.2)
   - stdio transport
   - Full protocol feature support

3. **Claude Desktop/Code**
   - Configuration via claude_desktop_config.json
   - Resource access limitations (SDK issues #686, #263)

### Component Architecture

```
src/
├── index.ts                    # Server initialization + protocol feature registration
├── tools/                      # 33 tools (enhanced with response modes)
│   ├── file-operations/        # 11 tools
│   ├── directory-operations/   # 5 tools
│   ├── search/                 # 3 tools
│   ├── editing/                # 4 tools
│   ├── tags/                   # 4 tools
│   └── periodic-notes/         # 6 tools
├── resources/                  # 9 resources (protocol compliance)
│   ├── handlers/               # Resource implementations
│   └── util/                   # Metadata utilities
├── protocol/                   # NEW: Protocol features
│   ├── prompts/                # Prompt templates
│   ├── completions/            # Context-aware completions
│   ├── sampling/               # LLM integration
│   └── logging/                # Usage tracking
├── obsidian/                   # REST API client
└── utils/                      # Performance utilities
```

### Performance Requirements

**Current Performance:**
- LRU cache with TTL
- Request deduplication
- Optimized batch processing
- 10 MB binary file limit

**New Requirements:**
- Logging overhead: < 5% performance impact
- Protocol feature response time: < 100ms
- Maintain existing cache hit rates
- No regression in tool execution speed

### Quality Standards

**Testing Requirements:**
- Unit tests: > 80% coverage maintained
- Integration tests: All protocol features
- E2E tests: Happy path workflows
- Performance tests: Regression prevention

**Code Quality:**
- TypeScript strict mode
- No `any` types (except base interfaces)
- Comprehensive error handling
- Documentation for all public APIs

---

## 5. Risk Management

### Primary Concerns

#### Risk 1: Breaking Changes in SDK Upgrade (HIGH)
**Concern:** SDK v1.13.1 → v1.20.2 may introduce breaking changes affecting all 33 tools

**Mitigation:**
- Review SDK changelog systematically
- Run full test suite after upgrade
- Test with MCP Inspector before integration
- Create test vault for safe experimentation
- Incremental migration approach

**Contingency:** If breaking changes are extensive, document migration path and defer non-critical updates

#### Risk 2: Research Phase ROI Uncertainty (MEDIUM)
**Concern:** Phase 2 research may reveal marginal improvement opportunities not justifying 14-hour investment

**Mitigation:**
- Use Phase 1 logging data to inform Phase 2 go/no-go decision
- Define clear metrics for research value (e.g., "if top 3 issues affect > 20% of usage")
- Timeboxed research scope with early exit criteria
- Focus on high-impact, low-effort improvements first

**Contingency:** If research reveals low ROI, document findings and defer Phase 2 indefinitely

#### Risk 3: Protocol Feature Complexity (MEDIUM)
**Concern:** Implementing prompts, completions, sampling may be more complex than estimated 12-15 hours

**Mitigation:**
- Start with simplest feature (logging) to understand patterns
- Reference official SDK examples and documentation
- Parallel implementation where possible (prompts + completions)
- Use existing tool patterns as templates

**Contingency:** Implement critical features first (logging), defer others if time exceeds budget

#### Risk 4: Obsidian API Stability (LOW)
**Concern:** Local REST API v4.1.0+ may have undocumented quirks or limitations

**Mitigation:**
- Maintain test vault for validation
- Document any API behavior deviations
- Keep integration tests comprehensive
- Monitor Obsidian plugin updates

**Contingency:** Report issues upstream, implement workarounds with clear documentation

#### Risk 5: Testing Infrastructure Gaps (LOW)
**Concern:** Current test suite may not catch protocol-level integration issues

**Mitigation:**
- Add protocol-specific integration tests
- Use MCP Inspector for manual validation
- Test with real Claude Desktop/Code
- Document test coverage gaps

**Contingency:** Supplement automated tests with manual test protocols

### Change Factors

**What could change our approach:**

1. **SDK Changelog Reveals Major Redesign**
   - Impact: Could extend timeline significantly
   - Response: Reassess scope, consider staying on v1.13.1 with targeted patches

2. **Logging Data Shows Unexpected Usage Patterns**
   - Impact: Phase 2 priorities may shift dramatically
   - Response: Adapt research focus to highest-impact areas

3. **Protocol Features Prove Simple to Implement**
   - Impact: Could accelerate Phase 1, start Phase 2 earlier
   - Response: Maintain quality standards, don't rush testing

4. **Community Feedback During Development**
   - Impact: May identify critical missing features
   - Response: Evaluate against current scope, add to backlog or integrate if high priority

### Confidence Gaps

**Where uncertainty remains:**

1. **Synthetic User Testing Methodology**
   - Confidence: Medium
   - Gap: No established framework for MCP UX research
   - Approach: Design methodology during Phase 1, validate with pilot tests

2. **Protocol Feature Adoption Impact**
   - Confidence: Medium
   - Gap: Unknown how much prompts/completions improve agent experience
   - Approach: Measure before/after with controlled scenarios

3. **Breaking Changes Scope**
   - Confidence: Low (until SDK changelog reviewed)
   - Gap: Haven't analyzed v1.13.1 → v1.20.2 migration path
   - Approach: First task in Phase 1 is comprehensive changelog analysis

4. **Research Phase Execution Time**
   - Confidence: Medium
   - Gap: 14-hour estimate based on assumptions
   - Approach: Track actual time, adjust scope dynamically

---

## 6. Success Validation Strategy

### Outcome-Focused Validation
**Primary Success Metric:** "It works and agents are using the MCP better at first use"

### Validation Approaches

#### 1. Protocol Compliance Validation
**Method:** Automated testing + MCP Inspector
- All SDK v1.20.2 features implemented
- Protocol message exchange verified
- Error handling tested across failure modes

**Success Criteria:**
- Zero protocol errors in test suite
- MCP Inspector shows all features available
- Claude Desktop/Code successfully connects

#### 2. First-Use Effectiveness Validation
**Method:** Synthetic user testing scenarios
- Common workflow completion rates
- Steps to successful outcome
- Error recovery patterns
- Clarification prompts needed

**Success Criteria:**
- > 80% success rate on first attempt for common tasks
- < 2 clarification prompts on average
- Clear error messages guide recovery

#### 3. Data-Driven Decision Making
**Method:** MCP logging with quantitative metrics
- Track tool usage frequency
- Measure success/failure rates per tool
- Analyze usage patterns over time
- Identify most common workflows

**Success Criteria:**
- Logging captures all tool invocations
- Data exports for analysis available
- Usage patterns inform Phase 2 priorities

#### 4. Integration Verification
**Test Environments:**
- **Development:** Test vault with controlled data
- **Validation:** Real vault for realistic scenarios

**Priority Order:**
1. Logging (foundational for metrics)
2. Completions (high agent value)
3. Prompts (workflow guidance)
4. Sampling (advanced use cases)

**Documentation:**
- Research findings in planning/research/
- Usage patterns analysis
- Improvement recommendations

---

## 7. Multi-Phase Execution Strategy

### Phase 1: Modernization (Weeks 1-2)
**Goal:** Protocol compliance + modern SDK foundation

**Deliverables:**
1. SDK upgraded to v1.20.2
2. Breaking changes addressed
3. Protocol features implemented (prompts, completions, sampling, logging)
4. Test suite updated and passing
5. Documentation updated

**Decision Point:** Review logging data to assess Phase 2 ROI

**Go/No-Go Criteria for Phase 2:**
- Logging reveals clear improvement opportunities
- Usage patterns show common pain points
- Estimated ROI justifies 14-hour investment
- No critical bugs in Phase 1 requiring attention

### Phase 2: Ergonomics Research (Weeks 3-4)
**Goal:** Research-validated improvements based on real usage

**Prerequisites:**
- Phase 1 complete and stable
- Logging data collected (minimum 1 week)
- Go decision based on quantitative metrics

**Deliverables:**
1. Synthetic user testing framework
2. Test execution across scenarios
3. Usage pattern analysis
4. Improvement recommendations prioritized
5. Backlog updated with findings

**Metrics to Track:**
- Tool usage frequency distribution
- Success/failure rates by tool
- Common workflow patterns
- Error frequency and types
- Time to successful completion

**Output:**
- planning/research/findings.md
- planning/research/recommendations.md
- Updated backlog with prioritized improvements

---

## 8. Scope Definition

### Full Scope Commitment
**Decision:** "All of it. But we will proceed step by step, use the backlog for fine increments"

### Complete Scope Inventory

#### Protocol Features (4 Features)
- [x] Prompts: Workflow templates
- [x] Completions: Context-aware suggestions
- [x] Sampling: LLM integration
- [x] Logging: Usage tracking

#### Tool Updates (33 Tools)
**File Operations (11):**
- list_files_in_vault, list_files_in_dir, get_file_contents
- get_file_formatted, get_file_frontmatter, get_file_metadata
- check_path_exists, copy_file, move_file, rename_file, delete_file

**Directory Operations (5):**
- create_directory, delete_directory, move_directory
- copy_directory, find_empty_directories

**Search (3):**
- simple_search, advanced_search, complex_search

**Editing (4):**
- edit (unified), simple_append, simple_replace, query_structure

**Tags (4):**
- get_all_tags, get_files_by_tag, rename_tag, manage_file_tags

**Periodic Notes (6):**
- get_periodic_note, get_recent_periodic_notes, get_recent_changes

#### Resource Updates (9 Resources)
- vault://note/{path}
- vault://search?q={query}
- vault://tag/{tag}
- vault://daily, vault://weekly, vault://monthly, vault://quarterly, vault://yearly
- vault://recent

#### Testing Coverage
- Unit tests for new protocol features
- Integration tests for tool/resource updates
- E2E tests for complete workflows
- Performance regression tests

### Incremental Delivery via Backlog

**Backlog Management:**
- Break work into small, testable increments
- One concern per commit
- Each increment delivers measurable value
- Use .claude/backlog.md for goal-oriented tracking
- Technical tasks delegated to specialists

**Delivery Rhythm:**
- Daily: Complete 2-3 backlog items
- Weekly: Phase milestone completion
- Bi-weekly: Phase completion + retrospective

---

## 9. Integration Verification Approach

### Test Environment Strategy

#### Development Environment
**Test Vault Configuration:**
- Controlled dataset for reproducible tests
- Known file structure and content
- Edge cases represented
- Version controlled test data

**Usage:**
- Initial feature development
- Unit and integration testing
- Breaking change validation
- Performance benchmarking

#### Validation Environment
**Real Vault Integration:**
- Actual user vault with real content
- Production-like scenarios
- Real-world edge cases
- Performance under load

**Usage:**
- Final validation before release
- Regression testing
- User acceptance scenarios
- Documentation verification

### Testing Priority Order

#### Priority 1: Logging (Foundational)
**Rationale:** Enables all subsequent data-driven decisions

**Tests:**
- Tool invocation tracking
- Success/failure recording
- Performance metrics capture
- Data export functionality

**Success Criteria:**
- All tool calls logged
- Data queryable and exportable
- < 5% performance overhead

#### Priority 2: Completions (High Agent Value)
**Rationale:** Directly improves first-use effectiveness

**Tests:**
- Context-aware suggestions
- Relevant tool recommendations
- Parameter completion accuracy

**Success Criteria:**
- > 80% relevant suggestions
- Response time < 100ms
- No false completions

#### Priority 3: Prompts (Workflow Guidance)
**Rationale:** Helps agents understand common patterns

**Tests:**
- Template coverage for common workflows
- Template clarity and completeness
- Integration with tool metadata

**Success Criteria:**
- Top 10 workflows covered
- Templates lead to successful execution
- Clear parameter descriptions

#### Priority 4: Sampling (Advanced Use Cases)
**Rationale:** Enables context-aware operations

**Tests:**
- LLM integration functionality
- Smart content generation
- Context preservation

**Success Criteria:**
- Successful LLM calls
- Relevant content generation
- Proper error handling

### Research Documentation Structure

```
planning/research/
├── methodology.md          # Synthetic testing approach
├── scenarios.md            # Test scenarios and workflows
├── results/
│   ├── tool-usage.md      # Frequency and pattern analysis
│   ├── error-analysis.md  # Failure modes and recovery
│   └── performance.md     # Speed and efficiency metrics
├── findings.md            # Key insights and patterns
└── recommendations.md     # Prioritized improvements
```

---

## 10. Framing Decisions Log

### 2025-10-29: Initial Framing Session

**Decision: Two-Phase Approach**
- Rationale: Separates technical foundation (Phase 1) from research-driven improvements (Phase 2)
- Impact: Enables go/no-go decision based on Phase 1 data
- Validated by: User confirmation

**Decision: Full Scope with Incremental Delivery**
- Rationale: "All of it" commitment balanced by "step by step" execution
- Impact: Comprehensive modernization without overwhelming scope
- Validated by: Backlog methodology ensures manageability

**Decision: Outcome-Focused Success Criteria**
- Rationale: "It works and agents are using the MCP better at first use"
- Impact: Focuses on user experience, not just technical implementation
- Validated by: Data-driven validation approach

**Decision: Logging as Phase Transition Gate**
- Rationale: Quantitative data needed to justify Phase 2 investment
- Impact: Evidence-based decision making vs. speculation
- Validated by: User specified metrics and approach

**Decision: Research Findings in planning/research/**
- Rationale: Separate research artifacts from implementation documentation
- Impact: Clear organization, easier to reference and update
- Validated by: User approved documentation structure

**Decision: Test Vault + Real Vault Strategy**
- Rationale: Controlled testing + realistic validation
- Impact: Balances reproducibility with real-world accuracy
- Validated by: User confirmed approach

**Decision: Happy Path Prioritization**
- Rationale: Logging → Completions → Prompts → Sampling
- Impact: Foundational features first, advanced features later
- Validated by: User confirmed priority order

---

## 11. Next Steps

### Immediate Actions (Week 1, Day 1)
1. **Analyze SDK Changelog** (2-3 hours)
   - Review v1.13.1 → v1.20.2 changes
   - Identify breaking changes
   - Document migration strategy

2. **Create Backlog** (1 hour)
   - Break Phase 1 into incremental tasks
   - Prioritize by dependency and risk
   - Assign initial effort estimates

3. **Set Up Test Vault** (1 hour)
   - Create controlled test dataset
   - Configure for development
   - Version control test data

### Week 1 Goals
- SDK upgraded and tests passing
- Logging feature implemented
- Initial usage data collected

### Week 2 Goals
- All protocol features implemented
- Tool and resource updates complete
- Phase 1 validation complete

### Phase Transition Checkpoint (End of Week 2)
**Review Logging Data:**
- What are the top 10 most-used tools?
- What are the common failure patterns?
- Where do agents need the most help?

**Decision Point:**
- Proceed to Phase 2? (Yes/No based on ROI analysis)
- What should Phase 2 prioritize? (Data-driven)
- What's the expected impact? (Quantified from patterns)

---

## 12. Living Document Commitment

This framing document will be updated:
- **When assumptions change:** New information invalidates decisions
- **When scope evolves:** Backlog reveals new insights
- **When risks materialize:** Contingencies activated
- **At phase transitions:** Retrospective learnings incorporated
- **When research completes:** Findings integrated

**Maintenance Pattern:**
- Mark sections as "Updated: [date]" when modified
- Keep decision log current with new choices
- Archive old decisions with rationale for change
- Review framing at milestone completions

**Review Cadence:**
- Weekly: During phase execution
- Milestone: At phase transitions
- Ad-hoc: When blockers or changes arise

---

**End of Framing Document**

*This document represents the shared understanding between user and AI agents for the obsidian-mcp-ts modernization project. It serves as the foundation for all implementation work and the reference point for scope, priorities, and strategic decisions.*
