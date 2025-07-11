import { BaseTool } from './base.js';

export class FindEmptyDirectoriesTool extends BaseTool {
  name = 'obsidian_find_empty_directories';
  description = 'Find all empty directories in your vault by scanning the directory structure and checking each directory for contents.';
  
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

  async executeTyped(args: { searchPath?: string; includeHiddenFiles?: boolean }): Promise<any> {
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
      
      for (const dir of directories) {
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
              emptyDirectories.push(dir);
            } else if (!includeHiddenFiles) {
              // Check if all files are hidden
              const nonHiddenFiles = directListing.filter(f => {
                const filename = f.split('/').pop() || f;
                return !filename.startsWith('.');
              });
              
              if (nonHiddenFiles.length === 0) {
                emptyDirectories.push(dir);
              }
            }
          } catch (error: any) {
            // If we get a 404, the directory might be empty
            if (error.message?.includes('404') || error.message?.includes('Not Found')) {
              // Verify it's actually a directory that exists
              const pathToCheck = dir.startsWith(searchPath) ? dir.substring(searchPath.length) : dir;
              const pathExists = await client.checkPathExists(pathToCheck);
              if (pathExists.exists && pathExists.type === 'directory') {
                emptyDirectories.push(dir);
              }
            }
          }
        } catch (error) {
          // Continue checking other directories
          continue;
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
}