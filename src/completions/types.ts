/**
 * Reference to a resource template or prompt for completion
 */
export interface CompletionReference {
  /** Type of reference */
  type: 'ref/resource' | 'ref/prompt';
  /** URI or URI template (for resources) */
  uri?: string;
  /** Name (for prompts) */
  name?: string;
}

/**
 * Argument information for completion
 */
export interface CompletionArgument {
  /** Argument name (e.g., 'path', 'tagname') */
  name: string;
  /** Current value being typed */
  value: string;
}

/**
 * Completion request parameters
 */
export interface CompletionRequest {
  /** Reference to the resource template or prompt */
  ref: CompletionReference;
  /** Argument being completed */
  argument: CompletionArgument;
}

/**
 * Completion result
 */
export interface CompletionResult {
  completion: {
    /** Array of completion values (max 100) */
    values: string[];
    /** Total number available (optional) */
    total?: number;
    /** Whether more results exist (optional) */
    hasMore?: boolean;
  };
}

/**
 * Provider interface for generating completions
 */
export interface CompletionProvider {
  /** Provider name for debugging */
  readonly name: string;

  /**
   * Check if this provider can handle the given reference and argument
   * @param ref - Reference to resource template or prompt
   * @param argument - Argument being completed
   * @returns true if this provider can generate completions
   */
  canComplete(ref: CompletionReference, argument: CompletionArgument): boolean;

  /**
   * Generate completion suggestions
   * @param ref - Reference to resource template or prompt
   * @param argument - Argument being completed
   * @returns Array of completion values (max 20)
   */
  getCompletions(ref: CompletionReference, argument: CompletionArgument): Promise<string[]>;
}
