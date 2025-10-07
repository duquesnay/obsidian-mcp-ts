/**
 * MimeTypeDetector - Utility for detecting file types and MIME types
 *
 * Determines whether files are binary or text based on extension,
 * and provides appropriate MIME type mappings for various file formats.
 */

export class MimeTypeDetector {
  /**
   * Extension to MIME type mapping for supported binary formats
   */
  private static readonly MIME_TYPES: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',

    // PDF
    'pdf': 'application/pdf',

    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',

    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
  };

  /**
   * Set of file extensions considered binary
   */
  private static readonly BINARY_EXTENSIONS = new Set(
    Object.keys(MimeTypeDetector.MIME_TYPES)
  );

  /**
   * Determines if a file is binary based on its extension
   *
   * @param filepath - Path to the file (can be relative or absolute)
   * @returns true if file is binary, false if text
   */
  static isBinaryFile(filepath: string): boolean {
    const extension = this.getExtension(filepath);
    return this.BINARY_EXTENSIONS.has(extension);
  }

  /**
   * Gets the MIME type for a file based on its extension
   *
   * @param filepath - Path to the file (can be relative or absolute)
   * @returns MIME type string (defaults to 'application/octet-stream' for unknown types)
   */
  static getMimeType(filepath: string): string {
    const extension = this.getExtension(filepath);
    return this.MIME_TYPES[extension] || 'application/octet-stream';
  }

  /**
   * Extracts the file extension from a filepath (case-insensitive)
   *
   * @param filepath - Path to the file
   * @returns lowercase extension without the dot
   */
  private static getExtension(filepath: string): string {
    const match = filepath.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  }
}
