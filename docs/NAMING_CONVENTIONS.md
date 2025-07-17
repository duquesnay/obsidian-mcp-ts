# Naming Conventions

## Overview
This document outlines the naming conventions used in the Obsidian MCP TypeScript project to ensure consistency and clarity across the codebase.

## General Principles
- **Clarity**: Names should clearly convey purpose
- **Consistency**: Similar concepts should have similar names
- **No Redundancy**: Avoid repeating context in names

## File Naming
- **Tools**: `{Action}{Target}Tool.ts` (e.g., `GetFileContentsTool.ts`)
- **Types**: `{Context}Args.ts` for argument types (e.g., `SimpleSearchArgs.ts`)
- **Utils**: `{functionality}.ts` in lowercase (e.g., `pathValidator.ts`)
- **Tests**: `{TestedFile}.test.ts` (e.g., `ObsidianClient.test.ts`)

## Class Naming
- **Tools**: `{Action}{Target}Tool` (e.g., `ListFilesInVaultTool`)
  - Note: The "Tool" suffix is redundant when context is clear but kept for MCP compatibility
- **Errors**: `{Context}Error` (e.g., `ObsidianError`)
- **Utils**: `{Functionality}{Type}` (e.g., `BatchProcessor`, `ConfigLoader`)

## Interface/Type Naming
- **Arguments**: `{ToolName}Args` (e.g., `AppendContentArgs`)
- **Responses**: `{Context}Response` (e.g., `ToolResponse`, `ErrorResponse`)
- **Metadata**: `{Entity}Metadata` (e.g., `ToolMetadata`, `FileMetadata`)
- **Options**: `{Context}Options` (e.g., `SearchOptions`)

## Method Naming
- **Actions**: verb + noun (e.g., `getFileContents`, `validatePath`)
- **Handlers**: `handle{Event}` (e.g., `handleError`, `handleSimplifiedError`)
- **Validators**: `validate{Target}` (e.g., `validatePath`, `validatePaths`)
- **Formatters**: `format{Target}` (e.g., `formatResponse`)
- **Executors**: `execute` for public API, `executeTyped` for type-safe internal

## Variable Naming
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `OBSIDIAN_DEFAULTS`)
- **Variables**: `camelCase` (e.g., `filePath`, `contextLength`)
- **Private fields**: `_camelCase` or just `camelCase` (we use the latter)
- **Booleans**: `is/has/should` prefix (e.g., `isTestEnvironment`, `hasMetadata`)

## Tool Names (MCP Protocol)
- **Format**: `obsidian_{action}_{target}` in snake_case
- **Examples**:
  - `obsidian_list_files_in_vault`
  - `obsidian_simple_search`
  - `obsidian_append_content`
- **Note**: These are protocol-level names, not class names

## Enum Naming
- **Enum**: `PascalCase` (e.g., `ToolCategory`, `ErrorCode`)
- **Values**: Based on context
  - String enums: `kebab-case` (e.g., `'file-operations'`)
  - Numeric enums: `UPPER_SNAKE_CASE`

## Examples of Good vs Bad Naming

### Good ✅
```typescript
class GetFileContentsTool        // Clear action + target
interface AppendContentArgs      // Clear purpose
const OBSIDIAN_DEFAULTS         // Clear constant
function validatePath()         // Clear action
```

### Bad ❌
```typescript
class FileTool                  // Too generic
interface Args                  // No context
const defaults                  // Should be uppercase
function check()               // Unclear what it checks
```

## Migration Notes
- The "Tool" suffix in class names is considered redundant but kept for:
  - Backward compatibility
  - Discovery mechanism relies on `*Tool.ts` pattern
  - Clear differentiation from other classes
- Method naming pattern is intentional:
  - `execute()` - public interface method (required by MCP)
  - `executeTyped()` - type-safe implementation (better DX)
- Decision: Keep "Tool" suffix to avoid breaking changes
- Decision: Keep execute/executeTyped pattern for type safety