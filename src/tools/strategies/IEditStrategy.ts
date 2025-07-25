import type { IObsidianClient } from '../../obsidian/interfaces/IObsidianClient.js';

/**
 * Edit operation types supported by the strategy pattern
 */
export type EditOperationType = 
  | 'append'
  | 'replace'
  | 'heading-insert'
  | 'new-section'
  | 'batch';

/**
 * Base interface for all edit operations
 */
export interface BaseEditOperation {
  type: EditOperationType;
}

/**
 * Append operation - adds content to the end of a file
 */
export interface AppendOperation extends BaseEditOperation {
  type: 'append';
  content: string;
}

/**
 * Replace operation - finds and replaces text in a file
 */
export interface ReplaceOperation extends BaseEditOperation {
  type: 'replace';
  find: string;
  replace: string;
}

/**
 * Heading insert operation - inserts content before or after a heading
 */
export interface HeadingInsertOperation extends BaseEditOperation {
  type: 'heading-insert';
  position: 'before' | 'after';
  heading: string;
  content: string;
}

/**
 * New section operation - creates a new section in the document
 */
export interface NewSectionOperation extends BaseEditOperation {
  type: 'new-section';
  title: string;
  at: 'start' | 'end' | string; // string for heading name
  content?: string;
}

/**
 * Batch operation - performs multiple edit operations in sequence
 */
export interface BatchOperation extends BaseEditOperation {
  type: 'batch';
  operations: EditOperation[];
}

/**
 * Union type of all possible edit operations
 */
export type EditOperation = 
  | AppendOperation 
  | ReplaceOperation 
  | HeadingInsertOperation 
  | NewSectionOperation 
  | BatchOperation;

/**
 * Context provided to edit strategies for execution
 */
export interface EditContext {
  filepath: string;
  client: IObsidianClient;
}

/**
 * Result returned by edit strategies
 */
export interface EditResult {
  success: boolean;
  message?: string;
  error?: string;
  operation?: string;
  filepath?: string;
  suggestion?: string;
  working_alternative?: {
    description: string;
    example: Record<string, any>;
  };
  batch_results?: {
    total_operations: number;
    successful: number;
    failed: number;
    results: any[];
    errors?: any[];
  };
  // Additional properties for specific operation types
  find?: string;
  replace?: string;
  heading?: string;
  section?: string;
  possible_causes?: string[];
  [key: string]: any; // Allow additional properties for extensibility
}

/**
 * Interface for edit strategy implementations
 */
export interface IEditStrategy {
  /**
   * Determines if this strategy can handle the given operation
   */
  canHandle(operation: EditOperation): Promise<boolean>;

  /**
   * Executes the edit operation
   */
  execute(operation: EditOperation, context: EditContext): Promise<EditResult>;
}