import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';

/**
 * Response modes for vault://structure resource
 * 
 * - summary: Default mode. Returns minimal structure with file/folder counts (optimal performance)
 * - preview: Returns folder structure with file counts but no individual file names
 * - full: Returns complete hierarchical structure with all files and folders
 * 
 * Large vaults (>5000 files) automatically use summary mode for performance.
 * 
 * Usage:
 * - vault://structure (defaults to summary)
 * - vault://structure?mode=preview
 * - vault://structure?mode=full
 */
type ResponseMode = 'summary' | 'preview' | 'full';

const RESPONSE_MODES: Record<string, ResponseMode> = {
  SUMMARY: 'summary',
  PREVIEW: 'preview', 
  FULL: 'full'
} as const;

interface FolderStructure {
  files: string[];
  folders: { [key: string]: FolderStructure };
}

interface PreviewFolderStructure {
  fileCount: number;
  folders: { [key: string]: PreviewFolderStructure };
}

interface VaultStructureResponse {
  structure?: FolderStructure | PreviewFolderStructure;
  totalFiles: number;
  totalFolders?: number;
  mode?: ResponseMode;
  message?: string;
  // Pagination mode properties
  paginatedFiles?: string[];
  hasMore?: boolean;
  limit?: number;
  offset?: number;
  nextUri?: string;
}

export class VaultStructureHandler extends BaseResourceHandler {
  private static readonly LARGE_VAULT_THRESHOLD = 5000;
  
