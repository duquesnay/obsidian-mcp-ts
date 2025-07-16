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
- [x] Phase 1: Foundation (Partial)
  - [x] Created constants file
  - [x] Replaced magic numbers (port, timeout, batch size, context length)
  - [x] Created ObsidianErrorHandler
  - [x] Applied to 4 tools (GetFileContents, AppendContent, DeleteFile, SimpleSearch)
- [ ] Phase 2: Tool Updates (In Progress)
  - Need to update remaining tools with error handler
  - Need to complete constant usage in all tools
- [ ] Phase 3: Architecture
- [ ] Phase 4: Polish

## Summary of Changes So Far
1. Created `src/constants.ts` with all magic numbers
2. Created `src/utils/ObsidianErrorHandler.ts` for centralized error handling
3. Updated ObsidianClient to use constants
4. Updated 4 tools to use the error handler
5. All tests passing after each change (green line maintained)