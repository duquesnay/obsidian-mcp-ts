# 6 Baseline Test Failures - Investigation Summary

## Test Results Summary

**Location**: Main branch (`main`)
**Test Command**: `npm test`
**Date**: 2025-10-29
**Status**: 6 FAIL, 1533 PASS, 13 SKIPPED

---

## Failure #1-3: TagManagementClient.test.ts (3 failures)

### Test Location
`tests/TagManagementClient.test.ts:232`

### Failure Details
```
Expected: mock.patch to be called with
  - String path
  - Array of tags
  - Object with headers: { "Tag-Location": "frontmatter" }

Actual: mock.patch called with
  - String path (✓)
  - Array of tags in JSON body (✓)
  - Object headers with: { "Content-Type", "Location", "Operation", "Target-Type" }
```

### Root Cause Analysis
The test mock expectations were written for the OLD API format (separate header per tag), but the implementation now uses API v4.1.0 format (batch tags in JSON body with single set of headers).

### What Needs Fixing
**Option A (Recommended)**: Update test mocks to match API v4.1.0 batch format
```typescript
// Before (old API format)
expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
  expect.any(String),
  tags,
  expect.objectContaining({
    headers: expect.objectContaining({
      "Tag-Location": "frontmatter"
    })
  })
);

// After (v4.1.0 batch format)
expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
  expect.any(String),
  { tags: tags },  // Wrapped in object
  expect.objectContaining({
    headers: expect.objectContaining({
      "Content-Type": "application/json",
      "Location": "frontmatter",
      "Operation": "add|remove"
    })
  })
);
```

**Option B**: Update implementation to match test expectations (if API behavior is different than expected)

### Files to Inspect
- `tests/TagManagementClient.test.ts` - Test mocks (lines 232+)
- `src/obsidian/services/TagManagementClient.ts` - Implementation
- `src/obsidian/ObsidianClient.ts` - API client call format

