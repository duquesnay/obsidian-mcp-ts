import { FindEmptyDirectoriesArgs } from './types/FindEmptyDirectoriesArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import type { IObsidianClient } from '../obsidian/interfaces/IObsidianClient.js';

export class FindEmptyDirectoriesTool extends BaseTool<FindEmptyDirectoriesArgs> {
  name = 'obsidian_find_empty_directories';
  description = 'Find empty folders in Obsidian vault. Lists folders without notes.';
  
  metadata: ToolMetadata = {
    category: 'directory-operations',
    keywords: ['find', 'empty', 'directories', 'folders', 'cleanup'],
    version: '1.0.0'
  };
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      searchPath: {
        type: 'string',
        description: 'Path to search within (relative to vault root). Leave empty to search entire vault.'
      },
      includeHiddenFiles: {
        type: 'boolean',
        description: 'Whether to consider directories with only hidden files (like .DS_Store) as empty.',
        default: true
      }
    },
    required: []
  };

  async executeTyped(args: FindEmptyDirectoriesArgs): Promise<ToolResponse> {
    try {
      const client = this.getClient();
      const searchPath = args.searchPath || '';
      const includeHiddenFiles = args.includeHiddenFiles !== false;
      
      // Get all files and directories in the vault or specified path
      const allFiles = searchPath 
        ? await client.listFilesInDir(searchPath)
        : await client.listFilesInVault();
      
      // Extract unique directories from file paths
      const directories = new Set<string>();
      
      // Process all files to identify directories
      for (const file of allFiles) {
        if (file.endsWith('/')) {
          directories.add(file);
        } else {
          const lastSlash = file.lastIndexOf('/');
          if (lastSlash > -1) {
            const dir = file.substring(0, lastSlash + 1);
            directories.add(dir);
          }
        }
      }
      
      // Find empty directories by checking each directory directly
      const emptyDirectories: string[] = [];
      
      for (const dir of directories) {
        const isEmpty = await this.checkIfDirectoryEmpty(client, dir, includeHiddenFiles);
        if (isEmpty) {
          emptyDirectories.push(dir);
        }
      }
      
      // Sort directories for consistent output
      emptyDirectories.sort();
      
      return this.formatResponse({
        emptyDirectories,
        count: emptyDirectories.length,
        searchPath: searchPath || 'vault root',
        includeHiddenFiles
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check if a directory is empty based on the criteria
   */
  private async checkIfDirectoryEmpty(
    client: IObsidianClient,
    dir: string,
    includeHiddenFiles: boolean
  ): Promise<boolean> {
    try {
      const directListing = await client.listFilesInDir(dir);

      if (directListing.length === 0) {
        return true;
      }

      if (!includeHiddenFiles) {
        const nonHiddenFiles = directListing.filter(file => {
          const filename = file.split('/').pop() || file;
          return !filename.startsWith('.');
        });
        return nonHiddenFiles.length === 0;
      }

      return false;
    } catch (error) {
      // If we can't list the directory, it doesn't exist or is inaccessible
      return false;
    }
  }
}