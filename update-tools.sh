#!/bin/bash

echo "Updating tools to use extracted types..."

# CopyFileTool
sed -i.bak '1s/^/import { CopyFileArgs } from '\''\.\/types\/CopyFileArgs\.js'\'';\n/' src/tools/CopyFileTool.ts
sed -i.bak 's/export class CopyFileTool extends BaseTool {/export class CopyFileTool extends BaseTool<CopyFileArgs> {/' src/tools/CopyFileTool.ts
sed -i.bak 's/async executeTyped(args: { sourcePath: string; destinationPath: string; overwrite?: boolean })/async executeTyped(args: CopyFileArgs)/' src/tools/CopyFileTool.ts

# CreateDirectoryTool
sed -i.bak '1s/^/import { CreateDirectoryArgs } from '\''\.\/types\/CreateDirectoryArgs\.js'\'';\n/' src/tools/CreateDirectoryTool.ts
sed -i.bak 's/export class CreateDirectoryTool extends BaseTool {/export class CreateDirectoryTool extends BaseTool<CreateDirectoryArgs> {/' src/tools/CreateDirectoryTool.ts
sed -i.bak 's/async executeTyped(args: { directoryPath: string; createParents?: boolean })/async executeTyped(args: CreateDirectoryArgs)/' src/tools/CreateDirectoryTool.ts

# CheckPathExistsTool
sed -i.bak '1s/^/import { CheckPathExistsArgs } from '\''\.\/types\/CheckPathExistsArgs\.js'\'';\n/' src/tools/CheckPathExistsTool.ts
sed -i.bak 's/export class CheckPathExistsTool extends BaseTool {/export class CheckPathExistsTool extends BaseTool<CheckPathExistsArgs> {/' src/tools/CheckPathExistsTool.ts
sed -i.bak 's/async executeTyped(args: { path: string })/async executeTyped(args: CheckPathExistsArgs)/' src/tools/CheckPathExistsTool.ts

# MoveDirectoryTool
sed -i.bak '1s/^/import { MoveDirectoryArgs } from '\''\.\/types\/MoveDirectoryArgs\.js'\'';\n/' src/tools/MoveDirectoryTool.ts
sed -i.bak 's/export class MoveDirectoryTool extends BaseTool {/export class MoveDirectoryTool extends BaseTool<MoveDirectoryArgs> {/' src/tools/MoveDirectoryTool.ts
sed -i.bak 's/async executeTyped(args: { sourcePath: string; destinationPath: string })/async executeTyped(args: MoveDirectoryArgs)/' src/tools/MoveDirectoryTool.ts

# GetRecentChangesTool
sed -i.bak '1s/^/import { GetRecentChangesArgs } from '\''\.\/types\/GetRecentChangesArgs\.js'\'';\n/' src/tools/GetRecentChangesTool.ts
sed -i.bak 's/export class GetRecentChangesTool extends BaseTool {/export class GetRecentChangesTool extends BaseTool<GetRecentChangesArgs> {/' src/tools/GetRecentChangesTool.ts
# Fix multiline executeTyped signature
perl -i -0pe 's/async executeTyped\(args: \{\s*directory\?: string;\s*limit\?: number;\s*offset\?: number;\s*contentLength\?: number;\s*\}\)/async executeTyped(args: GetRecentChangesArgs)/s' src/tools/GetRecentChangesTool.ts

# DeleteDirectoryTool
sed -i.bak '1s/^/import { DeleteDirectoryArgs } from '\''\.\/types\/DeleteDirectoryArgs\.js'\'';\n/' src/tools/DeleteDirectoryTool.ts
sed -i.bak 's/export class DeleteDirectoryTool extends BaseTool {/export class DeleteDirectoryTool extends BaseTool<DeleteDirectoryArgs> {/' src/tools/DeleteDirectoryTool.ts
sed -i.bak 's/async executeTyped(args: { directoryPath: string; recursive?: boolean; permanent?: boolean })/async executeTyped(args: DeleteDirectoryArgs)/' src/tools/DeleteDirectoryTool.ts

# RenameFileTool
sed -i.bak '1s/^/import { RenameFileArgs } from '\''\.\/types\/RenameFileArgs\.js'\'';\n/' src/tools/RenameFileTool.ts
sed -i.bak 's/export class RenameFileTool extends BaseTool {/export class RenameFileTool extends BaseTool<RenameFileArgs> {/' src/tools/RenameFileTool.ts
sed -i.bak 's/async executeTyped(args: { oldPath: string; newPath: string })/async executeTyped(args: RenameFileArgs)/' src/tools/RenameFileTool.ts

# GetFileFrontmatterTool
sed -i.bak '1s/^/import { GetFileFrontmatterArgs } from '\''\.\/types\/GetFileFrontmatterArgs\.js'\'';\n/' src/tools/GetFileFrontmatterTool.ts
sed -i.bak 's/export class GetFileFrontmatterTool extends BaseTool {/export class GetFileFrontmatterTool extends BaseTool<GetFileFrontmatterArgs> {/' src/tools/GetFileFrontmatterTool.ts
sed -i.bak 's/async executeTyped(args: { filepath: string })/async executeTyped(args: GetFileFrontmatterArgs)/' src/tools/GetFileFrontmatterTool.ts

