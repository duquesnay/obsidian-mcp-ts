import { ObsidianClient } from '../src/obsidian/ObsidianClient.js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const API_KEY = process.env.OBSIDIAN_API_KEY || '';
const HOST = process.env.OBSIDIAN_HOST || '127.0.0.1';

console.log('Using API Key:', API_KEY ? 'Set' : 'Not set');

async function testEmptyDirectories() {
  const client = new ObsidianClient({
    apiKey: API_KEY,
    host: HOST,
    verifySsl: false
  });

  console.log('Testing Empty Directory Detection\n');

  // Test 1: List all files in vault to see directory structure
  console.log('Test 1: Listing all files in vault...');
  try {
    const allFiles = await client.listFilesInVault();
    const directories = allFiles.filter(f => f.endsWith('/'));
    console.log(`Found ${directories.length} directories:`);
    directories.slice(0, 10).forEach(d => console.log(`  - ${d}`));
    console.log('');
  } catch (error) {
    console.error('Error listing vault files:', error);
  }

  // Test 2: Try to list files in a potentially empty directory
  const testDirs = ['empty-test/', 'Archive/', 'Templates/', 'test-empty/'];
  
  for (const dir of testDirs) {
    console.log(`Test 2: Checking directory "${dir}"...`);
    try {
      const files = await client.listFilesInDir(dir);
      console.log(`  Result: ${files.length} files found`);
      if (files.length === 0) {
        console.log('  -> Directory exists but is empty!');
      } else {
        console.log(`  -> Contains: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
      }
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.log('  -> Directory not found (might be empty or non-existent)');
      } else {
        console.log(`  -> Error: ${error.message}`);
      }
    }
    console.log('');
  }

  // Test 3: Check path existence for directories
  console.log('Test 3: Using checkPathExists for directories...');
  for (const dir of testDirs) {
    try {
      const result = await client.checkPathExists(dir);
      console.log(`  ${dir}: exists=${result.exists}, type=${result.type}`);
    } catch (error: any) {
      console.log(`  ${dir}: Error - ${error.message}`);
    }
  }
}

// Run the test
testEmptyDirectories().catch(console.error);