import { FindEmptyDirectoriesArgs } from './types/FindEmptyDirectoriesArgs.js';
import { BaseTool, ToolMetadata, ToolResponse } from './base.js';
import { getErrorMessage } from '../utils/errorTypeGuards.js';
import type { IObsidianClient } from '../obsidian/interfaces/IObsidianClient.js';

export class FindEmptyDirectoriesTool extends BaseTool<FindEmptyDirectoriesArgs> {
  name = 'obsidian_find_empty_directories';
  description = 'Find empty folders in Obsidian vault (vault-only - NOT filesystem scanning). Lists folders without notes.';
  
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
      const filesInDirectories = new Map<string, string[]>();
      
      // Process all files to build directory structure
      for (const file of allFiles) {
        // Prepend searchPath if we're searching within a specific path
        const fullPath = searchPath && !file.startsWith(searchPath) 
          ? searchPath + file 
          : file;
          
        if (fullPath.endsWith('/')) {
          // This is a directory listing
          directories.add(fullPath);
        } else {
          // Extract directory path from file
          const lastSlash = fullPath.lastIndexOf('/');
          if (lastSlash > -1) {
            const dir = fullPath.substring(0, lastSlash + 1);
            directories.add(dir);
            
            // Track files in each directory
            if (!filesInDirectories.has(dir)) {
              filesInDirectories.set(dir, []);
            }
            filesInDirectories.get(dir)!.push(fullPath.substring(lastSlash + 1));
          }
        }
      }
      
      // Find empty directories
      const emptyDirectories: string[] = [];
      
      // For large directory sets (>500), use streaming approach with batch processor
      const dirsArray = Array.from(directories);
      if (dirsArray.length > 500) {
        const { OptimizedBatchProcessor } = await import('../utils/OptimizedBatchProcessor.js');
        const processor = new OptimizedBatchProcessor({
          maxConcurrency: 10,
          retryAttempts: 2
        });
        
        // Process directories in streaming mode
        for await (const result of processor.processStream(dirsArray, async (dir) => {
          return await this.checkIfDirectoryEmpty(client, dir, searchPath, filesInDirectories, includeHiddenFiles);
        })) {
          if (!result.error && result.result?.isEmpty) {
            emptyDirectories.push(result.result.directory);
          }
        }
      } else {
        // For smaller sets, use regular iteration
        for (const dir of directories) {
          const result = await this.checkIfDirectoryEmpty(client, dir, searchPath, filesInDirectories, includeHiddenFiles);
          if (result.isEmpty) {
            emptyDirectories.push(result.directory);
          }
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
    searchPath: string,
    filesInDirectories: Map<string, string[]>,
    includeHiddenFiles: boolean
  ): Promise<{ isEmpty: boolean; directory: string }> {
    try {
      // Check if directory has any files
      const filesInDir = filesInDirectories.get(dir) || [];
      
      // If we're not including hidden files, filter them out
      const relevantFiles = includeHiddenFiles 
        ? filesInDir 
        : filesInDir.filter(f => !f.startsWith('.'));
      
      // Also check by listing the directory directly
      try {
        const directoryToCheck = dir.startsWith(searchPath) ? dir.substring(searchPath.length) : dir;
        const directListing = await client.listFilesInDir(directoryToCheck);
        
        // If we get an empty array, it's empty
        if (directListing.length === 0) {
          return { isEmpty: true, directory: dir };
        } else if (!includeHiddenFiles) {
          // Check if all files are hidden
          const nonHiddenFiles = directListing.filter(f => {
            const filename = f.split('/').pop() || f;
            return !filename.startsWith('.');
          });
          
          if (nonHiddenFiles.length === 0) {
            return { isEmpty: true, directory: dir };
          }
        }
      } catch (error: unknown) {
        // If we get a 404, the directory might be empty
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          // Verify it's actually a directory that exists
          const pathToCheck = dir.startsWith(searchPath) ? dir.substring(searchPath.length) : dir;
          const pathExists = await client.checkPathExists(pathToCheck);
          if (pathExists.exists && pathExists.type === 'directory') {
            return { isEmpty: true, directory: dir };
          }
        }
      }
      
      return { isEmpty: false, directory: dir };
    } catch (error) {
      // If there's an error checking a specific directory, consider it not empty
      return { isEmpty: false, directory: dir };
    }
  }
}