# GetFileFormattedTool
sed -i.bak '1s/^/import { GetFileFormattedArgs } from '\''\.\/types\/GetFileFormattedArgs\.js'\'';\n/' src/tools/GetFileFormattedTool.ts
sed -i.bak 's/export class GetFileFormattedTool extends BaseTool {/export class GetFileFormattedTool extends BaseTool<GetFileFormattedArgs> {/' src/tools/GetFileFormattedTool.ts
sed -i.bak "s/async executeTyped(args: { filepath: string; format: 'plain' | 'html' | 'content' })/async executeTyped(args: GetFileFormattedArgs)/" src/tools/GetFileFormattedTool.ts

# ManageFileTagsTool
sed -i.bak '1s/^/import { ManageFileTagsArgs } from '\''\.\/types\/ManageFileTagsArgs\.js'\'';\n/' src/tools/ManageFileTagsTool.ts
sed -i.bak 's/export class ManageFileTagsTool extends BaseTool {/export class ManageFileTagsTool extends BaseTool<ManageFileTagsArgs> {/' src/tools/ManageFileTagsTool.ts
# Fix multiline executeTyped signature
perl -i -0pe 's/async executeTyped\(args: \{\s*filePath: string;\s*operation: '\''add'\'' \| '\''remove'\'';\s*tags: string\[\];\s*location\?: '\''frontmatter'\'' \| '\''inline'\'' \| '\''both'\'';\s*\}\)/async executeTyped(args: ManageFileTagsArgs)/s' src/tools/ManageFileTagsTool.ts

# BatchGetFileContentsTool
sed -i.bak '1s/^/import { BatchGetFileContentsArgs } from '\''\.\/types\/BatchGetFileContentsArgs\.js'\'';\n/' src/tools/BatchGetFileContentsTool.ts
sed -i.bak 's/export class BatchGetFileContentsTool extends BaseTool {/export class BatchGetFileContentsTool extends BaseTool<BatchGetFileContentsArgs> {/' src/tools/BatchGetFileContentsTool.ts
sed -i.bak 's/async executeTyped(args: { filepaths: string\[\]; page?: number; pageSize?: number })/async executeTyped(args: BatchGetFileContentsArgs)/' src/tools/BatchGetFileContentsTool.ts

# CopyDirectoryTool
sed -i.bak '1s/^/import { CopyDirectoryArgs } from '\''\.\/types\/CopyDirectoryArgs\.js'\'';\n/' src/tools/CopyDirectoryTool.ts
sed -i.bak 's/export class CopyDirectoryTool extends BaseTool {/export class CopyDirectoryTool extends BaseTool<CopyDirectoryArgs> {/' src/tools/CopyDirectoryTool.ts
sed -i.bak 's/async executeTyped(args: { sourcePath: string; destinationPath: string; overwrite?: boolean })/async executeTyped(args: CopyDirectoryArgs)/' src/tools/CopyDirectoryTool.ts

# FindEmptyDirectoriesTool
sed -i.bak '1s/^/import { FindEmptyDirectoriesArgs } from '\''\.\/types\/FindEmptyDirectoriesArgs\.js'\'';\n/' src/tools/FindEmptyDirectoriesTool.ts
sed -i.bak 's/export class FindEmptyDirectoriesTool extends BaseTool {/export class FindEmptyDirectoriesTool extends BaseTool<FindEmptyDirectoriesArgs> {/' src/tools/FindEmptyDirectoriesTool.ts
sed -i.bak 's/async executeTyped(args: { searchPath?: string; includeHiddenFiles?: boolean })/async executeTyped(args: FindEmptyDirectoriesArgs)/' src/tools/FindEmptyDirectoriesTool.ts

# MoveFileTool
sed -i.bak '1s/^/import { MoveFileArgs } from '\''\.\/types\/MoveFileArgs\.js'\'';\n/' src/tools/MoveFileTool.ts
sed -i.bak 's/export class MoveFileTool extends BaseTool {/export class MoveFileTool extends BaseTool<MoveFileArgs> {/' src/tools/MoveFileTool.ts
sed -i.bak 's/async executeTyped(args: { sourcePath: string; destinationPath: string })/async executeTyped(args: MoveFileArgs)/' src/tools/MoveFileTool.ts

# RenameTagTool
sed -i.bak '1s/^/import { RenameTagArgs } from '\''\.\/types\/RenameTagArgs\.js'\'';\n/' src/tools/RenameTagTool.ts
sed -i.bak 's/export class RenameTagTool extends BaseTool {/export class RenameTagTool extends BaseTool<RenameTagArgs> {/' src/tools/RenameTagTool.ts
sed -i.bak 's/async executeTyped(args: { oldTagName: string; newTagName: string })/async executeTyped(args: RenameTagArgs)/' src/tools/RenameTagTool.ts

# GetFileMetadataTool
sed -i.bak '1s/^/import { GetFileMetadataArgs } from '\''\.\/types\/GetFileMetadataArgs\.js'\'';\n/' src/tools/GetFileMetadataTool.ts
sed -i.bak 's/export class GetFileMetadataTool extends BaseTool {/export class GetFileMetadataTool extends BaseTool<GetFileMetadataArgs> {/' src/tools/GetFileMetadataTool.ts
sed -i.bak 's/async executeTyped(args: { filepath: string })/async executeTyped(args: GetFileMetadataArgs)/' src/tools/GetFileMetadataTool.ts

# Clean up backup files
rm src/tools/*.bak

echo "Tools updated successfully!"