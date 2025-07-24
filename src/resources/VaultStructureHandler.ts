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
}

export class VaultStructureHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<VaultStructureResponse> {
    const client = this.getObsidianClient(server);
    
    try {
      // Get all files in the vault
      const allFiles = await client.listFilesInVault();
      
      // Build hierarchical structure
      const structure = this.buildHierarchicalStructure(allFiles);
      
      // Count totals
      const totalFiles = allFiles.length;
      const totalFolders = this.countFolders(structure);
      
      return {
        structure,
        totalFiles,
        totalFolders
      };
    } catch (error: any) {
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
}