#!/bin/bash

# Script to run all benchmarks with memory tracking

echo "🚀 Running All Performance Benchmarks with Memory Tracking"
echo "=========================================================="
echo ""

# Build the project first
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Exiting."
    exit 1
fi

echo ""
echo "Starting benchmarks with garbage collection enabled for accurate memory tracking..."
echo ""

# Run the unified benchmark runner with GC exposed
node --expose-gc dist/scripts/run-benchmarks.js

# Alternative: Run individual benchmarks
# echo ""
# echo "=== LRU Cache Benchmark ==="
# node --expose-gc dist/benchmarks/LRUCache.benchmark.js
# 
# echo ""
# echo "=== Request Deduplicator Benchmark ==="
# node --expose-gc dist/benchmarks/RequestDeduplicator.benchmark.js
# 
# echo ""
# echo "=== OptimizedBatchProcessor Benchmark ==="
# node --expose-gc dist/benchmarks/OptimizedBatchProcessor.benchmark.js

echo ""
echo "✅ All benchmarks completed!"