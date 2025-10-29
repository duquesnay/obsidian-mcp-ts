import { CompletionProvider, CompletionReference, CompletionArgument } from '../types.js';
import { defaultCachedHandlers } from '../../resources/CachedConcreteHandlers.js';

/**
 * Maximum number of completion results to return
 */
const MAX_COMPLETIONS = 20;

/**
 * Timeout for completion requests (ms)
 */
const COMPLETION_TIMEOUT_MS = 500;

/**
 * Provides file path completions for vault resources
 *
 * Triggers on:
 * - vault://note/{path}
 * - vault://folder/{path}
 *
 * Uses cached structure data (5min TTL) for fast completions.
 */
export class FilePathCompletionProvider implements CompletionProvider {
  readonly name = 'FilePathCompletionProvider';

  /**
   * Check if this provider handles the reference
   */
  canComplete(ref: CompletionReference, argument: CompletionArgument): boolean {
    // Only handle resource references with 'path' argument
    if (ref.type !== 'ref/resource' || argument.name !== 'path') {
      return false;
    }

    // Match vault://note/{path} or vault://folder/{path}
    const uri = ref.uri || '';
    return uri.startsWith('vault://note/') || uri.startsWith('vault://folder/');
  }

  /**
   * Generate file path completions with fuzzy matching
   */
  async getCompletions(ref: CompletionReference, argument: CompletionArgument): Promise<string[]> {
    try {
      // Race with timeout
      return await Promise.race([
        this.fetchCompletions(argument.value),
        this.timeout(),
      ]);
    } catch (error) {
      console.error(`FilePathCompletionProvider error:`, error);
      return [];
    }
  }

  /**
   * Fetch completions from cached structure
   */
  private async fetchCompletions(partial: string): Promise<string[]> {
    // Get cached structure (5min TTL)
    const structureResponse = await defaultCachedHandlers.structure.handleRequest('vault://structure?mode=full');

    // Extract file paths from hierarchical structure
    const allPaths = this.extractPaths(structureResponse.structure || {});

    // Filter and rank matches
    const matches = this.fuzzyMatch(allPaths, partial);

    // Return top results
    return matches.slice(0, MAX_COMPLETIONS);
  }

  /**
   * Extract all file paths from hierarchical structure
   */
  private extractPaths(structure: any, prefix: string = ''): string[] {
    const paths: string[] = [];

    if (!structure || typeof structure !== 'object') {
      return paths;
    }

    for (const [key, value] of Object.entries(structure)) {
      const currentPath = prefix ? `${prefix}/${key}` : key;

      if (value === null) {
        // Leaf node (file)
        paths.push(currentPath);
      } else if (typeof value === 'object') {
        // Directory - recurse
        paths.push(...this.extractPaths(value, currentPath));
      }
    }

    return paths;
  }

  /**
   * Fuzzy match paths against partial input
   *
   * Matching strategy:
   * 1. Exact prefix match (highest priority)
   * 2. Contains match (case-insensitive)
   * 3. Fuzzy character sequence match
   */
  private fuzzyMatch(paths: string[], partial: string): string[] {
    if (!partial) {
      // No input - return recent/common files (alphabetical for now)
      return paths.sort().slice(0, MAX_COMPLETIONS);
    }

    const lowerPartial = partial.toLowerCase();
    const scored: Array<{ path: string; score: number }> = [];

    for (const path of paths) {
      const lowerPath = path.toLowerCase();
      let score = 0;

      // Exact prefix match (highest score)
      if (lowerPath.startsWith(lowerPartial)) {
        score = 1000 + (1000 - path.length); // Prefer shorter paths
      }
      // Contains match
      else if (lowerPath.includes(lowerPartial)) {
        const index = lowerPath.indexOf(lowerPartial);
        score = 500 + (1000 - index); // Prefer earlier matches
      }
      // Fuzzy match (consecutive characters)
      else {
        const fuzzyScore = this.fuzzyScore(lowerPath, lowerPartial);
        if (fuzzyScore > 0) {
          score = fuzzyScore;
        }
      }

      if (score > 0) {
        scored.push({ path, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.path);
  }

  /**
   * Calculate fuzzy match score for consecutive character matching
   */
  private fuzzyScore(text: string, pattern: string): number {
    let patternIdx = 0;
    let score = 0;
    let consecutiveMatches = 0;

    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        patternIdx++;
        consecutiveMatches++;
        score += consecutiveMatches * 10; // Bonus for consecutive matches
      } else {
        consecutiveMatches = 0;
      }
    }

    // All characters must match
    return patternIdx === pattern.length ? score : 0;
  }

  /**
   * Timeout promise
   */
  private timeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Completion timeout')), COMPLETION_TIMEOUT_MS);
    });
  }
}
