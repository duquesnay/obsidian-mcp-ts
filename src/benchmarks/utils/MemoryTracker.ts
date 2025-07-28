import { performance } from 'perf_hooks';

/**
 * Memory statistics captured at a point in time
 */
export interface MemoryStats {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number; // Resident Set Size
}

/**
 * Memory tracking result for a benchmark run
 */
export interface MemoryTrackingResult {
  initial: MemoryStats;
  peak: MemoryStats;
  final: MemoryStats;
  delta: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    rss: number;
  };
  samples: MemoryStats[];
  summary: {
    peakHeapUsed: number;
    avgHeapUsed: number;
    totalAllocated: number;
    gcRuns: number;
  };
}

/**
 * Utility class for tracking memory usage during benchmarks
 */
export class MemoryTracker {
  private samples: MemoryStats[] = [];
  private interval: NodeJS.Timeout | null = null;
  private gcRuns = 0;
  private initialStats: MemoryStats | null = null;
  
  /**
   * Capture current memory statistics
   */
  private captureMemoryStats(): MemoryStats {
    const mem = process.memoryUsage();
    return {
      timestamp: performance.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss
    };
  }
  
  /**
   * Start tracking memory usage
   * @param sampleInterval - How often to sample memory (ms)
   */
  start(sampleInterval = 100): void {
    // Force garbage collection before starting (if available)
    if (global.gc) {
      global.gc();
      this.gcRuns++;
    }
    
    // Clear any previous samples
    this.samples = [];
    this.gcRuns = 0;
    
    // Capture initial state
    this.initialStats = this.captureMemoryStats();
    this.samples.push(this.initialStats);
    
    // Start periodic sampling
    this.interval = setInterval(() => {
      this.samples.push(this.captureMemoryStats());
    }, sampleInterval);
  }
  
  /**
   * Stop tracking and return results
   */
  stop(): MemoryTrackingResult {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    // Capture final state
    const finalStats = this.captureMemoryStats();
    this.samples.push(finalStats);
    
    if (!this.initialStats) {
      throw new Error('MemoryTracker was not started');
    }
    
    // Find peak usage
    const peakStats = this.samples.reduce((peak, current) => 
      current.heapUsed > peak.heapUsed ? current : peak
    );
    
    // Calculate averages
    const avgHeapUsed = this.samples.reduce((sum, s) => sum + s.heapUsed, 0) / this.samples.length;
    
    // Calculate total allocated (sum of all heap increases)
    let totalAllocated = 0;
    for (let i = 1; i < this.samples.length; i++) {
      const increase = this.samples[i].heapUsed - this.samples[i - 1].heapUsed;
      if (increase > 0) {
        totalAllocated += increase;
      }
    }
    
    return {
      initial: this.initialStats,
      peak: peakStats,
      final: finalStats,
      delta: {
        heapUsed: finalStats.heapUsed - this.initialStats.heapUsed,
        heapTotal: finalStats.heapTotal - this.initialStats.heapTotal,
        external: finalStats.external - this.initialStats.external,
        arrayBuffers: finalStats.arrayBuffers - this.initialStats.arrayBuffers,
        rss: finalStats.rss - this.initialStats.rss
      },
      samples: this.samples,
      summary: {
        peakHeapUsed: peakStats.heapUsed,
        avgHeapUsed,
        totalAllocated,
        gcRuns: this.gcRuns
      }
    };
  }
  
  /**
   * Run a function while tracking memory usage
   */
  static async track<T>(
    fn: () => Promise<T>,
    sampleInterval = 100
  ): Promise<{ result: T; memory: MemoryTrackingResult }> {
    const tracker = new MemoryTracker();
    tracker.start(sampleInterval);
    
    try {
      const result = await fn();
      const memory = tracker.stop();
      return { result, memory };
    } catch (error) {
      tracker.stop(); // Ensure we stop tracking even on error
      throw error;
    }
  }
  
  /**
   * Format memory size for display
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  
  /**
   * Format memory tracking result for display
   */
  static formatResult(result: MemoryTrackingResult): string {
    const lines = [
      'Memory Usage:',
      `  Initial: ${MemoryTracker.formatBytes(result.initial.heapUsed)}`,
      `  Peak: ${MemoryTracker.formatBytes(result.peak.heapUsed)}`,
      `  Final: ${MemoryTracker.formatBytes(result.final.heapUsed)}`,
      `  Delta: ${result.delta.heapUsed >= 0 ? '+' : ''}${MemoryTracker.formatBytes(result.delta.heapUsed)}`,
      `  Average: ${MemoryTracker.formatBytes(result.summary.avgHeapUsed)}`,
      `  Total Allocated: ${MemoryTracker.formatBytes(result.summary.totalAllocated)}`,
      `  RSS Delta: ${result.delta.rss >= 0 ? '+' : ''}${MemoryTracker.formatBytes(result.delta.rss)}`
    ];
    
    if (result.summary.gcRuns > 0) {
      lines.push(`  GC Runs: ${result.summary.gcRuns}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate a memory profile chart (ASCII)
   */
  static generateChart(result: MemoryTrackingResult, width = 60, height = 10): string {
    if (result.samples.length < 2) return 'Not enough data for chart';
    
    const minHeap = Math.min(...result.samples.map(s => s.heapUsed));
    const maxHeap = Math.max(...result.samples.map(s => s.heapUsed));
    const range = maxHeap - minHeap;
    
    if (range === 0) return 'Memory usage was constant';
    
    // Normalize samples to fit in the chart
    const normalized = result.samples.map(s => 
      Math.round(((s.heapUsed - minHeap) / range) * (height - 1))
    );
    
    // Create the chart
    const chart: string[][] = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    );
    
    // Plot the data
    const step = Math.max(1, Math.floor(result.samples.length / width));
    for (let x = 0; x < width && x * step < normalized.length; x++) {
      const y = height - 1 - normalized[x * step];
      if (y >= 0 && y < height) {
        chart[y][x] = '█';
      }
    }
    
    // Add axis labels
    const lines = [
      `Memory Usage Over Time (${MemoryTracker.formatBytes(minHeap)} - ${MemoryTracker.formatBytes(maxHeap)})`,
      '─'.repeat(width + 2)
    ];
    
    // Add the chart
    for (let y = 0; y < height; y++) {
      lines.push('│' + chart[y].join('') + '│');
    }
    
    lines.push('└' + '─'.repeat(width) + '┘');
    lines.push(`  Start                                                End`);
    
    return lines.join('\n');
  }
}

/**
 * Decorator for adding memory tracking to benchmark methods
 */
export function trackMemory(sampleInterval = 100) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const tracker = new MemoryTracker();
      tracker.start(sampleInterval);
      
      try {
        const result = await originalMethod.apply(this, args);
        const memoryResult = tracker.stop();
        
        // Attach memory data to the result if it's an object
        if (result && typeof result === 'object') {
          result.memory = memoryResult;
        }
        
        return result;
      } catch (error) {
        tracker.stop();
        throw error;
      }
    };
    
    return descriptor;
  };
}