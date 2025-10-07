import { ChildProcess } from 'child_process';

/**
 * Properly terminate a child process to prevent zombies
 *
 * This function ensures that:
 * 1. Process receives SIGTERM for graceful shutdown
 * 2. Waits for process to actually exit
 * 3. Force kills with SIGKILL if it doesn't exit within timeout
 * 4. Prevents zombie processes that eat memory and CPU
 *
 * @param server The child process to terminate
 * @param timeout Maximum time to wait for graceful exit (default: 2000ms)
 */
export async function terminateServer(server: ChildProcess | null, timeout = 2000): Promise<void> {
  if (!server) return;

  console.log('🛑 Shutting down test server...');

  // Send SIGTERM first for graceful shutdown
  server.kill('SIGTERM');

  // Wait for process to exit (with timeout)
  await new Promise<void>((resolve) => {
    const timeoutHandle = setTimeout(() => {
      // Force kill if still running after timeout
      if (server && !server.killed) {
        console.warn('⚠️  Server did not exit gracefully, force killing...');
        server.kill('SIGKILL');
      }
      resolve();
    }, timeout);

    server.on('exit', () => {
      clearTimeout(timeoutHandle);
      resolve();
    });

    // Also handle if process was already dead
    if (server.killed || server.exitCode !== null) {
      clearTimeout(timeoutHandle);
      resolve();
    }
  });
}
