import { describe, it, expect } from 'vitest';
import { OptimizedBatchProcessorBenchmark } from '../../src/benchmarks/OptimizedBatchProcessor.benchmark.js';

describe('OptimizedBatchProcessor Benchmark', () => {
  it('should create benchmark instance', () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    expect(benchmark).toBeDefined();
    expect(benchmark).toBeInstanceOf(OptimizedBatchProcessorBenchmark);
  });

  it('should run batch size benchmarks', async () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    
    // Mock console.log to prevent output during tests
    const originalLog = console.log;
    console.log = () => {};
    
    try {
      // Test that the method runs without throwing
      await expect(benchmark.benchmarkBatchSizes()).resolves.not.toThrow();
    } finally {
      console.log = originalLog;
    }
  }, 30000); // Allow 30 seconds for benchmark

  it('should run concurrency mode benchmarks', async () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    
    // Mock console.log to prevent output during tests
    const originalLog = console.log;
    console.log = () => {};
    
    try {
      await expect(benchmark.benchmarkConcurrencyModes()).resolves.not.toThrow();
    } finally {
      console.log = originalLog;
    }
  }, 30000);

  it('should run error handling benchmarks', async () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    
    // Mock console.log to prevent output during tests
    const originalLog = console.log;
    console.log = () => {};
    
    try {
      await expect(benchmark.benchmarkErrorHandling()).resolves.not.toThrow();
    } finally {
      console.log = originalLog;
    }
  }, 120000); // Allow 120 seconds for error handling tests with retries

  it('should run progress overhead benchmarks', async () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    
    // Mock console.log to prevent output during tests
    const originalLog = console.log;
    console.log = () => {};
    
    try {
      await expect(benchmark.benchmarkProgressOverhead()).resolves.not.toThrow();
    } finally {
      console.log = originalLog;
    }
  }, 30000);

  it('should run scalability benchmarks', async () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    
    // Mock console.log to prevent output during tests
    const originalLog = console.log;
    console.log = () => {};
    
    try {
      await expect(benchmark.benchmarkScalability()).resolves.not.toThrow();
    } finally {
      console.log = originalLog;
    }
  }, 60000); // Allow 60 seconds for large item counts

  it('should run streaming mode benchmarks', async () => {
    const benchmark = new OptimizedBatchProcessorBenchmark();
    
    // Mock console.log to prevent output during tests
    const originalLog = console.log;
    console.log = () => {};
    
    try {
      await expect(benchmark.benchmarkStreamingMode()).resolves.not.toThrow();
    } finally {
      console.log = originalLog;
    }
  }, 30000);
});