import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    // Load environment variables from .env file
    env: loadEnv('test', process.cwd(), ''),
    // Prevent orphan processes by setting global timeout
    testTimeout: 10000, // 10 seconds default timeout
    hookTimeout: 10000, // 10 seconds for setup/teardown hooks

    // Use threads pool with explicit settings to prevent zombies
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        maxThreads: 8,
        minThreads: 1
      }
    },

    // Ensure proper cleanup on exit
    teardownTimeout: 5000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.config.ts'
      ]
    },
    environment: 'node'
  }
});