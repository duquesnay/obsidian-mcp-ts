# Parallel Worktree Workflow Guide

## Overview

This document describes the workflow for working on two parallel branches simultaneously using Git worktrees:

1. **Main Worktree**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts` (on `main`)
2. **Baseline Fixes Worktree**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes` (on `fix/baseline-test-failures`)
3. **SDK Migration Worktree**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration` (on `feat/sdk-migration-wt`)

## The 6 Baseline Test Failures to Fix

These failures are on the `main` branch and block the "green line" standard:

### 1. TagManagementClient.test.ts - 3 failures
- **Issue**: Tag API format mismatch between test expectations and actual API implementation
- **Root Cause**: API v4.1.0 supports batch tags in JSON body, but test expects individual headers
- **Status**: Needs investigation on actual API behavior vs test mocking
- **File**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes/tests/TagManagementClient.test.ts`

### 2. multi-tag-verification.test.ts - 1 failure
- **Issue**: 400 error on batch tag operation with JSON array format
- **Expected**: `['multi-tag-a', 'multi-tag-b', 'multi-tag-c']` in body
- **Actual Error**: API returns 400 - Invalid Request
- **File**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes/tests/exploratory/multi-tag-verification.test.ts`

### 3. resources-integration.test.ts - 1 failure
- **Issue**: Timeout waiting for response to request 6 (vault://recent resource)
- **Root Cause**: Resource handler metadata fetching may be blocking
- **Symptom**: "TypeError: client.getFileContents is not a function"
- **File**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes/tests/integration/resources-integration.test.ts`

### 4. RecentChangesHandler.migration.test.ts - 1 failure
- **Issue**: Performance test fails - large offset handling takes 665ms, expected <200ms
- **Status**: Needs performance optimization for pagination system
- **File**: `/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes/tests/unit/RecentChangesHandler.migration.test.ts`

## Worktree Setup (Already Complete)

```bash
# Main worktree (original directory) - on main branch
/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts
├── branch: main
└── purpose: Reference, builds, documentation

# Baseline fixes worktree
/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes
├── branch: fix/baseline-test-failures
└── purpose: Fix the 6 failing tests

# SDK migration worktree
/Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration
├── branch: feat/sdk-migration-wt (tracking feat/sdk-migration)
└── purpose: Continue SDK v1.20.2 upgrade work
```

## Workflow: How to Switch Between Worktrees

### From Main Directory (on any worktree)

```bash
# Switch to baseline fixes worktree
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes
git status                          # Verify you're on fix/baseline-test-failures
npm test                            # Run tests to see failures

# Fix a test, commit to fix/baseline-test-failures
git add tests/...
git commit -m "fix: resolve TagManagementClient test mock expectations"
```

### To SDK Migration Worktree

```bash
# Switch to SDK migration worktree
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration
git status                          # Verify you're on feat/sdk-migration-wt
npm install && npm run build        # Build the branch
npm run dev                         # Continue development

# Commit SDK migration work
git add src/...
git commit -m "feat: complete SDK v1.20.2 integration"
```

### Back to Main Worktree

```bash
# Return to main worktree
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts
git status                          # Verify you're on main
git log --oneline -n 5              # Check git history
```

## Development Workflow: Best Practices

### Phase 1: Fix Baseline Tests (Parallel Work)

**In the baseline fixes worktree:**

```bash
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes

# 1. Understand the failure
npm test 2>&1 | grep -A 20 "TagManagementClient"

# 2. Investigate root cause
cat tests/TagManagementClient.test.ts
cat src/obsidian/services/TagManagementClient.ts

# 3. Make targeted fix
nano tests/TagManagementClient.test.ts    # Fix mock expectations OR
nano src/obsidian/services/TagManagementClient.ts  # Fix implementation

# 4. Run test to verify
npm test -- TagManagementClient.test.ts

# 5. Commit when passing
npm run build                       # Ensure build succeeds
npm test                            # Ensure all tests pass
git add -A
git commit -m "fix: correct TagManagementClient batch tag operation format"
```

### Phase 2: Continue SDK Migration (Separate Worktree)

**In the SDK migration worktree:**

```bash
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration

# Continue work from where you left off
npm run dev                         # Development mode with watch
npm test                            # Run tests

# When ready to commit
npm run build
npm test
git add -A
git commit -m "feat: add SDK v1.20.2 resource type support"
```

