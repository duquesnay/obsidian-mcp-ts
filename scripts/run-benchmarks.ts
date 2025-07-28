#!/usr/bin/env node

import { LRUCacheBenchmark } from '../src/benchmarks/LRUCache.benchmark.js';
import { OptimizedBatchProcessorBenchmark } from '../src/benchmarks/OptimizedBatchProcessor.benchmark.js';
import { RequestDeduplicatorBenchmark } from '../src/benchmarks/RequestDeduplicator.benchmark.js';

async function runBenchmarks() {
  console.log('🚀 Running All Performance Benchmarks with Memory Tracking\n');
  console.log('=' . repeat(80));
  console.log('\nNOTE: For accurate memory measurements, run with --expose-gc flag:');
  console.log('node --expose-gc scripts/run-benchmarks.js\n');
  console.log('=' . repeat(80));
  
  const benchmarks = [
    {
      name: 'LRU Cache',
      runner: new LRUCacheBenchmark()
    },
    {
      name: 'Optimized Batch Processor',
      runner: new OptimizedBatchProcessorBenchmark()
    },
    {
      name: 'Request Deduplicator',
      runner: new RequestDeduplicatorBenchmark()
    }
  ];
  
  // Check if we can force GC for more accurate memory measurements
  if (global.gc) {
    console.log('✅ Garbage collection available for accurate memory tracking\n');
  } else {
    console.log('⚠️  Garbage collection not available. Memory measurements may be less accurate.\n');
  }
  
  for (const benchmark of benchmarks) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Starting ${benchmark.name} benchmarks...`);
      console.log(`${'='.repeat(80)}`);
      
      // Force GC before each benchmark suite if available
      if (global.gc) {
        global.gc();
      }
      
      await benchmark.runner.runAll();
      
      // Small delay between benchmarks
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error running ${benchmark.name} benchmarks:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All benchmarks completed!');
  console.log('='.repeat(80));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}