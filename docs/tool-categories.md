# Obsidian MCP Tools by Category

This guide provides comprehensive documentation for all 33 tools available in obsidian-mcp-ts, organized by their functional categories. Each section includes practical examples and real-world workflows.

## Table of Contents
1. [File Operations](#file-operations)
2. [Directory Operations](#directory-operations)
3. [Search](#search)
4. [Editing](#editing)
5. [Tags](#tags)
6. [Periodic Notes](#periodic-notes)

---

## File Operations

### Overview
File operations form the core of vault interaction, providing tools to read, write, copy, move, and manage individual notes and their metadata. These tools handle everything from basic file reading to batch operations and metadata extraction.

### Tools in this Category
- **obsidian_list_files_in_vault** - List all files in the vault
- **obsidian_list_files_in_dir** - List files in a specific directory
- **obsidian_get_file_contents** - Read file content in various formats
- **obsidian_batch_get_file_contents** - Read multiple files at once
- **obsidian_get_file_metadata** - Get file info without content
- **obsidian_get_file_frontmatter** - Extract YAML frontmatter
- **obsidian_get_file_formatted** - Get files in different formats (plain/HTML)
- **obsidian_check_path_exists** - Verify if a path exists
- **obsidian_copy_file** - Duplicate files
- **obsidian_move_file** - Move files between folders
- **obsidian_rename_file** - Rename files in place
- **obsidian_delete_file** - Remove files from vault
- **obsidian_get_recent_changes** - Track recently modified files

### Common Use Cases
1. **Vault Exploration** - Browse and understand vault structure
2. **Content Migration** - Move notes between folders while preserving links
3. **Backup Operations** - Copy important notes before major changes
4. **Metadata Analysis** - Extract frontmatter for processing
5. **Change Tracking** - Monitor recent edits and updates

### Practical Examples

#### Example 1: Content Review Workflow
```javascript
// 1. Find recently modified notes
const recentChanges = await obsidian_get_recent_changes({
  limit: 10,
  contentLength: 200
});

// 2. Batch read the top 5 most recent files
const filePaths = recentChanges.files.slice(0, 5).map(f => f.path);
const contents = await obsidian_batch_get_file_contents({
  filepaths: filePaths,
  pageSize: 5
});

// 3. Extract metadata for analysis
const metadata = await Promise.all(
  filePaths.map(path => obsidian_get_file_metadata({ filepath: path }))
);
```

#### Example 2: Project Reorganization
```javascript
// 1. List all files in old project folder
const projectFiles = await obsidian_list_files_in_dir({
  dirpath: "Projects/OldProject"
});

// 2. Create new project structure
await obsidian_create_directory({
  directoryPath: "Projects/NewProject/research"
});

// 3. Move files to new location
for (const file of projectFiles.files) {
  const newPath = file.path.replace("OldProject", "NewProject");
  await obsidian_move_file({
    sourcePath: file.path,
    destinationPath: newPath
  });
}

// 4. Verify all files moved successfully
const verification = await obsidian_check_path_exists({
  path: "Projects/OldProject"
});
```

#### Example 3: Frontmatter Analysis
```javascript
// 1. Get all markdown files
const allFiles = await obsidian_list_files_in_vault();
const markdownFiles = allFiles.files.filter(f => f.path.endsWith('.md'));

// 2. Extract frontmatter from each file
const frontmatters = [];
for (const file of markdownFiles.slice(0, 50)) { // Limit to 50 for performance
  try {
    const fm = await obsidian_get_file_frontmatter({ 
      filepath: file.path 
    });
    if (fm.frontmatter) {
      frontmatters.push({
        path: file.path,
        frontmatter: fm.frontmatter
      });
    }
  } catch (e) {
    // Skip files without frontmatter
  }
}

// 3. Analyze common properties
const properties = new Set();
frontmatters.forEach(f => {
  Object.keys(f.frontmatter).forEach(key => properties.add(key));
});
```

### Tips and Best Practices
1. **Use batch operations** when reading multiple files to improve performance
2. **Check path existence** before operations to handle errors gracefully
3. **Preserve file extensions** when renaming to maintain note functionality
4. **Use metadata-only reads** when you don't need full content (faster)
5. **Monitor recent changes** regularly to stay aware of vault activity

### Related Utilities
- **LRUCache** - Cache frequently accessed file contents
- **BatchProcessor** - Process multiple files with concurrency control
- **PathValidationUtil** - Ensure path safety before operations

---

## Directory Operations

### Overview
While most directory operations are technically part of file operations, these tools specifically handle folder management, including creation, deletion, movement, and finding empty directories. They're essential for maintaining vault organization.

### Tools in this Category
- **obsidian_create_directory** - Create new folders
- **obsidian_delete_directory** - Remove folders (with recursive option)
- **obsidian_move_directory** - Relocate entire folder structures
- **obsidian_copy_directory** - Duplicate folder hierarchies
- **obsidian_find_empty_directories** - Identify unused folders

### Common Use Cases
1. **Vault Restructuring** - Reorganize folder hierarchies
2. **Project Setup** - Create standardized folder structures
3. **Cleanup Operations** - Find and remove empty folders
4. **Template Deployment** - Copy folder structures for new projects
5. **Archive Management** - Move old projects to archive folders

### Practical Examples

#### Example 1: Project Template Setup
```javascript
// 1. Create a new project structure
const projectName = "Research-2024";
const basePath = `Projects/${projectName}`;

// Create main directories
await obsidian_create_directory({ 
  directoryPath: basePath,
  createParents: true 
});

// Create subdirectories
const subdirs = ['notes', 'references', 'images', 'data', 'drafts'];
for (const dir of subdirs) {
  await obsidian_create_directory({
    directoryPath: `${basePath}/${dir}`
  });
}

// 2. Copy template files from existing project
await obsidian_copy_directory({
  sourcePath: "Templates/ProjectTemplate",
  destinationPath: basePath,
  overwrite: false
});
```

#### Example 2: Vault Cleanup
```javascript
// 1. Find all empty directories
const emptyDirs = await obsidian_find_empty_directories({
  searchPath: "",  // Search entire vault
  includeHiddenFiles: false
});

// 2. Review and delete truly empty directories
for (const dir of emptyDirs.directories) {
  // Skip certain directories we want to keep
  if (dir.path.includes('Templates') || dir.path.includes('Archive')) {
    continue;
  }
  
  console.log(`Removing empty directory: ${dir.path}`);
  await obsidian_delete_directory({
    directoryPath: dir.path,
    permanent: false,  // Move to trash instead of permanent delete
    recursive: false   // Should already be empty
  });
}
```

#### Example 3: Archive Old Projects
```javascript
// 1. Get current year for archiving
const currentYear = new Date().getFullYear();
const archivePath = `Archive/${currentYear}`;

// 2. Create archive structure
await obsidian_create_directory({
  directoryPath: archivePath,
  createParents: true
});

// 3. Find and move old projects
const projects = await obsidian_list_files_in_dir({
  dirpath: "Projects"
});

for (const item of projects.folders) {
  // Check if project folder has old dates in name
  if (item.name.includes('2023') || item.name.includes('2022')) {
    await obsidian_move_directory({
      sourcePath: item.path,
      destinationPath: `${archivePath}/${item.name}`
    });
    console.log(`Archived: ${item.name}`);
  }
}
```

### Tips and Best Practices
1. **Always use createParents: true** when creating nested directories
2. **Check for existing content** before deleting directories
3. **Use overwrite: false** when copying to prevent data loss
4. **Consider using trash** (permanent: false) instead of permanent deletion
5. **Maintain consistent naming conventions** for easier management

### Related Utilities
- **PathValidationUtil** - Validate directory paths before operations
- **ObsidianErrorHandler** - Handle directory operation errors gracefully

---

## Search

### Overview
Search tools provide powerful ways to find content within your vault, from simple text searches to complex queries with multiple filters. These tools support various search strategies including content search, metadata filtering, and advanced logical queries.

### Tools in this Category
- **obsidian_simple_search** - Basic text search with pagination
- **obsidian_advanced_search** - Search with filters (tags, dates, metadata)
- **obsidian_complex_search** - JsonLogic-based complex queries

### Common Use Cases
1. **Content Discovery** - Find notes containing specific information
2. **Research Queries** - Complex searches across multiple criteria
3. **Audit Operations** - Find notes missing certain properties
4. **Link Analysis** - Discover related content
5. **Maintenance Tasks** - Identify notes needing updates

### Practical Examples

#### Example 1: Research Literature Review
```javascript
// 1. Simple search for initial discovery
const basicResults = await obsidian_simple_search({
  query: "machine learning transformer",
  limit: 50,
  contextLength: 150
});

// 2. Advanced search with filters for academic papers
const academicPapers = await obsidian_advanced_search({
  filters: {
    content: {
      query: "transformer architecture"
    },
    tags: {
      include: ["research", "paper"],
      mode: "all"
    },
    frontmatter: {
      year: { operator: "gte", value: 2020 },
      type: { operator: "equals", value: "academic" }
    },
    file: {
      path: { pattern: "References/**" }
    }
  },
  options: {
    includeContent: true,
    limit: 100
  }
});

// 3. Complex search for specific criteria
const complexQuery = await obsidian_complex_search({
  query: {
    "and": [
      { "in": ["#important", { "var": "tags" }] },
      { "or": [
        { "contains": [{ "var": "content" }, "BERT"] },
        { "contains": [{ "var": "content" }, "GPT"] }
      ]},
      { ">=": [{ "var": "modified" }, "2024-01-01"] }
    ]
  }
});
```

#### Example 2: Content Audit
```javascript
// 1. Find notes without tags
const untaggedNotes = await obsidian_advanced_search({
  filters: {
    tags: {
      exclude: ["*"],  // Exclude all tags = find notes with no tags
      mode: "all"
    },
    file: {
      modified: {
        after: "2024-01-01"  // Only recent notes
      }
    }
  },
  options: {
    includeContent: false,  // Just need paths
    limit: 200
  }
});

// 2. Find notes missing frontmatter
const noFrontmatter = await obsidian_complex_search({
  query: {
    "!": { "var": "frontmatter" }  // Notes where frontmatter doesn't exist
  }
});

// 3. Find broken links pattern
const brokenLinkPattern = await obsidian_simple_search({
  query: "[[",  // Find wiki links
  limit: 100
});
// Then verify each linked file exists
```

#### Example 3: Project Status Tracking
```javascript
// Find all project notes with specific status
const projectTracking = await obsidian_advanced_search({
  filters: {
    frontmatter: {
      type: { operator: "equals", value: "project" },
      status: { operator: "contains", value: "progress" }
    },
    content: {
      query: "TODO",
      caseSensitive: false
    },
    file: {
      path: { pattern: "Projects/**" }
    }
  },
  options: {
    sort: {
      field: "modified",
      direction: "desc"
    },
    contextLength: 200
  }
});
```

### Tips and Best Practices
1. **Start simple, refine complex** - Use simple search first, then add filters
2. **Use contextLength wisely** - Balance between context and performance
3. **Leverage frontmatter filters** - More efficient than content search
4. **Combine search types** - Use appropriate tool for each use case
5. **Implement pagination** - Use offset/limit for large result sets

### Related Utilities
- **RequestDeduplicator** - Prevent duplicate concurrent searches
- **LRUCache** - Cache frequent search results

---

## Editing

### Overview
Editing tools provide various ways to modify note content, from simple appends to complex structure-aware edits. The unified edit tool offers smart operations that understand markdown structure, while simpler tools provide direct text manipulation.

### Tools in this Category
- **obsidian_edit** - Smart unified editor with multiple operations
- **obsidian_append_content** - Add content to end of files
- **obsidian_simple_append** - Basic append operation
- **obsidian_simple_replace** - Find and replace text
- **obsidian_query_structure** - Analyze document structure for editing

### Common Use Cases
1. **Daily Journaling** - Append entries to daily notes
2. **Task Management** - Update task lists and project status
3. **Note Enhancement** - Add sections, update headings
4. **Bulk Updates** - Find/replace across multiple notes
5. **Template Processing** - Insert content at specific locations

### Practical Examples

#### Example 1: Daily Note Workflow
```javascript
// 1. Get today's daily note
const dailyNote = await obsidian_get_periodic_note({
  period: "daily"
});

// 2. Query structure to find sections
const structure = await obsidian_query_structure({
  filepath: dailyNote.path,
  query: {
    type: "headings",
    include_content_preview: true
  }
});

// 3. Append to specific section
await obsidian_edit({
  file: dailyNote.path,
  after: "Tasks",  // Insert after "Tasks" heading
  add: "- [ ] Review pull requests\n- [ ] Update documentation"
});

// 4. Add journal entry
await obsidian_edit({
  file: dailyNote.path,
  after: "Journal",
  add: `\n### ${new Date().toLocaleTimeString()}\nCompleted the search functionality refactor. The new implementation is much cleaner.`
});
```

#### Example 2: Project Status Updates
```javascript
// 1. Find all project files
const projects = await obsidian_advanced_search({
  filters: {
    frontmatter: {
      type: { operator: "equals", value: "project" }
    }
  }
});

// 2. Batch update status
for (const project of projects.results) {
  // Replace old status with new
  await obsidian_simple_replace({
    filepath: project.path,
    find: "status: in-progress",
    replace: "status: completed"
  });
  
  // Add completion note
  await obsidian_edit({
    file: project.path,
    new_section: "Completion Notes",
    at: "end",
    content: `Completed on ${new Date().toISOString().split('T')[0]}`
  });
}
```

#### Example 3: Template Expansion
```javascript
// 1. Create new note from template
const templateContent = await obsidian_get_file_contents({
  filepath: "Templates/MeetingNotes.md"
});

// 2. Create new meeting note
const meetingDate = new Date().toISOString().split('T')[0];
const newPath = `Meetings/Meeting-${meetingDate}.md`;

// 3. Process template with unified edit
await obsidian_edit({
  file: newPath,
  batch: [
    {
      find: "{{date}}",
      replace: meetingDate
    },
    {
      find: "{{attendees}}",
      replace: "- John Smith\n- Jane Doe"
    },
    {
      after: "Agenda",
      add: "1. Project status update\n2. Budget review\n3. Next steps"
    }
  ]
});
```

### Tips and Best Practices
1. **Use query_structure first** to understand document layout
2. **Prefer heading-based insertion** over line numbers
3. **Batch operations together** for efficiency
4. **Always validate paths** before editing
5. **Create backups** before bulk replacements

### Related Utilities
- **PathValidationUtil** - Ensure valid file paths
- **ObsidianErrorHandler** - Handle edit conflicts gracefully

---

## Tags

### Overview
Tag management tools help organize and navigate your vault through Obsidian's tagging system. These tools can analyze tag usage, find tagged content, rename tags globally, and manage tags on individual files.

### Tools in this Category
- **obsidian_get_all_tags** - List all tags with usage counts
- **obsidian_get_files_by_tag** - Find all files with specific tag
- **obsidian_rename_tag** - Rename tags across entire vault
- **obsidian_manage_file_tags** - Add/remove tags from files

### Common Use Cases
1. **Tag Analysis** - Understand vault organization
2. **Content Categorization** - Organize notes by topics
3. **Tag Cleanup** - Standardize tag naming
4. **Workflow Automation** - Tag-based processing
5. **Navigation Enhancement** - Find related content

### Practical Examples

#### Example 1: Tag Standardization
```javascript
// 1. Analyze current tag usage
const allTags = await obsidian_get_all_tags();

// 2. Find variations that need standardization
const variations = allTags.tags.filter(tag => 
  tag.name.includes('project') || 
  tag.name.includes('Project') ||
  tag.name.includes('PROJECT')
);

// 3. Standardize to lowercase with hyphens
for (const variant of variations) {
  if (variant.name !== '#project') {
    await obsidian_rename_tag({
      oldTagName: variant.name,
      newTagName: '#project'
    });
  }
}

// 4. Create hierarchical tags
await obsidian_rename_tag({
  oldTagName: '#javascript',
  newTagName: '#dev/javascript'
});
```

#### Example 2: Content Processing Pipeline
```javascript
// 1. Find all notes tagged for review
const reviewNotes = await obsidian_get_files_by_tag({
  tagName: '#needs-review'
});

// 2. Process each note
for (const file of reviewNotes.files) {
  // Read content
  const content = await obsidian_get_file_contents({
    filepath: file.path
  });
  
  // Perform review (example: check for TODOs)
  const hasTodos = content.content.includes('TODO');
  
  // Update tags based on review
  await obsidian_manage_file_tags({
    filePath: file.path,
    operation: 'remove',
    tags: ['#needs-review']
  });
  
  await obsidian_manage_file_tags({
    filePath: file.path,
    operation: 'add',
    tags: hasTodos ? ['#has-todos', '#reviewed'] : ['#reviewed']
  });
}
```

#### Example 3: Tag-Based Archive System
```javascript
// 1. Get all archived content
const archivedFiles = await obsidian_get_files_by_tag({
  tagName: '#archive'
});

// 2. Add year-based archive tags
const currentYear = new Date().getFullYear();

for (const file of archivedFiles.files) {
  // Get file metadata
  const metadata = await obsidian_get_file_metadata({
    filepath: file.path
  });
  
  // Extract year from creation date
  const createdYear = new Date(metadata.created).getFullYear();
  
  // Add year tag
  await obsidian_manage_file_tags({
    filePath: file.path,
    operation: 'add',
    tags: [`#archive/${createdYear}`],
    location: 'frontmatter'
  });
}

// 3. Create tag hierarchy report
const tagReport = {};
for (const tag of allTags.tags) {
  if (tag.name.startsWith('#archive/')) {
    tagReport[tag.name] = tag.count;
  }
}
```

### Tips and Best Practices
1. **Use hierarchical tags** (#parent/child) for better organization
2. **Standardize tag formats** early (lowercase, hyphens vs underscores)
3. **Add tags to frontmatter** for cleaner content
4. **Regular tag audits** to prevent proliferation
5. **Document tag meanings** in a tags index note

### Related Utilities
- **BatchProcessor** - Process multiple tagged files efficiently
- **LRUCache** - Cache tag queries for performance

---

## Periodic Notes

### Overview
Periodic notes tools integrate with Obsidian's daily notes and periodic notes plugins, providing programmatic access to journal entries, weekly reviews, and other time-based notes. These tools are essential for maintaining consistent journaling and review practices.

### Tools in this Category
- **obsidian_get_periodic_note** - Get current periodic note (daily/weekly/etc)
- **obsidian_get_recent_periodic_notes** - Get recent notes by period type

### Common Use Cases
1. **Daily Journaling** - Automated daily note creation and updates
2. **Weekly Reviews** - Aggregate daily notes into weekly summaries
3. **Habit Tracking** - Update periodic notes with tracked data
4. **Time Blocking** - Manage calendar and tasks in daily notes
5. **Retrospectives** - Analyze patterns across periodic notes

### Practical Examples

#### Example 1: Daily Standup Automation
```javascript
// 1. Get today's daily note
const dailyNote = await obsidian_get_periodic_note({
  period: "daily"
});

// 2. Get yesterday's note for carryover
const recentDailies = await obsidian_get_recent_periodic_notes({
  period: "daily",
  days: 2
});

const yesterdayNote = recentDailies.notes[1]; // Second most recent

// 3. Extract uncompleted tasks from yesterday
const yesterdayContent = await obsidian_get_file_contents({
  filepath: yesterdayNote.path
});

const uncompletedTasks = yesterdayContent.content
  .split('\n')
  .filter(line => line.includes('- [ ]'))
  .join('\n');

// 4. Update today's note with carryover
await obsidian_edit({
  file: dailyNote.path,
  after: "Carryover Tasks",
  add: uncompletedTasks || "No carryover tasks"
});
```

#### Example 2: Weekly Review Generation
```javascript
// 1. Get current weekly note
const weeklyNote = await obsidian_get_periodic_note({
  period: "weekly"
});

// 2. Get all daily notes from this week
const dailyNotes = await obsidian_get_recent_periodic_notes({
  period: "daily",
  days: 7
});

// 3. Aggregate accomplishments
let accomplishments = [];
let challenges = [];

for (const daily of dailyNotes.notes) {
  const content = await obsidian_get_file_contents({
    filepath: daily.path
  });
  
  // Extract sections (assuming standard format)
  const accomplishmentMatch = content.content.match(/## Accomplishments\n([\s\S]*?)(?=\n##|$)/);
  const challengeMatch = content.content.match(/## Challenges\n([\s\S]*?)(?=\n##|$)/);
  
  if (accomplishmentMatch) {
    accomplishments.push(`### ${daily.date}\n${accomplishmentMatch[1].trim()}`);
  }
  if (challengeMatch) {
    challenges.push(`### ${daily.date}\n${challengeMatch[1].trim()}`);
  }
}

// 4. Update weekly review
await obsidian_edit({
  file: weeklyNote.path,
  batch: [
    {
      after: "Weekly Accomplishments",
      add: accomplishments.join('\n\n')
    },
    {
      after: "Weekly Challenges",
      add: challenges.join('\n\n')
    }
  ]
});
```

#### Example 3: Monthly Analytics
```javascript
// 1. Get recent monthly notes
const monthlyNotes = await obsidian_get_recent_periodic_notes({
  period: "monthly",
  days: 90  // Last 3 months
});

// 2. Analyze patterns
const monthlyStats = [];

for (const monthly of monthlyNotes.notes) {
  // Get all daily notes for that month
  const monthStart = new Date(monthly.date);
  const searchQuery = `path:Daily/${monthStart.getFullYear()}/${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
  
  const dailiesInMonth = await obsidian_advanced_search({
    filters: {
      file: {
        path: { pattern: searchQuery }
      }
    }
  });
  
  // Calculate statistics
  const stats = {
    month: monthly.date,
    totalDailyNotes: dailiesInMonth.results.length,
    notesWithTasks: 0,
    completedTasks: 0,
    totalTasks: 0
  };
  
  // Analyze each daily
  for (const daily of dailiesInMonth.results) {
    const content = await obsidian_get_file_contents({
      filepath: daily.path
    });
    
    const tasks = content.content.match(/- \[[ x]\]/g) || [];
    const completed = content.content.match(/- \[x\]/g) || [];
    
    if (tasks.length > 0) stats.notesWithTasks++;
    stats.totalTasks += tasks.length;
    stats.completedTasks += completed.length;
  }
  
  monthlyStats.push(stats);
}

// 3. Create summary report
const report = monthlyStats.map(stat => 
  `## ${stat.month}\n- Daily Notes: ${stat.totalDailyNotes}\n- Task Completion: ${stat.completedTasks}/${stat.totalTasks} (${Math.round(stat.completedTasks/stat.totalTasks*100)}%)`
).join('\n\n');
```

### Tips and Best Practices
1. **Configure periodic notes plugin** properly before using these tools
2. **Use consistent templates** for easier parsing and aggregation
3. **Implement error handling** for missing periodic notes
4. **Cache periodic note paths** to reduce lookups
5. **Respect date formats** configured in Obsidian

### Related Utilities
- **ObsidianClient** - Handles periodic note API calls
- **DateFormatter** - Ensure correct date formatting
- **TemplateProcessor** - Process periodic note templates

---

## Performance Best Practices

### Caching Strategy
```javascript
import { LRUCache } from '../utils/LRUCache.js';

// Create cache instances for different data types
const fileCache = new LRUCache<string, any>({ maxSize: 100, ttl: 300000 }); // 5min TTL
const searchCache = new LRUCache<string, any>({ maxSize: 50, ttl: 60000 }); // 1min TTL
const tagCache = new LRUCache<string, any>({ maxSize: 200, ttl: 600000 }); // 10min TTL

// Use caching in operations
async function getCachedFileContent(filepath: string) {
  const cached = fileCache.get(filepath);
  if (cached) return cached;
  
  const content = await obsidian_get_file_contents({ filepath });
  fileCache.set(filepath, content);
  return content;
}
```

### Batch Processing
```javascript
import { OptimizedBatchProcessor } from '../utils/OptimizedBatchProcessor.js';

// Configure batch processor
const processor = new OptimizedBatchProcessor({
  maxConcurrency: 5,
  batchSize: 10,
  retryAttempts: 3,
  retryDelay: 1000
});

// Process files in batches
const results = await processor.process(
  files,
  async (file) => {
    return await obsidian_get_file_contents({ filepath: file.path });
  }
);
```

### Request Deduplication
```javascript
import { RequestDeduplicator } from '../utils/RequestDeduplicator.js';

const deduplicator = new RequestDeduplicator();

// Prevent duplicate concurrent requests
async function getFileWithDedup(filepath: string) {
  return deduplicator.dedupe(
    `file:${filepath}`,
    () => obsidian_get_file_contents({ filepath })
  );
}
```

## Error Handling Patterns

### Consistent Error Responses
```javascript
try {
  // Tool operation
  const result = await someOperation();
  return formatResponse(result);
} catch (error) {
  return ObsidianErrorHandler.handle(error, 'tool_name', {
    404: 'File not found. Check the path and try again.',
    403: 'Permission denied. Ensure Obsidian REST API has access.',
    401: 'Authentication failed. Check your API key.'
  });
}
```

### Graceful Degradation
```javascript
// Try optimal approach first, fall back if needed
try {
  // Try batch operation
  return await obsidian_batch_get_file_contents({ filepaths });
} catch (error) {
  // Fall back to individual requests
  const results = [];
  for (const filepath of filepaths) {
    try {
      const content = await obsidian_get_file_contents({ filepath });
      results.push(content);
    } catch (e) {
      results.push({ error: e.message, filepath });
    }
  }
  return results;
}
```

## Integration Patterns

### Tool Chaining
```javascript
// Chain tools for complex workflows
async function analyzeVault() {
  // 1. Get vault structure
  const files = await obsidian_list_files_in_vault();
  
  // 2. Analyze tags
  const tags = await obsidian_get_all_tags();
  
  // 3. Find untagged files
  const untagged = [];
  for (const file of files.files) {
    const content = await obsidian_get_file_contents({ 
      filepath: file.path 
    });
    if (!content.content.includes('#')) {
      untagged.push(file);
    }
  }
  
  // 4. Generate report
  return {
    totalFiles: files.files.length,
    totalTags: tags.tags.length,
    untaggedFiles: untagged.length,
    tagCoverage: ((files.files.length - untagged.length) / files.files.length * 100).toFixed(2) + '%'
  };
}
```

### Event-Driven Workflows
```javascript
// Monitor changes and trigger actions
async function monitorVaultChanges() {
  let lastCheck = new Date();
  
  setInterval(async () => {
    // Get recent changes
    const changes = await obsidian_get_recent_changes({
      limit: 10
    });
    
    // Process new changes
    const newChanges = changes.files.filter(f => 
      new Date(f.modified) > lastCheck
    );
    
    for (const change of newChanges) {
      // Trigger workflows based on file type or location
      if (change.path.startsWith('Daily/')) {
        await processDailyNote(change);
      } else if (change.path.includes('project')) {
        await updateProjectIndex(change);
      }
    }
    
    lastCheck = new Date();
  }, 60000); // Check every minute
}
```

## Conclusion

The obsidian-mcp-ts toolkit provides comprehensive tools for programmatic vault management. By understanding each category's strengths and combining tools effectively, you can build powerful automation workflows that enhance your Obsidian experience.

Remember to:
- Start simple and build complexity gradually
- Use appropriate tools for each task
- Implement proper error handling
- Cache frequently accessed data
- Test workflows with small datasets first
- Monitor performance and optimize as needed

For more examples and updates, check the [project repository](https://github.com/Pouek/obsidian-mcp-ts).