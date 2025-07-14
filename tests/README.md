# Test Structure

This directory contains tests organized by their purpose and scope.

## Test Categories

### Unit Tests (`tests/unit/`)
Test individual components in isolation using mocks and stubs. Fast, reliable, and run in CI.

**Examples:**
- `retryLogic.test.ts` - Tests retry utility functions with simulated errors
- `SimpleAppendTool.test.ts` - Tests tool interface and error handling with mocked ObsidianClient
- `tool-consolidation-unit.test.ts` - Tests tool architecture and interfaces without API calls

**Characteristics:**
- ✅ No external dependencies
- ✅ Fast execution (milliseconds)
- ✅ Deterministic results
- ✅ Run in CI/CD pipelines
- ❌ Don't test real network behavior
- ❌ Don't catch integration issues

### Integration Tests (`tests/integration/`)
Test how components work together with real external systems. Slower, requires setup, may be flaky.

**Examples:**
- `obsidian-api-integration.test.ts` - Tests against real Obsidian REST API
- `end-to-end-workflow.test.ts` - Tests complete user workflows (if created)

**Characteristics:**
- ✅ Test real network behavior
- ✅ Catch integration issues
- ✅ Validate against actual API
- ❌ Require external setup (Obsidian running)
- ❌ Slower execution (seconds)
- ❌ May be flaky due to network issues
- ❌ Need environment variables (API keys)

### E2E Tests (`tests/e2e/`)
Test complete user workflows from end to end, often using real applications and data.

## Running Tests

### All Unit Tests (Fast)
```bash
npm test tests/unit/
```

### All Integration Tests (Requires Setup)
```bash
# Requires Obsidian running with REST API plugin
export OBSIDIAN_API_KEY=your_api_key
npm test tests/integration/
```

### Specific Test Files
```bash
npm test tests/unit/retryLogic.test.ts
npm test tests/integration/obsidian-api-integration.test.ts
```

### Watch Mode for Development
```bash
npm test -- --watch tests/unit/
```

## Integration Test Requirements

To run integration tests:

1. **Install Obsidian**
2. **Install Local REST API plugin**
3. **Start Obsidian with a test vault** (never use production data!)
4. **Generate API key** in plugin settings
5. **Set environment variable**: `export OBSIDIAN_API_KEY=your_key`
6. **Run tests**: `npm test tests/integration/`

## Test Naming Conventions

- `*.test.ts` - Standard test files
- `*-unit.test.ts` - Explicitly unit tests (when distinction matters)
- `*-integration.test.ts` - True integration tests requiring external systems
- `*-e2e.test.ts` - End-to-end tests

## CI/CD Considerations

- **Unit tests**: Always run in CI
- **Integration tests**: Optional in CI, require setup
- **E2E tests**: Usually run in dedicated environments

## Adding New Tests

### For Unit Tests:
1. Mock external dependencies
2. Test one component at a time
3. Focus on edge cases and error conditions
4. Ensure fast execution

### For Integration Tests:
1. Document setup requirements
2. Handle missing dependencies gracefully
3. Clean up resources after tests
4. Test realistic scenarios

### Example Test Classifications:

**✅ Unit Test**: Testing retry logic with simulated network errors
**❌ Not Unit**: Testing retry logic against real Obsidian API

**✅ Integration Test**: Testing ObsidianClient against real REST API
**❌ Not Integration**: Testing ObsidianClient with mocked axios calls

**✅ E2E Test**: Complete workflow from MCP tool call to Obsidian file creation
**❌ Not E2E**: Testing individual tool methods