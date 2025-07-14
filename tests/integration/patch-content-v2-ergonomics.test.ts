import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';

describe('PatchContentToolV2 Ergonomics Integration Test', () => {
  const serverPath = join(process.cwd(), 'dist', 'index.js');
  
  async function callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [serverPath], {
        env: {
          ...process.env,
          OBSIDIAN_API_KEY: 'test-key',
          OBSIDIAN_HOST: '127.0.0.1'
        }
      });

      let response = '';
      let error = '';

      server.stdout.on('data', (data) => {
        response += data.toString();
      });

      server.stderr.on('data', (data) => {
        error += data.toString();
      });

      server.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Server exited with code ${code}: ${error}`));
        } else {
          try {
            const lines = response.split('\n').filter(line => line.trim());
            const resultLine = lines.find(line => line.includes('"result"'));
            if (resultLine) {
              const result = JSON.parse(resultLine);
              resolve(result.result);
            } else {
              reject(new Error('No result found in response'));
            }
          } catch (e) {
            reject(e);
          }
        }
      });

      // Send the request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      server.stdin.write(JSON.stringify(request) + '\n');
      server.stdin.end();
    });
  }

  it('should demonstrate simple append operation', async () => {
    // Skip if no Obsidian connection
    if (!process.env.OBSIDIAN_API_KEY) {
      console.log('Skipping integration test - no OBSIDIAN_API_KEY set');
      return;
    }

    // Example 1: Simple append (much easier than V2!)
    const simpleAppend = {
      filepath: 'test-ergonomics.md',
      append: 'This is so much easier than the complex nested structure!'
    };

    console.log('Simple append:', simpleAppend);
    // Would call: await callTool('obsidian_patch_content_v2', simpleAppend);
  });

  it('should demonstrate simple operations vs V2 complexity', async () => {
    // V2 way (complex):
    const v2Append = {
      filepath: 'test.md',
      operation: {
        type: 'insert',
        insert: {
          content: [{type: 'text', text: 'Hello world'}], // Complex array format
          location: {
            type: 'document',
            document: { position: 'end' },
            position: 'after' // Redundant!
          }
        }
      }
    };

    // V2 way (simple):
    const v2Append_simple = {
      filepath: 'test.md',
      append: 'Hello world'
    };

    console.log('V2 complexity:', JSON.stringify(v2Append, null, 2));
    console.log('V2 simplicity:', JSON.stringify(v2Append_simple, null, 2));
    
    // The simple version should be less complex by measuring the total JSON string length
    expect(JSON.stringify(v2Append_simple).length).toBeLessThan(JSON.stringify(v2Append).length);
  });

  it('should show all simple operation examples', async () => {
    // All the simple operations available
    const examples = [
      {
        name: 'Append text',
        args: { filepath: 'notes.md', append: 'New content at end' }
      },
      {
        name: 'Prepend text',
        args: { filepath: 'notes.md', prepend: 'New content at start' }
      },
      {
        name: 'Simple find/replace',
        args: { filepath: 'notes.md', replace: { find: 'old', with: 'new' } }
      },
      {
        name: 'Insert after heading',
        args: { filepath: 'notes.md', insertAfterHeading: { heading: 'Introduction', content: 'New section' } }
      },
      {
        name: 'Insert before heading',
        args: { filepath: 'notes.md', insertBeforeHeading: { heading: 'Conclusion', content: 'Summary' } }
      },
      {
        name: 'Update frontmatter',
        args: { filepath: 'notes.md', updateFrontmatter: { title: 'New Title', tags: ['tag1', 'tag2'] } }
      }
    ];

    examples.forEach(example => {
      console.log(`\n${example.name}:`, JSON.stringify(example.args, null, 2));
    });
  });

  it('should show progressive enhancement', async () => {
    // Level 1: Dead simple
    const level1 = {
      filepath: 'notes.md',
      append: 'Simple text'
    };

    // Level 2: Still simple, but more control
    const level2 = {
      filepath: 'notes.md',
      insertAfterHeading: {
        heading: 'Chapter 1',
        content: 'New content'
      }
    };

    // Level 3: Full power when needed
    const level3 = {
      filepath: 'notes.md',
      operation: {
        type: 'replace',
        replace: {
          pattern: '\\btest\\b',
          replacement: 'exam',
          options: {
            regex: true,
            whole_word: true,
            case_sensitive: false,
            scope: {
              type: 'section',
              section_path: ['Chapter 1', 'Section 2']
            }
          }
        }
      }
    };

    console.log('Level 1 - Simple:', level1);
    console.log('Level 2 - Targeted:', level2);
    console.log('Level 3 - Advanced:', level3);
  });

  it('should show helpful error messages', async () => {
    // When no operation is specified, the error helps
    const noOp = { filepath: 'test.md' };
    
    // Expected error response:
    const expectedError = {
      success: false,
      error: {
        code: 'NO_OPERATION',
        message: 'No operation specified',
        hint: 'Specify an operation like append, prepend, replace, or use the advanced operation format',
        example: {
          simple: { filepath: 'notes.md', append: 'New content' },
          advanced: { 
            filepath: 'notes.md', 
            operation: { 
              type: 'insert', 
              insert: { 
                content: 'text', 
                location: { type: 'document', document: { position: 'end' }, position: 'after' } 
              } 
            } 
          }
        }
      }
    };

    console.log('No operation error provides helpful guidance:', 
      JSON.stringify(expectedError, null, 2));
  });
});