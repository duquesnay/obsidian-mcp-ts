import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';

interface FolderStructure {
  files: string[];
  folders: { [key: string]: FolderStructure };
}

interface VaultStructureResponse {
  structure: FolderStructure;
  totalFiles: number;
  totalFolders: number;
  mode?: string;
  message?: string;
}

export class VaultStructureHandler extends BaseResourceHandler {
  private static readonly LARGE_VAULT_THRESHOLD = 5000;
  
  async handleRequest(uri: string, server?: any): Promise<VaultStructureResponse> {
    const client = this.getObsidianClient(server);
    
    try {
      // Parse query parameters for mode
      const url = new URL(uri, 'vault://');
      const mode = url.searchParams.get('mode') || 'full';
      const maxDepth = parseInt(url.searchParams.get('maxDepth') || '0') || 0;
      
      // Get all files in the vault
      const allFiles = await client.listFilesInVault();
      const totalFiles = allFiles.length;
      
      // For large vaults, default to summary mode unless explicitly requested
      const isLargeVault = totalFiles > VaultStructureHandler.LARGE_VAULT_THRESHOLD;
      const effectiveMode = isLargeVault && mode === 'full' ? 'summary' : mode;
      
      if (effectiveMode === 'summary') {
        // Return summary without building full structure
        const folderSet = new Set<string>();
        for (const filePath of allFiles) {
          const parts = filePath.split('/');
          for (let i = 1; i <= parts.length - 1; i++) {
            folderSet.add(parts.slice(0, i).join('/'));
          }
        }
        
        return {
          structure: {
            files: [],
            folders: { '...': { files: [`${totalFiles} files in vault`], folders: {} } }
          },
          totalFiles,
          totalFolders: folderSet.size,
          mode: 'summary',
          message: `Vault contains ${totalFiles} files. Use ?mode=full for complete structure.`
        };
      }
      
      // Build hierarchical structure with optional depth limit
      const structure = maxDepth > 0 
        ? this.buildHierarchicalStructureWithDepth(allFiles, maxDepth)
        : this.buildHierarchicalStructure(allFiles);
      
      // Count totals
      const totalFolders = this.countFolders(structure);
      
      return {
        structure,
        totalFiles,
        totalFolders
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Vault structure');
    }
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
}