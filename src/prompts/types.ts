/**
 * Types for MCP prompt templates
 */

/**
 * Definition of a prompt template for MCP ListPrompts response
 */
export interface PromptDefinition {
  /** Unique identifier for the prompt */
  name: string;
  /** Human-readable description of what the prompt does */
  description: string;
  /** Optional list of arguments the prompt accepts */
  arguments?: PromptArgument[];
}

/**
 * Argument specification for a prompt template
 */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Description of the argument's purpose */
  description: string;
  /** Whether this argument is required */
  required: boolean;
}

/**
 * Message in a prompt response (MCP PromptMessage format)
 */
export interface PromptMessage {
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Message content */
  content: {
    /** Content type (always 'text' for prompts) */
    type: 'text';
    /** The actual text content */
    text: string;
  };
}

/**
 * Result of generating a prompt (MCP GetPromptResult format)
 */
export interface PromptResult {
  /** Description of the generated prompt */
  description?: string;
  /** Array of messages forming the prompt */
  messages: PromptMessage[];
}
