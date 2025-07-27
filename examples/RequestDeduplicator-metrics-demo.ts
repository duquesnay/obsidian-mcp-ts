/**
 * RequestDeduplicator Metrics Demo
 * 
 * This script demonstrates the metrics logging functionality of RequestDeduplicator.
 * Run with: npx tsx examples/RequestDeduplicator-metrics-demo.ts
 */

import { RequestDeduplicator } from '../src/utils/RequestDeduplicator.js';

async function simulateApiCall(url: string, delay: number = 100): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return `Response from ${url}`;
}

async function demonstrateMetrics() {
  console.log('🚀 RequestDeduplicator Metrics Demo\n');

  // Create deduplicator with metrics logging enabled
  const deduplicator = new RequestDeduplicator(5000, { 
    enableMetricsLogging: true,
    logLevel: 'info'
  });

  console.log('📊 Initial metrics:');
  deduplicator.logMetrics();
  console.log('');

  // Simulate various scenarios
  console.log('🔄 Scenario 1: Single requests (should be all misses)');
  await deduplicator.dedupe('api1', () => simulateApiCall('/api/users/1'));
  await deduplicator.dedupe('api2', () => simulateApiCall('/api/users/2'));
  await deduplicator.dedupe('api3', () => simulateApiCall('/api/users/3'));
  
  deduplicator.logMetrics();
  console.log('');

  console.log('🔄 Scenario 2: Concurrent identical requests (should show hits)');
  const promises = [
    deduplicator.dedupe('concurrent1', () => simulateApiCall('/api/data', 200)),
    deduplicator.dedupe('concurrent1', () => simulateApiCall('/api/data', 200)), // Hit
    deduplicator.dedupe('concurrent1', () => simulateApiCall('/api/data', 200)), // Hit
    deduplicator.dedupe('concurrent2', () => simulateApiCall('/api/other', 150)),
    deduplicator.dedupe('concurrent2', () => simulateApiCall('/api/other', 150)), // Hit
  ];

  await Promise.all(promises);
  
  console.log('After concurrent requests:');
  deduplicator.logMetrics();
  console.log('');

  console.log('🔄 Scenario 3: Mix of new and repeated requests');
  await deduplicator.dedupe('new1', () => simulateApiCall('/api/new1'));
  await deduplicator.dedupe('new2', () => simulateApiCall('/api/new2'));
  
  console.log('Final metrics:');
  deduplicator.logMetrics();
  
  // Show manual stats inspection
  console.log('');
  console.log('📈 Manual stats inspection:');
  const stats = deduplicator.getStats();
  console.log(`  Total requests: ${stats.totalRequests}`);
  console.log(`  Hits: ${stats.hits} (${(stats.hitRate * 100).toFixed(1)}%)`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Average response time: ${stats.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Active requests: ${stats.activeRequests}`);

  // Reset and show
  console.log('');
  console.log('🔄 Resetting metrics...');
  deduplicator.resetStats();
  deduplicator.logMetrics();
}

// Run the demo
demonstrateMetrics().catch(console.error);