  async handleRequest(uri: string, server?: any): Promise<VaultStructureResponse> {
    const client = this.getObsidianClient(server);
    
    try {
      // Parse query parameters for mode and pagination
      const url = new URL(uri, 'vault://');
      const modeParam = url.searchParams.get('mode') || RESPONSE_MODES.SUMMARY;
      const maxDepth = parseInt(url.searchParams.get('maxDepth') || '0') || 0;
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      const legacyMode = url.searchParams.get('legacy') === 'true';
      
      // Check if pagination is requested (limit or offset parameters present)
      const isPaginationRequested = (limitParam !== null || offsetParam !== null) && !legacyMode;
      
      if (isPaginationRequested) {
        // Use pagination mode - return flat file list with pagination metadata
        return this.handlePaginatedRequest(client, limitParam, offsetParam, url);
      }
      
      // Validate and set mode (default to summary for invalid modes)
      const validModes: ResponseMode[] = Object.values(RESPONSE_MODES);
      const mode: ResponseMode = validModes.includes(modeParam as ResponseMode) 
        ? (modeParam as ResponseMode) 
        : RESPONSE_MODES.SUMMARY;
      
      // Get all files in the vault
      const allFiles = await client.listFilesInVault();
      const totalFiles = allFiles.length;
      
      // For large vaults, force summary mode for performance
      const isLargeVault = totalFiles > VaultStructureHandler.LARGE_VAULT_THRESHOLD;
      const effectiveMode: ResponseMode = isLargeVault && mode === RESPONSE_MODES.FULL ? RESPONSE_MODES.SUMMARY : mode;
      
      // Calculate total folders
      const folderSet = new Set<string>();
      for (const filePath of allFiles) {
        const parts = filePath.split('/');
        for (let i = 1; i <= parts.length - 1; i++) {
          folderSet.add(parts.slice(0, i).join('/'));
        }
      }
      const totalFolders = folderSet.size;
      
      if (effectiveMode === RESPONSE_MODES.SUMMARY) {
        return {
          structure: {
            files: [],
            folders: { '...': { files: [`${totalFiles} files in vault`], folders: {} } }
          },
          totalFiles,
          totalFolders,
          mode: RESPONSE_MODES.SUMMARY,
          message: `Vault contains ${totalFiles} files. Use ?mode=full for complete structure.`
        };
      }
      
      if (effectiveMode === RESPONSE_MODES.PREVIEW) {
        const previewStructure = this.buildPreviewStructure(allFiles);
        return {
          structure: previewStructure,
          totalFiles,
          totalFolders,
          mode: RESPONSE_MODES.PREVIEW
        };
      }
      
      // Full mode - build complete hierarchical structure
      const structure = maxDepth > 0 
        ? this.buildHierarchicalStructureWithDepth(allFiles, maxDepth)
        : this.buildHierarchicalStructure(allFiles);
      
      return {
        structure,
        totalFiles,
        totalFolders,
        mode: RESPONSE_MODES.FULL
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Vault structure');
    }
  }
  
  private buildPreviewStructure(filePaths: string[]): PreviewFolderStructure {
    const root: PreviewFolderStructure = {
      fileCount: 0,
      folders: {}
    };
    
    for (const filePath of filePaths) {
      const pathParts = filePath.split('/');
      
      if (pathParts.length === 1) {
        // Root level file
        root.fileCount++;
      } else {
        // File in nested folder(s)
        const folderParts = pathParts.slice(0, -1);
        let currentLevel = root;
        
        // Navigate/create folder structure
        for (const folderName of folderParts) {
          if (!currentLevel.folders[folderName]) {
            currentLevel.folders[folderName] = {
              fileCount: 0,
              folders: {}
            };
          }
          currentLevel = currentLevel.folders[folderName];
        }
        
        // Count file in the deepest folder
        currentLevel.fileCount++;
      }
    }
    
    return root;
  }

  private buildHierarchicalStructure(filePaths: string[]): FolderStructure {
    const root: FolderStructure = {
      files: [],
      folders: {}
    };
    
    for (const filePath of filePaths) {
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      if (pathParts.length === 1) {
        // Root level file
        root.files.push(fileName);
      } else {
        // File in nested folder(s)
        const folderParts = pathParts.slice(0, -1);
        let currentLevel = root;
        
        // Navigate/create folder structure
        for (const folderName of folderParts) {
          if (!currentLevel.folders[folderName]) {
            currentLevel.folders[folderName] = {
              files: [],
              folders: {}
            };
          }
          currentLevel = currentLevel.folders[folderName];
        }
        
        // Add file to the deepest folder
        currentLevel.files.push(fileName);
      }
    }
    
    return root;
  }
  
  private countFolders(structure: FolderStructure): number {
    let count = 0;
    
    for (const folderName in structure.folders) {
      count++; // Count this folder
      count += this.countFolders(structure.folders[folderName]); // Count nested folders
    }
    
    return count;
  }
  
  private buildHierarchicalStructureWithDepth(filePaths: string[], maxDepth: number): FolderStructure {
    const root: FolderStructure = {
      files: [],
      folders: {}
    };
    
    for (const filePath of filePaths) {
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      if (pathParts.length === 1) {
        // Root level file
        root.files.push(fileName);
      } else {
        // File in nested folder(s)
        const folderParts = pathParts.slice(0, -1);
        const effectiveFolderParts = folderParts.slice(0, maxDepth);
        let currentLevel = root;
        
        // Navigate/create folder structure up to maxDepth
        for (let i = 0; i < effectiveFolderParts.length; i++) {
          const folderName = effectiveFolderParts[i];
          if (!currentLevel.folders[folderName]) {
            currentLevel.folders[folderName] = {
              files: [],
              folders: {}
            };
          }
          currentLevel = currentLevel.folders[folderName];
        }
        
        // If we reached max depth but there are more folders, indicate truncation
        if (folderParts.length > maxDepth) {
          if (!currentLevel.folders['...']) {
            currentLevel.folders['...'] = {
              files: [],
              folders: {}
            };
          }
          currentLevel.folders['...'].files.push(`${folderParts.length - maxDepth} more levels...`);
        } else {
          // Add file to the deepest folder
          currentLevel.files.push(fileName);
        }
      }
    }
    
    return root;
  }
  
  private async handlePaginatedRequest(client: any, limitParam: string | null, offsetParam: string | null, url: URL): Promise<VaultStructureResponse> {
    // Get all files in the vault
    const allFiles = await client.listFilesInVault();
    const totalFiles = allFiles.length;
    
    // Parse pagination parameters
    const defaultLimit = 50; // Default limit for pagination mode
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : defaultLimit;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;
    
    // Apply pagination to the flat file list
    const startIndex = offset;
    const endIndex = Math.min(startIndex + limit, totalFiles);
    const paginatedFiles = allFiles.slice(startIndex, endIndex);
    const hasMore = endIndex < totalFiles;
    
    // Generate nextUri if there are more results
    let nextUri: string | undefined;
    if (hasMore) {
      const nextOffset = endIndex;
      const nextUrl = new URL(url);
      nextUrl.searchParams.set('limit', limit.toString());
      nextUrl.searchParams.set('offset', nextOffset.toString());
      nextUri = nextUrl.toString();
    }
    
    // Get mode for mixed pagination + mode requests
    const modeParam = url.searchParams.get('mode');
    const validModes: ResponseMode[] = Object.values(RESPONSE_MODES);
    const mode: ResponseMode | undefined = validModes.includes(modeParam as ResponseMode) 
      ? (modeParam as ResponseMode) 
      : undefined;
    
    return {
      paginatedFiles,
      totalFiles,
      hasMore,
      limit,
      offset,
      nextUri,
      mode // Include mode if specified (for mixed pagination + mode requests)
    };
  }
}