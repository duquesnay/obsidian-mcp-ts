# Sub-Agent Team for Obsidian MCP TypeScript

This directory contains specialized sub-agent definitions for collaborative development on the Obsidian MCP TypeScript project.

## Available Agents

### Core Development Team

1. **developer.md**
   - Primary coding partner for all development work
   - Handles feature implementation, refactoring, and programming tasks
   - Go-to agent for any coding needs

2. **code-quality-analyst.md**
   - Identifies code smells and duplication
   - Extracts magic numbers and constants
   - Ensures adherence to DRY and SOLID principles

### Architecture & Design Team

3. **architecture-reviewer.md**
   - SOLID principles enforcement
   - Design pattern expertise
   - Reviews structural changes

4. **performance-optimizer.md**
   - Caching and batching strategies
   - Performance profiling
   - Optimization implementation

### Support Team

5. **documentation-writer.md**
   - Technical documentation
   - API docs and examples
   - Maintains README and CLAUDE.md

6. **integration-specialist.md**
   - API compatibility
   - Component integration
   - Cross-cutting concerns

7. **git-workflow-manager.md**
   - Version control best practices
   - Atomic commits
   - PR management

### Coordination

8. **backlog-manager.md**
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

### For Feature Implementation
- Primary: developer
- Support: git-workflow-manager
- Review: architecture-reviewer

### For Code Quality Improvements
- Primary: code-quality-analyst
- Support: developer, git-workflow-manager
- Documentation: documentation-writer

### For Complex Refactoring
- Primary: developer
- Support: code-quality-analyst
- Review: architecture-reviewer

### For Complex Multi-Session Projects
- Strategic Management: backlog-manager
- All relevant specialists based on project requirements

## Best Practices

1. Use code-quality-analyst to ensure clean, maintainable code
2. Use git-workflow-manager for proper commits and version control
3. Include documentation-writer for user-facing changes
4. Use backlog-manager for strategic project management across sessions

## Agent Communication

Agents can reference each other's work through:
- Shared context in the conversation
- Explicit handoffs in their outputs
- Coordinator-managed workflows

Each agent is designed to work both independently and collaboratively, following the single responsibility principle while contributing to the team's overall success.