#!/bin/bash

# Create type files for remaining tools

# CopyFileTool
cat > src/tools/types/CopyFileArgs.ts << 'EOF'
/**
 * Arguments for the CopyFile tool
 */
export interface CopyFileArgs {
  /**
   * Path of the file to copy (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the copied file (relative to vault root)
   */
  destinationPath: string;
  /**
   * Whether to overwrite the destination file if it already exists (default: false)
   */
  overwrite?: boolean;
}
EOF

# CreateDirectoryTool
cat > src/tools/types/CreateDirectoryArgs.ts << 'EOF'
/**
 * Arguments for the CreateDirectory tool
 */
export interface CreateDirectoryArgs {
  /**
   * Path of the directory to create (relative to vault root)
   */
  directoryPath: string;
  /**
   * Whether to create parent directories if they do not exist (default: true)
   */
  createParents?: boolean;
}
EOF

# CheckPathExistsTool
cat > src/tools/types/CheckPathExistsArgs.ts << 'EOF'
/**
 * Arguments for the CheckPathExists tool
 */
export interface CheckPathExistsArgs {
  /**
   * Path to check for existence (relative to vault root)
   */
  path: string;
}
EOF

# MoveDirectoryTool
cat > src/tools/types/MoveDirectoryArgs.ts << 'EOF'
/**
 * Arguments for the MoveDirectory tool
 */
export interface MoveDirectoryArgs {
  /**
   * Current path of the directory to move (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the directory (relative to vault root)
   */
  destinationPath: string;
}
EOF

# GetRecentChangesTool
cat > src/tools/types/GetRecentChangesArgs.ts << 'EOF'
/**
 * Arguments for the GetRecentChanges tool
 */
export interface GetRecentChangesArgs {
  /**
   * Specific directory to check for recent changes (optional)
   */
  directory?: string;
  /**
   * Maximum number of files to return
   */
  limit?: number;
  /**
   * Number of files to skip
   */
  offset?: number;
  /**
   * Number of characters of content to include for each file
   */
  contentLength?: number;
}
EOF

# DeleteDirectoryTool
cat > src/tools/types/DeleteDirectoryArgs.ts << 'EOF'
/**
 * Arguments for the DeleteDirectory tool
 */
export interface DeleteDirectoryArgs {
  /**
   * Path of the directory to delete (relative to vault root)
   */
  directoryPath: string;
  /**
   * Whether to delete directory and all its contents recursively (default: false)
   */
  recursive?: boolean;
  /**
   * Permanently delete directory instead of moving to trash (default: false)
   */
  permanent?: boolean;
}
EOF

# RenameFileTool
cat > src/tools/types/RenameFileArgs.ts << 'EOF'
/**
 * Arguments for the RenameFile tool
 */
export interface RenameFileArgs {
  /**
   * Current path of the file to rename (relative to vault root)
   */
  oldPath: string;
  /**
   * New path for the file (relative to vault root). Must be in the same directory as the old path.
   */
  newPath: string;
}
EOF

# GetFileFrontmatterTool
cat > src/tools/types/GetFileFrontmatterArgs.ts << 'EOF'
/**
 * Arguments for the GetFileFrontmatter tool
 */
export interface GetFileFrontmatterArgs {
  /**
   * Path to file to get frontmatter from (relative to vault root)
   */
  filepath: string;
}
EOF

# GetFileFormattedTool
cat > src/tools/types/GetFileFormattedArgs.ts << 'EOF'
/**
 * Arguments for the GetFileFormatted tool
 */
export interface GetFileFormattedArgs {
  /**
   * Path to file to retrieve (relative to vault root)
   */
  filepath: string;
  /**
   * Format to retrieve: plain (markdown stripped), html (rendered), content (default markdown)
   */
  format: 'plain' | 'html' | 'content';
}
EOF

# ManageFileTagsTool
cat > src/tools/types/ManageFileTagsArgs.ts << 'EOF'
/**
 * Arguments for the ManageFileTags tool
 */
export interface ManageFileTagsArgs {
  /**
   * Path to the file to modify (relative to vault root)
   */
  filePath: string;
  /**
   * Whether to add or remove tags
   */
  operation: 'add' | 'remove';
  /**
   * Array of tags to add or remove (with or without # prefix)
   */
  tags: string[];
  /**
   * Where to add/remove tags (default: frontmatter)
   */
  location?: 'frontmatter' | 'inline' | 'both';
}
EOF

# BatchGetFileContentsTool
cat > src/tools/types/BatchGetFileContentsArgs.ts << 'EOF'
/**
 * Arguments for the BatchGetFileContents tool
 */
export interface BatchGetFileContentsArgs {
  /**
   * Array of paths to get contents from (relative to vault root)
   */
  filepaths: string[];
  /**
   * Page number (0-based) for pagination. Optional.
   */
  page?: number;
  /**
   * Number of files per page. Defaults to 10. Optional.
   */
  pageSize?: number;
}
EOF

# CopyDirectoryTool
cat > src/tools/types/CopyDirectoryArgs.ts << 'EOF'
/**
 * Arguments for the CopyDirectory tool
 */
export interface CopyDirectoryArgs {
  /**
   * Path of the directory to copy (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the copied directory (relative to vault root)
   */
  destinationPath: string;
  /**
   * Whether to overwrite existing files in the destination (default: false)
   */
  overwrite?: boolean;
}
EOF

# FindEmptyDirectoriesTool
cat > src/tools/types/FindEmptyDirectoriesArgs.ts << 'EOF'
/**
 * Arguments for the FindEmptyDirectories tool
 */
export interface FindEmptyDirectoriesArgs {
  /**
   * Path to search within (relative to vault root). Leave empty to search entire vault.
   */
  searchPath?: string;
  /**
   * Whether to consider directories with only hidden files (like .DS_Store) as empty
   */
  includeHiddenFiles?: boolean;
}
EOF

# MoveFileTool
cat > src/tools/types/MoveFileArgs.ts << 'EOF'
/**
 * Arguments for the MoveFile tool
 */
export interface MoveFileArgs {
  /**
   * Current path of the file to move (relative to vault root)
   */
  sourcePath: string;
  /**
   * Destination path for the file (relative to vault root).
   * Can be in a different directory and/or have a different filename.
   */
  destinationPath: string;
}
EOF

# RenameTagTool
cat > src/tools/types/RenameTagArgs.ts << 'EOF'
/**
 * Arguments for the RenameTag tool
 */
export interface RenameTagArgs {
  /**
   * The current tag name to rename (with or without # prefix)
   */
  oldTagName: string;
  /**
   * The new tag name (with or without # prefix)
   */
  newTagName: string;
}
EOF

# GetFileMetadataTool
cat > src/tools/types/GetFileMetadataArgs.ts << 'EOF'
/**
 * Arguments for the GetFileMetadata tool
 */
export interface GetFileMetadataArgs {
  /**
   * Path to file to get metadata from (relative to vault root)
   */
  filepath: string;
}
EOF

echo "Type files created successfully!"