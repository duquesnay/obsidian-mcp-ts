#!/bin/bash

# Function to update a tool file
update_tool() {
    local file=$1
    local import_name=$2
    local class_name=$3
    
    # Add import
    sed -i '' "1s/^/import { ${import_name} } from '.\/types\/${import_name}.js';\n/" "$file"
    
    # Update class declaration
    sed -i '' "s/export class ${class_name} extends BaseTool {/export class ${class_name} extends BaseTool<${import_name}> {/" "$file"
    
    # Update executeTyped - this is tool-specific, so we'll do it manually
    echo "Updated $file"
}

# Update all remaining tools
update_tool "src/tools/CreateDirectoryTool.ts" "CreateDirectoryArgs" "CreateDirectoryTool"
update_tool "src/tools/CheckPathExistsTool.ts" "CheckPathExistsArgs" "CheckPathExistsTool"
update_tool "src/tools/MoveDirectoryTool.ts" "MoveDirectoryArgs" "MoveDirectoryTool"
update_tool "src/tools/GetRecentChangesTool.ts" "GetRecentChangesArgs" "GetRecentChangesTool"
update_tool "src/tools/DeleteDirectoryTool.ts" "DeleteDirectoryArgs" "DeleteDirectoryTool"
update_tool "src/tools/RenameFileTool.ts" "RenameFileArgs" "RenameFileTool"
update_tool "src/tools/GetFileFrontmatterTool.ts" "GetFileFrontmatterArgs" "GetFileFrontmatterTool"
update_tool "src/tools/GetFileFormattedTool.ts" "GetFileFormattedArgs" "GetFileFormattedTool"
update_tool "src/tools/ManageFileTagsTool.ts" "ManageFileTagsArgs" "ManageFileTagsTool"
update_tool "src/tools/BatchGetFileContentsTool.ts" "BatchGetFileContentsArgs" "BatchGetFileContentsTool"
update_tool "src/tools/CopyDirectoryTool.ts" "CopyDirectoryArgs" "CopyDirectoryTool"
update_tool "src/tools/FindEmptyDirectoriesTool.ts" "FindEmptyDirectoriesArgs" "FindEmptyDirectoriesTool"
update_tool "src/tools/MoveFileTool.ts" "MoveFileArgs" "MoveFileTool"
update_tool "src/tools/RenameTagTool.ts" "RenameTagArgs" "RenameTagTool"
update_tool "src/tools/GetFileMetadataTool.ts" "GetFileMetadataArgs" "GetFileMetadataTool"

# Complex tools
update_tool "src/tools/AdvancedSearchTool.ts" "AdvancedSearchArgs" "AdvancedSearchTool"
update_tool "src/tools/QueryStructureTool.ts" "QueryStructureArgs" "QueryStructureTool"
update_tool "src/tools/ComplexSearchTool.ts" "ComplexSearchArgs" "ComplexSearchTool"

echo "All tools updated with imports and class declarations!"
echo "Now manually update executeTyped signatures..."