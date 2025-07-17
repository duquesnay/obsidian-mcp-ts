import { SimplifiedError } from '../types/errors.js';

interface RecoveryOptions {
  suggestion: string;
  workingAlternative?: string;
  example?: Record<string, unknown>;
}

interface AlternativeAction {
  description: string;
  tool?: string;
  example?: Record<string, unknown>;
}

interface MigrationOptions {
  suggestion?: string;
  workingAlternative?: string;
  example?: Record<string, unknown>;
  alternatives?: AlternativeAction[];
}

/**
 * Migrate old error handling patterns to simplified error structure
 */
export function migrateToSimplifiedError(
  error: Error | unknown,
  toolName: string,
  options: RecoveryOptions | MigrationOptions = {}
): SimplifiedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const result: SimplifiedError = {
    success: false,
    error: errorMessage,
    tool: toolName
  };

  // Handle RecoveryOptions pattern
  if ('suggestion' in options || 'workingAlternative' in options) {
    const parts = [];
    if (options.suggestion) parts.push(options.suggestion);
    if (options.workingAlternative) parts.push(options.workingAlternative);
    
    if (parts.length > 0) {
      result.suggestion = parts.join('. ');
    }
    
    if (options.example) {
      result.example = options.example;
    }
  }

  // Handle AlternativeAction array pattern
  if ('alternatives' in options && options.alternatives && options.alternatives.length > 0) {
    const altDescriptions = options.alternatives.map(alt => {
      let desc = alt.description;
      if (alt.tool) desc += ` (tool: ${alt.tool})`;
      return desc;
    });
    
    result.suggestion = `Alternative options: ${altDescriptions.join(', ')}`;
    
    // Use the first alternative's example if available
    const firstExample = options.alternatives.find(alt => alt.example)?.example;
    if (firstExample) {
      result.example = firstExample;
    }
  }

  return result;
}

/**
 * Create a simplified error response
 */
export function createSimplifiedError(
  error: string,
  toolName: string,
  suggestion?: string,
  example?: Record<string, unknown>
): SimplifiedError {
  const result: SimplifiedError = {
    success: false,
    error,
    tool: toolName
  };

  if (suggestion) result.suggestion = suggestion;
  if (example) result.example = example;

  return result;
}