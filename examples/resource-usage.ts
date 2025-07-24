/**
 * Example: Using MCP Resources with Obsidian
 * 
 * This example demonstrates how to use the various resources
 * available through the obsidian-mcp-ts server.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  // Initialize MCP client
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['obsidian-mcp-ts'],
    env: {
      OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY
    }
  });

  const client = new Client({
    name: 'obsidian-resource-example',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);

  try {
    // 1. List all available resources
    console.log('=== Available Resources ===');
    const { resources } = await client.listResources();
    resources.forEach(resource => {
      console.log(`${resource.uri} - ${resource.description}`);
    });

    // 2. Get vault statistics
    console.log('\n=== Vault Statistics ===');
    const statsResponse = await client.readResource({ uri: 'vault://stats' });
    const stats = JSON.parse(statsResponse.contents[0].text);
    console.log(`Total notes: ${stats.totalNotes}`);
    console.log(`Total files: ${stats.totalFiles}`);

    // 3. Get all tags
    console.log('\n=== Vault Tags ===');
    const tagsResponse = await client.readResource({ uri: 'vault://tags' });
    const { tags } = JSON.parse(tagsResponse.contents[0].text);
    tags.slice(0, 5).forEach((tag: any) => {
      console.log(`#${tag.tag} - used ${tag.count} times`);
    });

    // 4. Get recent changes
    console.log('\n=== Recent Changes ===');
    const recentResponse = await client.readResource({ uri: 'vault://recent' });
    const { files } = JSON.parse(recentResponse.contents[0].text);
    files.slice(0, 5).forEach((file: any) => {
      console.log(`${file.path} - modified ${file.modified}`);
    });

    // 5. Browse a folder
    console.log('\n=== Folder Contents ===');
    const folderResponse = await client.readResource({ uri: 'vault://folder/Projects' });
    const folder = JSON.parse(folderResponse.contents[0].text);
    console.log(`Folders: ${folder.folders.join(', ')}`);
    console.log(`Files: ${folder.files.map((f: any) => f.name).join(', ')}`);

    // 6. Read a specific note
    console.log('\n=== Reading a Note ===');
    const noteResponse = await client.readResource({ uri: 'vault://note/README.md' });
    const noteContent = noteResponse.contents[0].text;
    console.log(`First 200 chars: ${noteContent.substring(0, 200)}...`);

    // 7. Get daily note
    console.log('\n=== Daily Note ===');
    const dailyResponse = await client.readResource({ uri: 'vault://daily/today' });
    const dailyContent = dailyResponse.contents[0].text;
    console.log(`Today's note: ${dailyContent.substring(0, 100)}...`);

    // 8. Find notes by tag
    console.log('\n=== Notes by Tag ===');
    const tagResponse = await client.readResource({ uri: 'vault://tag/project' });
    const tagNotes = JSON.parse(tagResponse.contents[0].text);
    console.log(`Notes tagged with #${tagNotes.tag}:`);
    tagNotes.files.forEach((file: any) => {
      console.log(`- ${file.path}`);
    });

    // 9. Search vault
    console.log('\n=== Search Results ===');
    const searchResponse = await client.readResource({ uri: 'vault://search/meeting%20notes' });
    const searchResults = JSON.parse(searchResponse.contents[0].text);
    console.log(`Found ${searchResults.results.length} results for "${searchResults.query}"`);
    searchResults.results.slice(0, 3).forEach((result: any) => {
      console.log(`- ${result.path}: ${result.context}`);
    });

    // 10. Get vault structure
    console.log('\n=== Vault Structure ===');
    const structureResponse = await client.readResource({ uri: 'vault://structure' });
    const structure = JSON.parse(structureResponse.contents[0].text);
    console.log('Root folders:', structure.root.children
      .filter((item: any) => item.type === 'folder')
      .map((folder: any) => folder.name)
      .join(', '));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Example: Error handling for specific resources
async function handleResourceErrors(client: Client) {
  try {
    // Try to read a non-existent note
    await client.readResource({ uri: 'vault://note/non-existent.md' });
  } catch (error: any) {
    if (error.code === -32602) {
      console.log('Resource not found:', error.message);
    }
  }

  try {
    // Try with invalid URI format
    await client.readResource({ uri: 'vault://invalid-format' });
  } catch (error: any) {
    console.log('Invalid resource URI:', error.message);
  }
}

// Example: Batch resource reading
async function batchReadResources(client: Client) {
  console.log('\n=== Batch Reading Resources ===');
  
  // Read multiple resources in parallel
  const [stats, tags, recent] = await Promise.all([
    client.readResource({ uri: 'vault://stats' }),
    client.readResource({ uri: 'vault://tags' }),
    client.readResource({ uri: 'vault://recent' })
  ]);

  console.log('Successfully loaded vault context');
}

// Example: Progressive resource loading
async function progressiveLoading(client: Client) {
  console.log('\n=== Progressive Loading ===');
  
  // Start with high-level overview
  const statsResponse = await client.readResource({ uri: 'vault://stats' });
  const stats = JSON.parse(statsResponse.contents[0].text);
  
  if (stats.totalNotes > 100) {
    // Large vault - load structure for navigation
    const structure = await client.readResource({ uri: 'vault://structure' });
    console.log('Loaded vault structure for large vault');
  }
  
  // Load recent changes for context
  const recent = await client.readResource({ uri: 'vault://recent' });
  console.log('Loaded recent changes');
}

if (require.main === module) {
  main().catch(console.error);
}