# Sub-Agent Team for Obsidian MCP TypeScript

This directory contains specialized sub-agent definitions for collaborative development on the Obsidian MCP TypeScript project.

## Available Agents

### Core Development Team

1. **typescript-specialist.md**
   - Expert in TypeScript type system
   - Handles type extraction, interfaces, generics
   - Perfect for tasks: CQ8, CQ10

2. **test-engineer.md** 
   - TDD methodology expert
   - Ensures comprehensive test coverage
   - Required for all development tasks

3. **code-quality-analyst.md**
   - Identifies code smells and duplication
   - Extracts magic numbers and constants
   - Ideal for task: CQ9

### Architecture & Design Team

4. **architecture-reviewer.md**
   - SOLID principles enforcement
   - Design pattern expertise
   - Reviews structural changes

5. **performance-optimizer.md**
   - Caching and batching strategies
   - Performance profiling
   - Optimization implementation

### Support Team

6. **documentation-writer.md**
   - Technical documentation
   - API docs and examples
   - Maintains README and CLAUDE.md

7. **integration-specialist.md**
   - API compatibility
   - Component integration
   - Cross-cutting concerns

8. **git-workflow-manager.md**
   - Version control best practices
   - Atomic commits
   - PR management

### Coordination

9. **backlog-manager.md**
   - Strategic project management
   - Backlog tracking and goal management
   - Multi-session project continuity

## Usage with /agents Command

To use these agents with the `/agents` command:

```
/agents
```

Then select the appropriate agent(s) for your task. 

## Collaborative Workflows

### For Type Extraction (CQ8)
- Primary: typescript-specialist
- Support: test-engineer, git-workflow-manager
- Review: architecture-reviewer

### For Constants Extraction (CQ9)
- Primary: code-quality-analyst
- Support: test-engineer, git-workflow-manager
- Documentation: documentation-writer

### For Type Guards (CQ10)
- Primary: typescript-specialist
- Support: test-engineer, code-quality-analyst
- Review: architecture-reviewer

### For Complex Multi-Session Projects
- Strategic Management: backlog-manager
- All relevant specialists based on project requirements

## Best Practices

1. Always include test-engineer for any code changes
2. Use git-workflow-manager for proper commits
3. Include documentation-writer for user-facing changes
4. Use backlog-manager for strategic project management across sessions

## Agent Communication

Agents can reference each other's work through:
- Shared context in the conversation
- Explicit handoffs in their outputs
- Coordinator-managed workflows

Each agent is designed to work both independently and collaboratively, following the single responsibility principle while contributing to the team's overall success.