## Merging Strategy

### Baseline Fixes (Ready First)

```bash
# When all 6 baseline tests pass on fix/baseline-test-failures:
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes

# Verify all tests pass
npm test
# Should show: "Test Files  0 failed | X passed"

# Switch to main, merge, push
git checkout main
git merge fix/baseline-test-failures
git push origin main

# Update baseline fixes worktree to main
git checkout main
```

### SDK Migration (After Baseline)

```bash
# When SDK migration is complete:
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration

# Ensure your branch is synced with main baseline fixes
git fetch origin
git rebase origin/main              # Update with baseline fixes

# Verify tests still pass
npm test

# Create PR or merge to main
git checkout main
git merge feat/sdk-migration
git push origin main
```

## Important: Keeping Branches Synchronized

### After Fixing Baseline Tests

The baseline fixes should be merged to main first. Then, sync the SDK migration branch:

```bash
# In SDK migration worktree
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration

# Update with baseline fixes that were merged to main
git fetch origin
git rebase origin/main

# Handle any merge conflicts
npm run build                       # Ensure it still builds
npm test                            # Ensure tests still pass
```

### Avoiding Conflicts

- **Baseline fixes**: Fix ONLY the 6 failing tests, don't modify SDK code
- **SDK migration**: Don't modify test files that are being fixed in baseline
- **No overlapping changes**: Keep the two efforts in separate code regions

## Git Commands Reference

### Worktree Operations

```bash
# List all worktrees
git worktree list

# Add a new worktree (already done)
git worktree add -b <branch-name> <path> <starting-point>

# Remove a worktree (when done)
git worktree remove <path>

# Prune dead worktree entries
git worktree prune
```

### During Development

```bash
# Check which branch you're on
git branch --show-current

# View commits on your branch vs main
git log --oneline main..HEAD

# Merge baseline fixes into SDK branch
git merge main                      # Brings in baseline fixes

# Rebase to clean history before PR
git rebase main
git rebase -i HEAD~3                # Interactive rebase to squash commits
```

## Troubleshooting

### "Can't switch to worktree - locked"

```bash
# If a worktree is locked, fix with:
git worktree prune
```

### "npm install fails in worktree"

```bash
# Each worktree has independent node_modules
# Run npm install separately in each worktree
cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-baseline-fixes
npm install

cd /Users/guillaume/dev/tools/mcp/obsidian-mcp-ts-sdk-migration
npm install
```

### "Tests pass locally but fail in CI"

```bash
# Ensure you're running the same test command as CI
npm run build                       # Build first
npm test                            # Run all tests
npm run lint                        # Check linting (if applicable)
```

## Testing the Complete Merge Path

Before merging either branch:

```bash
# In the worktree you're about to merge
npm run build                       # Build succeeds
npm test                            # All tests pass (including the 6 baseline)
npm run lint                        # Code quality checks pass (if applicable)

# Verify no uncommitted changes
git status                          # Should be clean

# Check commits to be merged
git log --oneline origin/main..HEAD # Show commits being merged
```

## Summary: Your Workflow

```
┌─────────────────────────────────────────┐
│ Current State (3 Worktrees Active)      │
├─────────────────────────────────────────┤
│ 1. Main (reference)          → main     │
│ 2. Baseline Fixes            → active   │
│ 3. SDK Migration             → active   │
└─────────────────────────────────────────┘
                    ↓
         Fix 6 Baseline Tests
         (in baseline-fixes worktree)
                    ↓
    Merge baseline fixes to main
                    ↓
    Rebase SDK migration on main
         (to get baseline fixes)
                    ↓
    Continue SDK migration work
                    ↓
         Merge to main
                    ↓
    Both efforts complete!
```

## When to Use Which Worktree

| Task | Worktree | Branch |
|------|----------|--------|
| Fix TagManagementClient tests | baseline-fixes | `fix/baseline-test-failures` |
| Fix resource-integration test | baseline-fixes | `fix/baseline-test-failures` |
| Fix performance test | baseline-fixes | `fix/baseline-test-failures` |
| SDK v1.20.2 upgrade | sdk-migration | `feat/sdk-migration-wt` |
| Check main is green | main | `main` |
| Review baseline fixes before merge | main | `main` |

---

**Setup completed**: All 3 worktrees are ready. Start with baseline fixes, then continue SDK migration work in parallel!
