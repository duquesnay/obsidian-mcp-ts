/**
 * Arguments for SimpleSearchTool
 */
export interface SimpleSearchArgs {
  /** Search query */
  query: string;
  
  /** Number of characters to include around each match (default: 100) */
  contextLength?: number;
  
  /** Maximum number of results to return (default: 50, max: 200) */
  limit?: number;
  
  /** Number of results to skip for pagination (default: 0) */
  offset?: number;
}