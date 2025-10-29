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
 * Provides tag completions for vault resources
 *
 * Triggers on:
 * - vault://tag/{tagname}
 * - vault://search/{query} with tag: prefix
 *
 * Uses cached tags data (5min TTL) for fast completions.
 * Sorts by popularity (usage count descending).
 */
export class TagCompletionProvider implements CompletionProvider {
  readonly name = 'TagCompletionProvider';

  /**
   * Check if this provider handles the reference
   */
  canComplete(ref: CompletionReference, argument: CompletionArgument): boolean {
    // Only handle resource references with 'tagname' argument
    if (ref.type !== 'ref/resource') {
      return false;
    }

    // Match vault://tag/{tagname}
    const uri = ref.uri || '';
    if (uri.startsWith('vault://tag/') && argument.name === 'tagname') {
      return true;
    }

    // Could also match vault://search/{query} for tag: completions
    // but that's more complex - defer for now
    return false;
  }

  /**
   * Generate tag completions with prefix matching
   */
  async getCompletions(ref: CompletionReference, argument: CompletionArgument): Promise<string[]> {
    try {
      // Race with timeout
      return await Promise.race([
        this.fetchCompletions(argument.value),
        this.timeout(),
      ]);
    } catch (error) {
      console.error(`TagCompletionProvider error:`, error);
      return [];
    }
  }

  /**
   * Fetch completions from cached tags
   */
  private async fetchCompletions(partial: string): Promise<string[]> {
    // Get cached tags (5min TTL)
    const tagsResponse = await defaultCachedHandlers.tags.handleRequest('vault://tags');

    // Extract tag data
    const tags = tagsResponse.tags || [];

    // Normalize partial input (remove # if present)
    const normalizedPartial = partial.startsWith('#') ? partial.slice(1) : partial;

    // Filter and rank matches
    const matches = this.prefixMatch(tags, normalizedPartial);

    // Return top results (without # prefix)
    return matches.slice(0, MAX_COMPLETIONS);
  }

  /**
   * Prefix match tags and sort by popularity
   *
   * Matching strategy:
   * 1. Case-insensitive prefix match
   * 2. Sort by count (descending) - more popular tags first
   * 3. Within same count, alphabetical
   */
  private prefixMatch(tags: Array<{ name: string; count: number }>, partial: string): string[] {
    if (!partial) {
      // No input - return most popular tags
      return tags
        .sort((a, b) => {
          // Sort by count descending, then alphabetically
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.name.localeCompare(b.name);
        })
        .map(t => t.name)
        .slice(0, MAX_COMPLETIONS);
    }

    const lowerPartial = partial.toLowerCase();

    // Filter and score matches
    const matches = tags
      .filter(tag => {
        const lowerTag = tag.name.toLowerCase();
        return lowerTag.startsWith(lowerPartial) || lowerTag.includes(lowerPartial);
      })
      .map(tag => {
        const lowerTag = tag.name.toLowerCase();
        // Score: prefix match gets higher score + popularity bonus
        const prefixBonus = lowerTag.startsWith(lowerPartial) ? 10000 : 0;
        const positionBonus = lowerTag.startsWith(lowerPartial)
          ? 0
          : 5000 - lowerTag.indexOf(lowerPartial) * 10;
        const popularityBonus = tag.count;

        return {
          name: tag.name,
          score: prefixBonus + positionBonus + popularityBonus,
        };
      })
      .sort((a, b) => b.score - a.score);

    return matches.map(m => m.name);
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
