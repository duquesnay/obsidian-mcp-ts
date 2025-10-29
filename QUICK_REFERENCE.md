# Worktree Setup - Quick Reference Card

## Your 3 Active Worktrees

| Worktree | Location | Branch | Purpose |
|----------|----------|--------|---------|
| Main | `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts` | `main` | Reference & docs |
| **Baseline** | `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes` | `fix/baseline-test-failures` | Fix 6 failing tests |
| **SDK** | `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration` | `feat/sdk-migration-wt` | SDK v1.20.2 upgrade |

## 6 Tests to Fix (in baseline-fixes worktree)

| # | Test File | Failure | Priority |
|---|-----------|---------|----------|
| 1 | TagManagementClient.test.ts | Mock format mismatch (API v4.1.0) | 2 |
| 2 | multi-tag-verification.test.ts | 400 error - wrong request format | **1** |
| 3 | resources-integration.test.ts | Timeout - metadata fetch hangs | **1** |
| 4 | RecentChangesHandler.migration.test.ts | Performance - 665ms vs 200ms target | 2 |
| 5 | *Implied* | TagManagementClient mock (part of #1) | 2 |
| 6 | *Implied* | TagManagementClient mock (part of #1) | 2 |

> **Note**: Failures #1-3 are root issues; #2 and #3 likely block others from passing

## Quick Navigation Commands

### Switch to Baseline Fixes Worktree
```bash
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes
npm test                  # See the 6 failures
```

### Switch to SDK Migration Worktree
```bash
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration
npm run dev               # Continue SDK work
```

### Back to Main
```bash
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts
git status                # Should show: on branch main
```

## One-Liner Commands

```bash
# List all worktrees
git worktree list

# Show test failures
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes && npm test 2>&1 | grep -E "FAIL|✓|✗"

# Check which branch you're on
git branch --show-current
```

## Recommended Fix Order

1. **First**: Fix failure #3 (metadata timeout)
   - File: `src/resources/RecentHandler.ts`
   - Likely issue: `client.getFileContents is not a function`

2. **Then**: Retest failure #4 (performance)
   - May self-resolve once #3 is fixed
   - File: `tests/unit/RecentChangesHandler.migration.test.ts`

3. **Fix**: Failure #2 (API format)
   - File: `tests/exploratory/multi-tag-verification.test.ts`
   - Real Obsidian API behavior vs test expectations

4. **Last**: Failure #1 (test mocks)
   - File: `tests/TagManagementClient.test.ts`
   - Update mocks to match API v4.1.0 format

## When You're Ready to Merge

```bash
# In baseline-fixes worktree
npm run build             # Must succeed
npm test                  # Must show: 0 failed
git status                # Must be clean
git log --oneline -n 3    # Check commits

# Then merge to main
git checkout main
git merge fix/baseline-test-failures
git push origin main

# Then update SDK branch
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration
git fetch origin
git rebase origin/main    # Get baseline fixes
npm test                  # Ensure still passing
```

## Files You'll Likely Edit

**For Tag API fixes:**
- `src/obsidian/services/TagManagementClient.ts`
- `tests/TagManagementClient.test.ts`
- `tests/exploratory/multi-tag-verification.test.ts`

**For Metadata/Timeout fix:**
- `src/resources/RecentHandler.ts`
- `src/obsidian/ObsidianClient.ts`
- `src/utils/ResourceMetadataUtil.ts`

**For Performance fix:**
- `src/utils/PaginationSystem.ts`
- `src/resources/RecentChangesHandler.ts`
- `tests/unit/RecentChangesHandler.migration.test.ts`

## Commit Message Format

```bash
git commit -m "fix: resolve TagManagementClient batch tag API format mismatch"
git commit -m "fix: prevent metadata fetch timeout in RecentHandler"
git commit -m "perf: optimize large offset pagination performance"
```

## If You Get Stuck

1. **Check the investigation guide**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts/BASELINE_FAILURES_SUMMARY.md`
2. **Review the detailed workflow**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts/WORKTREE_WORKFLOW.md`
3. **Run tests with verbose output**: `npm test 2>&1 | tee test-output.log`
4. **Check git diff**: `git diff` to see your changes
5. **Compare with working branch**: `git diff main -- path/to/file`

## Key Principle

- **Baseline fixes**: Only fix the 6 failing tests, don't mix in SDK changes
- **SDK migration**: Separate worktree, separate concerns
- **Clean commits**: One fix per commit, descriptive messages
- **Test before committing**: Always run full test suite before git commit
