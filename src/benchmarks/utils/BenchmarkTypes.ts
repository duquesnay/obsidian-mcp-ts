import { MemoryTrackingResult } from './MemoryTracker.js';

/**
 * Common benchmark result structure with memory tracking
 */
export interface BenchmarkResult {
  name: string;
  duration: number;
  opsPerSecond: number;
  memory?: MemoryTrackingResult;
  [key: string]: any; // Allow additional metrics
}

/**
 * Extended benchmark result for cache benchmarks
 */
export interface CacheBenchmarkResult extends BenchmarkResult {
  totalOperations: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageOperationTime: number;
}

/**
 * Extended benchmark result for batch processor benchmarks
 */
export interface BatchProcessorBenchmarkResult extends BenchmarkResult {
  batchSize: number;
  totalItems: number;
  throughput: number;
  successRate: number;
  avgRetries: number;
  concurrency: number;
  errors: number;
}

/**
 * Extended benchmark result for deduplicator benchmarks
 */
export interface DeduplicatorBenchmarkResult extends BenchmarkResult {
  totalRequests: number;
  uniqueRequests: number;
  deduplicatedRequests: number;
  deduplicationRate: number;
  avgResponseTime: number;
}