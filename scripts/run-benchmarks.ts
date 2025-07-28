#!/usr/bin/env node

import { LRUCacheBenchmark } from '../src/benchmarks/LRUCache.benchmark.js';

async function runBenchmarks() {
  console.log('Starting LRU Cache benchmarks...\n');
  
  try {
    const lruBenchmark = new LRUCacheBenchmark();
    await lruBenchmark.runAll();
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks();
}