### Investigation Steps
1. Review what API v4.1.0 actually expects
2. Check if test is using real API or mocked
3. Compare against multi-tag-verification test (failure #2)
4. Decide: fix test or fix implementation

---

## Failure #2: multi-tag-verification.test.ts (1 failure)

### Test Location
`tests/exploratory/multi-tag-verification.test.ts:47`

### Failure Details
```
Error: AxiosError - Request failed with status code 400
```

### API Call Attempted
```typescript
axiosInstance.patch(
  `/vault/${encodeURIComponent(testFilePath)}`,
  ['multi-tag-a', 'multi-tag-b', 'multi-tag-c'],  // Array directly as body
  {
    headers: {
      "Content-Type": "application/json",
      "Tag-Location": "frontmatter",
      "Target-Type": "tag",
      "Operation": "add"
    }
  }
)
```

### Root Cause Analysis
The test sends tags as a plain array in the body, but API v4.1.0 may expect:
- Wrapped in an object: `{ tags: [...] }`
- Different header names (see TagManagementClient)
- Different API endpoint or format

### What Needs Fixing
1. Check what format the Obsidian API v4.1.0 actually accepts
2. Update the test to match actual API signature
3. May need to update TagManagementClient to match

### Files to Inspect
- `tests/exploratory/multi-tag-verification.test.ts` - The failing test
- Obsidian REST API documentation or real API behavior
- Compare with TagManagementClient implementation

### Investigation Steps
1. Test against real Obsidian API (if available)
2. Check API version and batch tag endpoint
3. Determine correct request format
4. Update test to match

---

## Failure #3: resources-integration.test.ts (1 failure)

### Test Location
`tests/integration/resources-integration.test.ts:61`

### Failure Details
```
Error: Timeout waiting for response to request 6
Timeout: >30000ms
Resource: vault://recent
```

### Root Cause Analysis
The resource handler for `vault://recent` hangs during metadata fetching. Error logs show:
```
TypeError: client.getFileContents is not a function
```

This suggests the metadata fetching code is trying to call a method that doesn't exist on the client object.

### What Needs Fixing
The resource handler is trying to fetch metadata for recent files but:
1. Client method doesn't exist (implementation missing)
2. Metadata fetching is blocking the response
3. Need to either:
   - Implement the missing method
   - Skip metadata fetching for recent resources
   - Use async metadata loading (don't block response)

### Files to Inspect
- `tests/integration/resources-integration.test.ts` - Test (lines 40-80)
- `src/resources/RecentHandler.ts` - Resource handler for recent notes
- `src/obsidian/ObsidianClient.ts` - Check for `getFileContents` method
- `src/utils/ResourceMetadataUtil.ts` - Metadata fetching utility

### Investigation Steps
1. Check if `client.getFileContents` exists in ObsidianClient
2. Verify metadata fetching is async and non-blocking
3. Check if RecentHandler should fetch metadata at all
4. See if other handlers (SearchHandler, etc.) have same issue
5. May need to make metadata optional or lazy-load

---

## Failure #4: RecentChangesHandler.migration.test.ts (1 failure)

### Test Location
`tests/unit/RecentChangesHandler.migration.test.ts:202`

### Failure Details
```
Performance Assertion Failed:
  Expected: end - start < 200ms
  Actual: 665.48ms
  Target: Handle large offsets (offset=5000) efficiently

Test: "should handle large offsets efficiently"
```

### Root Cause Analysis
The pagination system is slow for large offsets. Currently takes 665ms for offset=5000, expected <200ms.

Possible causes:
1. Not using cached pagination correctly
2. Migrating from one pagination system to another
3. Missing index or optimization for offset queries
4. Metadata fetching is blocking (like failure #3)

### What Needs Fixing
This is a performance optimization task:
1. Profile where the time is spent
2. Implement pagination indexing if missing
3. Cache partial results
4. May need to implement lazy-load pagination
5. Verify metadata fetching isn't blocking

### Files to Inspect
- `tests/unit/RecentChangesHandler.migration.test.ts` - Performance test
- `src/resources/RecentChangesHandler.ts` - Handler implementation
- `src/utils/PaginationSystem.ts` - Pagination logic
- `src/utils/ResourceMetadataUtil.ts` - Metadata fetching (may be bottleneck)

### Investigation Steps
1. Add timing logs to see which step is slow
2. Check if pagination is iterating through all results
3. Verify cache is being used for recent files
4. Profile with large offsets (5000+)
5. May need to implement offset-indexed caching

### Performance Targets
- Small offset (0-100): <50ms ✓
- Medium offset (100-1000): <150ms (probably OK)
- Large offset (1000-10000): <200ms (currently failing at 5000)
- XL offset (10000+): <300ms (goal)

---

## Dependencies Between Failures

```
Failure #1, #2: Tag API Format Issues
├── Related: Both involve tag PATCH operations
├── Fix Order: Fix #2 first (real API), then #1 (tests)
└── Note: Dependency - if API format changes, both affected

Failure #3: Metadata Fetching Blocks Response
├── Related: May also affect #4 performance
├── Fix Order: Fix this before #4
└── Impact: Affects resource handler timeouts

Failure #4: Performance on Large Offsets
├── Related: May be caused by #3 (metadata fetching)
├── Fix Order: Fix #3 first, re-test #4
└── Note: If #3 unblocks, #4 might self-resolve
```

## Recommended Fix Order

1. **First**: Fix #3 (metadata fetching) - may unblock #4
2. **Second**: Retest #4 (performance) - may be fixed by #3
3. **Third**: Fix #2 (real API format) - understand actual API
4. **Fourth**: Fix #1 (test mocks) - align with API behavior

This order addresses root causes first before cosmetic fixes.

---

## Verification Checklist

Before considering baseline failures fixed:

- [ ] All 6 tests pass on `fix/baseline-test-failures` branch
- [ ] `npm test` shows: "Test Files  0 failed | X passed"
- [ ] `npm run build` succeeds with no errors
- [ ] No new test failures introduced
- [ ] Branch can be safely merged to main
- [ ] SDK migration work still passes on its branch
- [ ] No unrelated changes in the fix commit

---

## Resources for Investigation

### API Version Check
```bash
# In Obsidian REST API plugin settings
# Check version: Should be v4.1.0 or higher for batch tag support
```

### Test Running
```bash
# Run specific failing tests
npm test -- TagManagementClient.test.ts
npm test -- multi-tag-verification.test.ts
npm test -- resources-integration.test.ts
npm test -- RecentChangesHandler.migration.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Run with test output
npm test -- --reporter=verbose 2>&1 | tee test-output.log
```

### Debug Information
- Test output is preserved in worktree directory
- Each failure has clear error messages
- Timing information available for performance failures
- Stack traces show exact failure points

---

## Notes

- This is a **baseline** issue fix, not a regression fix
- These failures existed before SDK migration started
- Goal: Achieve true "green line" (all tests passing)
- Both worktrees are independent - fixes don't affect SDK migration
- After baseline fixes merge, SDK migration should rebase on clean main

