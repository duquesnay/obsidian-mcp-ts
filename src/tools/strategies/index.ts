/**
 * Strategy pattern for edit operations
 * 
 * This module provides the foundation for refactoring UnifiedEditTool
 * to use the strategy pattern, making it more modular and testable.
 */

export type {
  // Core interfaces
  IEditStrategy,
  EditContext,
  EditResult,
  
  // Operation types
  EditOperation,
  EditOperationType,
  BaseEditOperation,
  AppendOperation,
  ReplaceOperation,
  HeadingInsertOperation,
  NewSectionOperation,
  BatchOperation
} from './IEditStrategy.js';

export { BaseEditStrategy } from './BaseEditStrategy.js';