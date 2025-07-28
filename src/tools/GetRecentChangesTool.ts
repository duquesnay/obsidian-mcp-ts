import { GetRecentChangesArgs } from './types/GetRecentChangesArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { OBSIDIAN_DEFAULTS } from '../constants.js';
import { PAGINATION_SCHEMA } from '../utils/validation.js';
import { defaultCachedHandlers } from '../resources/CachedConcreteHandlers.js';
import { RecentChange } from '../types/obsidian.js';

// Interface for vault notes from the resource cache
interface VaultNote {
  path: string;
  title: string;
  modifiedAt: string; // ISO date string
  preview?: string;    // available in preview mode
  content?: string;    // available in full mode
}

interface RecentChangesResourceResponse {
  notes: VaultNote[];
  mode: 'preview' | 'full';
}

export class GetRecentChangesTool extends BaseTool<GetRecentChangesArgs> {
  name = 'obsidian_get_recent_changes';
  description = 'Get recently modified files in the vault with titles and previews. Uses vault://recent resource internally with 30 second caching for optimal performance.';
  
  metadata: ToolMetadata = {
    category: 'file-operations',
    keywords: ['recent', 'changes', 'modified', 'files', 'history'],
    version: '1.1.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      directory: {
        type: 'string',
        description: 'Specific directory to check for recent changes (optional).'
      },
      limit: {
        ...PAGINATION_SCHEMA.limit,
        default: OBSIDIAN_DEFAULTS.PAGE_SIZE
      },
      offset: PAGINATION_SCHEMA.offset,
      contentLength: {
        type: 'integer',
        description: 'Number of characters of content to include for each file.',
        default: OBSIDIAN_DEFAULTS.CONTEXT_LENGTH
      }
    },
    required: []
  };

  async executeTyped(args: GetRecentChangesArgs): Promise<ToolResponse> {
    try {
      // Use cached resource handler for 30-second caching performance benefit
      const resourceData: RecentChangesResourceResponse = await defaultCachedHandlers.recent.handleRequest('vault://recent');
      let notes: VaultNote[] = resourceData.notes;
      
      // Apply directory filtering if requested
      if (args.directory) {
        notes = this.filterNotesByDirectory(notes, args.directory);
      }
      
      // Determine if pagination is needed
      if (this.isPaginationRequested(args, notes.length)) {
        return this.createPaginatedResponse(notes, args);
      }
      
      // Return backward-compatible format for non-paginated response
      const recentChanges = this.convertToRecentChangesFormat(notes);
      return this.formatResponse(recentChanges);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private filterNotesByDirectory(notes: VaultNote[], directory: string): VaultNote[] {
    const dirPrefix = directory.endsWith('/') ? directory : `${directory}/`;
    return notes.filter(note => note.path.startsWith(dirPrefix));
  }

  private isPaginationRequested(args: GetRecentChangesArgs, totalNotes: number): boolean {
    const hasOffset = args.offset !== undefined && args.offset > 0;
    const hasLimitLessThanTotal = args.limit !== undefined && args.limit < totalNotes;
    return hasOffset || hasLimitLessThanTotal;
  }

  private createPaginatedResponse(notes: VaultNote[], args: GetRecentChangesArgs): ToolResponse {
    const totalNotes = notes.length;
    const limit = args.limit || totalNotes;
    const offset = args.offset || 0;
    
    const paginatedNotes = notes.slice(offset, offset + limit);
    const hasMore = offset + limit < totalNotes;
    
    return this.formatResponse({
      notes: paginatedNotes,
      totalNotes,
      hasMore,
      limit,
      offset,
      nextOffset: hasMore ? offset + limit : undefined
    });
  }

  private convertToRecentChangesFormat(notes: VaultNote[]): any[] {
    // Convert resource format to enhanced format with preview/title support
    return notes.map(note => {
      const result: any = {
        path: note.path,
        mtime: new Date(note.modifiedAt).getTime()
      };
      
      // Include title and preview/content from the resource
      if (note.title) {
        result.title = note.title;
      }
      
      if (note.preview !== undefined) {
        result.preview = note.preview;
      }
      
      if (note.content !== undefined) {
        result.content = note.content;
      }
      
      return result;
    });
  }
}