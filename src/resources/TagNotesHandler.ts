import { BaseResourceHandler } from './BaseResourceHandler.js';
import { ResourceErrorHandler } from '../utils/ResourceErrorHandler.js';
import { ResourceValidationUtil } from '../utils/ResourceValidationUtil.js';
import { ResourceMetadataUtil } from '../utils/ResourceMetadataUtil.js';

export class TagNotesHandler extends BaseResourceHandler {
  async handleRequest(uri: string, server?: any): Promise<any> {
    const tagName = this.extractTagParameter(uri);

    if (!tagName) {
      throw new Error('Tag name is required');
    }

    const client = this.getObsidianClient(server);

    try {
      // Get files with the specified tag
      const files = await client.getFilesByTag(tagName);

      // Fetch metadata for all files
      const metadataMap = await ResourceMetadataUtil.batchFetchMetadata(client, files);

      // Enhance files with metadata
      const filesWithMetadata = files.map(filepath => ({
        path: filepath,
        _meta: metadataMap.get(filepath) || null
      }));

      // Return the data in a consistent format
      return {
        tag: tagName,
        fileCount: files.length,
        files: filesWithMetadata
      };
    } catch (error: unknown) {
      ResourceErrorHandler.handle(error, 'Tag notes', tagName);
    }
  }
  
  private extractTagParameter(uri: string): string {
    const prefix = 'vault://tag/';
    const tagParam = ResourceValidationUtil.extractUriParameter(uri, prefix, 'tag');
    return ResourceValidationUtil.normalizeTagName(tagParam);
  }
}