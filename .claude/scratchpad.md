# Obsidian MCP TypeScript - Development Scratchpad

## Current Focus
Quality improvements based on code review findings.

## Working Notes

### SSL Verification Context
- Obsidian Local REST API uses self-signed certificates
- This is expected behavior for local development
- Not a security vulnerability, but a requirement
- Updated CLAUDE.md to document this clearly

### Quality Review Findings Summary
- Overall Score: 7/10
- Main issues: DRY violations, complex error handling, magic numbers
- Critical "issue" (SSL) was actually correct behavior

### Implementation Order
Following green-line development:
1. Start with constants (foundation)
2. Move to error handling (high impact)
3. Then architecture improvements
4. Finally polish and optimization

### Test-First Reminders
- Write test before implementation
- Keep tests green throughout
- One change at a time
- Commit frequently

## Quick Commands

```bash
# Run tests
npm test

# Type check
npm run type-check

# Build
npm run build

# Run dev mode
npm run dev
```

## Progress Tracking
- [ ] Phase 1: Foundation
- [ ] Phase 2: Tool Updates
- [ ] Phase 3: Architecture
- [ ] Phase 4: Polish