# Troubleshooting Guide

This guide helps you resolve common issues with the Obsidian MCP TypeScript server.

## Table of Contents

- [Common Setup Issues](#common-setup-issues)
- [Connection Problems](#connection-problems)
- [Authentication Errors](#authentication-errors)
- [Performance Issues](#performance-issues)
- [Error Messages Guide](#error-messages-guide)
- [Diagnostic Checklist](#diagnostic-checklist)
- [Common Misconfigurations](#common-misconfigurations)
- [Debugging Tips](#debugging-tips)
- [FAQ](#faq)

## Common Setup Issues

### Missing Dependencies
If you encounter issues during installation, ensure you have the required dependencies:

```bash
# Check Node.js version (should be 16.x or higher)
node --version

# Install dependencies
npm install
```

### TypeScript Build Errors
If the build fails:

```bash
# Clean build directory
rm -rf dist/

# Rebuild
npm run build
```

### Environment Variables Not Set
Ensure your environment variables are properly configured:

```bash
# Required
export OBSIDIAN_API_KEY=your_api_key_here

# Optional (defaults to 127.0.0.1)
export OBSIDIAN_HOST=127.0.0.1
```

## Connection Problems

### Connection Refused Error

**Error Message:** `Error: connect ECONNREFUSED 127.0.0.1:27124`

**Description:** The MCP server cannot establish a connection to Obsidian's Local REST API plugin.

**Common Causes:**
- Obsidian is not running
- Local REST API plugin is disabled or not installed
- Plugin is using a different port
- Firewall blocking the connection
- Plugin failed to start

**Resolution Steps:**
1. **Verify Obsidian is Running:**
   - Ensure Obsidian application is open and a vault is loaded
   - Check system tray/dock for Obsidian icon

2. **Check Local REST API Plugin:**
   - Open Obsidian Settings (Cmd/Ctrl + ,)
   - Navigate to Community plugins
   - Verify "Local REST API" is installed and enabled
   - If not installed: Browse community plugins → Search "Local REST API" → Install
   - If disabled: Toggle the switch to enable it

3. **Verify Plugin Status:**
   - Go to Settings → Local REST API
   - Check that "Server Status" shows "Running"
   - Note the port number (should be 27124 by default)
   - Verify "Enable HTTPS" is checked

4. **Test Connection Manually:**
   ```bash
   # Test basic connectivity
   curl -k https://127.0.0.1:27124/
   # Should return: {"authenticated":false,"ok":true}
   
   # Test with API key
   curl -k -H "Authorization: Bearer YOUR_API_KEY" https://127.0.0.1:27124/vault/
   ```

5. **Restart Plugin if Needed:**
   - Disable Local REST API plugin
   - Wait 5 seconds
   - Re-enable the plugin
   - Check server status again

6. **Check for Port Conflicts:**
   ```bash
   # Check what's using port 27124
   lsof -i :27124
   # or on Windows
   netstat -an | findstr :27124
   ```

**Prevention Tips:**
- Keep Obsidian running when using MCP server
- Enable "Start at login" in Obsidian settings
- Monitor plugin status in Obsidian settings
- Bookmark the plugin settings page for quick access

**Related Issues:**
- Timeout errors
- SSL certificate warnings
- "Service unavailable" messages

### Port Already in Use
If you see "EADDRINUSE" errors:
- The default port (27124) might be in use
- Check if another instance is running
- Restart Obsidian and the plugin

### SSL Certificate Error

**Error Message:** `Error: self signed certificate` or `CERT_HAS_EXPIRED`

**Description:** The Obsidian Local REST API uses self-signed SSL certificates for HTTPS connections, which can trigger security warnings.

**Why This Happens:**
- Local REST API generates its own SSL certificate for security
- Self-signed certificates aren't trusted by default
- Certificate may expire after extended use
- Some HTTP clients reject self-signed certificates

**Resolution (Automatic):**
- The MCP server automatically disables SSL verification for localhost connections
- This is implemented in the ObsidianClient with `rejectUnauthorized: false`
- No user action required - this is expected behavior

**Manual Verification (if needed):**
```bash
# Test connection ignoring SSL warnings
curl -k https://127.0.0.1:27124/

# Test with strict SSL (will fail with self-signed)
curl https://127.0.0.1:27124/
```

**If SSL Issues Persist:**
1. **Restart the Local REST API Plugin:**
   - Disable plugin in Obsidian settings
   - Wait 10 seconds
   - Re-enable plugin
   - New certificate will be generated

2. **Check Plugin SSL Settings:**
   - Go to Settings → Local REST API
   - Ensure "Enable HTTPS" is checked
   - Try unchecking and rechecking if issues persist

3. **Clear Certificate Cache (rare):**
   - Restart Obsidian completely
   - Clear browser cache if testing via browser

**Important Security Note:**
- SSL verification is only disabled for 127.0.0.1 and localhost
- This maintains security while allowing local development
- Never disable SSL verification for remote connections

**Prevention Tips:**
- Don't modify SSL settings in the MCP client code
- Restart plugin if certificate issues develop
- Use HTTPS URLs (not HTTP) even locally

## Authentication Errors

### Invalid API Key
If you receive 401 Unauthorized errors:
1. Generate a new API key in Obsidian:
   - Settings → Local REST API → API Key
2. Update your environment variable:
   ```bash
   export OBSIDIAN_API_KEY=your_new_key_here
   ```

### API Key Not Set Error

**Error Message:** `Error: OBSIDIAN_API_KEY environment variable is not set`

**Description:** The MCP server cannot authenticate with Obsidian because the API key environment variable is missing.

**Common Causes:**
- Environment variable not exported in the current session
- API key set in wrong shell profile (.bashrc vs .zshrc)
- Claude Desktop not inheriting environment variables
- Typo in environment variable name

**Resolution Steps:**
1. **Generate API Key in Obsidian:**
   - Open Obsidian
   - Go to Settings → Community plugins → Local REST API
   - Click "Generate API Key" or copy existing key

2. **Set Environment Variable:**
   ```bash
   # For current session
   export OBSIDIAN_API_KEY=your_api_key_here
   
   # Verify it's set
   echo $OBSIDIAN_API_KEY
   ```

3. **Make It Persistent (choose your shell):**
   ```bash
   # For bash users
   echo 'export OBSIDIAN_API_KEY=your_api_key_here' >> ~/.bashrc
   source ~/.bashrc
   
   # For zsh users (macOS default)
   echo 'export OBSIDIAN_API_KEY=your_api_key_here' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **For Claude Desktop Users:**
   Add to your Claude Desktop MCP configuration:
   ```json
   {
     "mcpServers": {
       "obsidian-mcp-ts": {
         "command": "npx",
         "args": ["obsidian-mcp-ts"],
         "env": {
           "OBSIDIAN_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

**Prevention Tips:**
- Use Claude Desktop env config instead of shell exports
- Keep API key in secure password manager
- Test environment variable after setting: `echo $OBSIDIAN_API_KEY`
- Restart Claude Desktop after configuration changes

**Related Issues:**
- 401 Unauthorized errors
- "Permission denied" messages
- MCP server initialization failures

### Path Not Found Errors

**Error Message:** `File not found: /path/to/file.md` or `Path does not exist`

**Description:** The requested file or directory path cannot be located in the Obsidian vault.

**Common Causes:**
- Incorrect file path (typos, wrong case)
- Special characters in path not properly encoded
- Path uses backslashes instead of forward slashes
- File was moved or deleted
- Path is outside the vault root

**Resolution Steps:**
1. **Verify File Exists:**
   - Check the file exists in Obsidian's file explorer
   - Confirm exact file name and extension
   - Note that paths are case-sensitive

2. **Check Path Format:**
   ```bash
   # Correct format (forward slashes)
   folder/subfolder/file.md
   
   # Incorrect (backslashes on Windows)
   folder\subfolder\file.md
   
   # Correct with spaces (URL encoded)
   My%20Folder/My%20File.md
   
   # Or with proper escaping
   "My Folder/My File.md"
   ```

3. **Handle Special Characters:**
   - Spaces: Use `%20` or quote the entire path
   - Parentheses: Use `%28` and `%29` for `(` and `)`
   - Ampersands: Use `%26` for `&`
   - Unicode: Ensure UTF-8 encoding

4. **Test Path Resolution:**
   ```bash
   # Use list_files_in_vault to verify structure
   # Use obsidian_check_path_exists to validate paths
   ```

**Encoding Examples:**
```
Original: "My Notes & Ideas (2024).md"
Encoded:  "My%20Notes%20%26%20Ideas%20%282024%29.md"

Original: "français/café.md"
Encoded:  "fran%C3%A7ais/caf%C3%A9.md"
```

**Prevention Tips:**
- Use simple file names without special characters when possible
- Always use forward slashes in paths
- Test paths with obsidian_check_path_exists before operations
- Use tab completion in Obsidian to get exact names

**Related Issues:**
- Permission denied errors
- Invalid request errors
- File operation failures

### Permission Denied Errors

**Error Message:** `Error: Permission denied` or `403 Forbidden`

**Description:** The MCP server cannot access the requested resource due to insufficient permissions.

**Common Causes:**
- Invalid or expired API key
- File/folder has restricted permissions
- Vault is read-only or locked
- Operating system file permissions
- Plugin permissions not properly configured

**Resolution Steps:**
1. **Verify API Key Permissions:**
   - Go to Settings → Local REST API in Obsidian
   - Check "API Key" section shows a valid key
   - Note any permission restrictions
   - Try regenerating the API key if old

2. **Test API Key:**
   ```bash
   # Test authentication
   curl -k -H "Authorization: Bearer YOUR_API_KEY" https://127.0.0.1:27124/vault/
   # Should return vault info, not auth error
   ```

3. **Check Vault Access:**
   - Ensure vault is not set to read-only
   - Check if vault is syncing (can cause temporary locks)
   - Verify you have write permissions to vault directory
   - Close other applications that might lock files

4. **Verify File Permissions:**
   ```bash
   # Check file permissions (Unix/Mac)
   ls -la "path/to/vault/file.md"
   
   # Should show read/write for user
   # Fix if needed:
   chmod 644 "path/to/vault/file.md"
   ```

5. **Plugin Permission Check:**
   - Restart the Local REST API plugin
   - Check plugin error logs in Obsidian console (Cmd/Ctrl+Shift+I)
   - Try disabling/re-enabling the plugin

**Prevention Tips:**
- Keep API key secure and don't share it
- Regularly check plugin is running and authorized
- Avoid file operations during vault sync
- Use proper file permissions (644 for files, 755 for directories)

**Related Issues:**
- Authentication failures
- File operation errors
- Vault sync conflicts

## Performance Issues

### Slow Response Times
1. **Large Vault Optimization**
   - Use pagination for list operations
   - Implement caching for frequently accessed data
   - Limit search scope when possible

2. **Batch Operations**
   - Use batch endpoints for multiple operations
   - Configure appropriate batch sizes (default: 10)
   - Monitor memory usage for large batches

3. **Cache Configuration**
   - Adjust cache TTL based on your needs
   - Clear cache if experiencing stale data
   - Monitor cache hit rates

### Memory Usage
- Process large vaults incrementally
- Use streaming for batch operations
- Clear caches periodically
- Monitor Node.js memory limits

### Timeout Errors
Adjust timeout settings if needed:
```typescript
// In your configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
```

## Error Messages Guide

### HTTP Status Code Errors

#### 400 Bad Request
**Meaning:** Invalid parameters or malformed request
**Common Causes:**
- Missing required parameters
- Invalid parameter types or formats
- Malformed JSON in request body
- Invalid file paths or names
**Resolution:** Check request parameters and format

#### 401 Unauthorized
**Meaning:** Invalid or missing API key
**Common Causes:**
- API key not set in environment
- Incorrect API key value
- Expired API key
- API key not included in request headers
**Resolution:** Verify and regenerate API key

#### 403 Forbidden
**Meaning:** Operation not permitted
**Common Causes:**
- Insufficient permissions for operation
- File/folder access restrictions
- Plugin permission limitations
- Read-only vault or file
**Resolution:** Check permissions and vault settings

#### 404 Not Found
**Meaning:** File or resource doesn't exist
**Common Causes:**
- Typo in file path
- File was moved or deleted
- Incorrect path encoding
- Case sensitivity issues
**Resolution:** Verify file path and existence

#### 500 Internal Server Error
**Meaning:** Server-side issue
**Common Causes:**
- Plugin crash or malfunction
- Obsidian internal error
- Corrupted vault files
- System resource issues
**Resolution:** Check logs, restart plugin/Obsidian

#### 503 Service Unavailable
**Meaning:** Service temporarily unavailable
**Common Causes:**
- Plugin not running
- Obsidian not responding
- System overload
- Network connectivity issues
**Resolution:** Check plugin status, restart if needed

### MCP Protocol Errors

#### InvalidRequest
**Meaning:** Request doesn't conform to MCP protocol
**Common Causes:**
- Invalid tool name
- Missing required parameters
- Wrong parameter types
- Malformed JSON-RPC message
**Resolution:** Check tool name and parameters

#### InternalError
**Meaning:** Server encountered unexpected error
**Common Causes:**
- Code bugs or exceptions
- System resource exhaustion
- Dependency failures
- Configuration issues
**Resolution:** Check server logs for stack traces

#### MethodNotFound
**Meaning:** Requested tool/method doesn't exist
**Common Causes:**
- Typo in tool name
- Tool not implemented
- Version mismatch
- Dynamic loading failure
**Resolution:** Verify tool name, check available tools

### Application-Specific Errors

#### Parsing Errors
**Symptoms:** JSON parsing failures, encoding issues
**Common Causes:**
- Invalid UTF-8 characters in file names
- Special characters not properly escaped
- Corrupted JSON structure
- Binary data in text fields
**Resolution:**
- Use proper UTF-8 encoding
- Escape special characters
- Validate JSON structure
- Check for binary content

#### Path Encoding Errors
**Symptoms:** "Invalid path" or "Path not found" with special characters
**Common Causes:**
- Spaces not URL-encoded (%20)
- Unicode characters not encoded
- Reserved characters not escaped
- Platform-specific path separators
**Resolution:**
- Use URL encoding for special characters
- Test paths with simple names first
- Use forward slashes consistently

#### Cache-Related Errors
**Symptoms:** Stale data, inconsistent responses
**Common Causes:**
- Cache TTL too long
- Cache not invalidated after changes
- Memory pressure causing cache eviction
- Concurrent modification issues
**Resolution:**
- Clear cache manually
- Adjust cache TTL settings
- Restart server to reset cache

## Diagnostic Checklist

### Quick Connection Test
Before diving into detailed debugging, run through this checklist:

#### 1. Basic Connectivity (2 minutes)
- [ ] Obsidian is running and vault is open
- [ ] Local REST API plugin is enabled and showing "Running" status
- [ ] Environment variable `OBSIDIAN_API_KEY` is set
- [ ] Test connection: `curl -k https://127.0.0.1:27124/`

#### 2. Authentication Check (1 minute)
- [ ] API key is correctly formatted (no extra spaces/characters)
- [ ] Test authenticated request:
  ```bash
  curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" https://127.0.0.1:27124/vault/
  ```
- [ ] Response shows vault information (not auth error)

#### 3. MCP Server Status (1 minute)
- [ ] MCP server starts without errors
- [ ] No error messages in startup logs
- [ ] Tools are properly loaded and discoverable
- [ ] Test with MCP Inspector if available

#### 4. File Operation Test (1 minute)
- [ ] Can list vault files
- [ ] Can read a simple test file
- [ ] Can write to vault (test with temporary file)
- [ ] No permission errors

### Systematic Troubleshooting Process

#### Phase 1: Environment Verification
1. **Check System Requirements:**
   - Node.js version ≥ 16.x
   - Obsidian is installed and updated
   - Local REST API plugin is latest version

2. **Verify Configuration:**
   ```bash
   # Check environment
   echo "Node: $(node --version)"
   echo "API Key: ${OBSIDIAN_API_KEY:0:8}..." # First 8 chars only
   echo "Host: ${OBSIDIAN_HOST:-127.0.0.1}"
   ```

3. **Test Dependencies:**
   ```bash
   # Check if packages are installed
   npm list --depth=0
   # Check if build is current
   npm run build
   ```

#### Phase 2: Service Verification
1. **Obsidian Service Check:**
   - Verify Obsidian process is running
   - Check vault is loaded (not just Obsidian splash)
   - Confirm plugin list includes Local REST API

2. **Network Connectivity:**
   ```bash
   # Test port availability
   telnet 127.0.0.1 27124
   # Test HTTP response
   curl -k -v https://127.0.0.1:27124/
   ```

3. **Plugin Status Verification:**
   - Settings → Local REST API → Server Status = "Running"
   - Port shows 27124 (or configured port)
   - HTTPS is enabled
   - API key is generated

#### Phase 3: Protocol Testing
1. **MCP Handshake Test:**
   - Initialize server successfully
   - List tools without errors
   - Call simple tool (like list_files_in_vault)

2. **Error Pattern Analysis:**
   - Consistent errors vs intermittent
   - Specific tools vs all tools
   - Startup vs runtime errors

### Issue Classification

Use this decision tree to classify issues:

```
Connection fails?
├─ Yes: Environment/Service issue
│  ├─ Cannot reach port: Obsidian/plugin not running
│  └─ Connection refused: Plugin configuration
└─ No: Authentication/Permission issue
   ├─ 401 errors: API key problem
   ├─ 403 errors: Permission problem
   └─ Other: Protocol/Implementation issue
```

### Common Issue Patterns

#### Pattern: Intermittent Failures
**Symptoms:** Sometimes works, sometimes fails
**Likely Causes:**
- Network timeouts
- Resource contention
- Cache issues
- Plugin instability
**Investigation:** Enable debug logging, monitor resource usage

#### Pattern: Specific Tool Failures
**Symptoms:** Some tools work, others don't
**Likely Causes:**
- Parameter validation errors
- Path encoding issues
- Permission differences
- Tool-specific bugs
**Investigation:** Test similar tools, check parameters

#### Pattern: Startup Failures
**Symptoms:** Server won't start or initialize
**Likely Causes:**
- Missing dependencies
- Configuration errors
- Environment issues
- Port conflicts
**Investigation:** Check logs, verify environment

## Common Misconfigurations

### API Key Issues

#### Incorrect Environment Variable Name
**Problem:**
```bash
# Wrong variable names
export OBSIDIAN_KEY=abc123
export OBSIDIAN_API=abc123
export API_KEY=abc123
```

**Correct Configuration:**
```bash
# Correct variable name
export OBSIDIAN_API_KEY=abc123
```

**Detection:** Check `echo $OBSIDIAN_API_KEY` returns the key

#### API Key with Extra Characters
**Problem:**
```bash
# Key copied with whitespace or quotes
export OBSIDIAN_API_KEY=" abc123 "
export OBSIDIAN_API_KEY='abc123'
```

**Correct Configuration:**
```bash
# Clean key without quotes or spaces
export OBSIDIAN_API_KEY=abc123def456
```

**Detection:** Key length should be exactly as shown in Obsidian

### Claude Desktop Configuration

#### Wrong MCP Server Name
**Problem:**
```json
{
  "mcpServers": {
    "obsidian": {  // Generic name
      "command": "npx",
      "args": ["obsidian-mcp-ts"]
    }
  }
}
```

**Correct Configuration:**
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {  // Specific package name
      "command": "npx",
      "args": ["obsidian-mcp-ts"],
      "env": {
        "OBSIDIAN_API_KEY": "your_key_here"
      }
    }
  }
}
```

#### Missing Environment in Config
**Problem:**
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": ["obsidian-mcp-ts"]
      // Missing env section
    }
  }
}
```

**Fix:** Always include API key in env section for Claude Desktop

### Plugin Configuration Issues

#### HTTPS Disabled
**Problem:** Plugin configured with HTTP instead of HTTPS
**Symptoms:** Connection refused, SSL errors
**Fix:** 
1. Go to Settings → Local REST API
2. Ensure "Enable HTTPS" is checked
3. Restart plugin

#### Wrong Port Configuration
**Problem:** Plugin using non-default port
**Symptoms:** Connection refused on 27124
**Detection:**
```bash
# Check what port plugin is actually using
lsof -i | grep Obsidian
```
**Fix:** Either change plugin to use 27124 or update OBSIDIAN_HOST env var

#### Plugin Not Auto-Starting
**Problem:** Plugin disabled after Obsidian restart
**Symptoms:** Works initially, fails after restart
**Fix:**
1. Settings → Community plugins
2. Find Local REST API
3. Ensure it's in the enabled list
4. Check "Auto-enable" if available

### Path and File Issues

#### Backslash Path Separators
**Problem:**
```javascript
// Windows-style paths
const path = "folder\\subfolder\\file.md";
```

**Correct Configuration:**
```javascript
// Always use forward slashes
const path = "folder/subfolder/file.md";
```

#### Unencoded Special Characters
**Problem:**
```
# Paths with spaces and special chars
My Notes & Ideas (2024).md
```

**Correct Encoding:**
```
# URL-encoded version
My%20Notes%20%26%20Ideas%20%282024%29.md
```

### Development Environment Issues

#### Node Version Mismatch
**Problem:** Using Node.js < 16.x
**Symptoms:** ES module errors, async/await issues
**Fix:**
```bash
# Check version
node --version
# Update if needed (use nvm)
nvm install 16
nvm use 16
```

#### Missing TypeScript Build
**Problem:** Running from source without build
**Symptoms:** Import errors, "cannot find module"
**Fix:**
```bash
# Always build before running
npm run build
npm start
```

#### Stale node_modules
**Problem:** Dependencies out of sync
**Symptoms:** Module not found, version conflicts
**Fix:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Performance Misconfigurations

#### Cache TTL Too Short
**Problem:** Cache expiring too quickly
**Symptoms:** Slow performance on repeated operations
**Fix:** Increase cache TTL in configuration

#### Batch Size Too Large
**Problem:** Processing too many items at once
**Symptoms:** Memory errors, timeouts
**Fix:** Reduce batch size in BatchProcessor configuration

#### No Request Deduplication
**Problem:** Duplicate concurrent requests
**Symptoms:** High API usage, rate limiting
**Fix:** Ensure RequestDeduplicator is properly configured

## Debugging Tips

### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG=obsidian-mcp:*

# Run with verbose logging
npm run dev
```

### Check Server Logs
On macOS:
```bash
tail -f ~/Library/Logs/Claude/mcp-server-obsidian-mcp-ts.log
```

### Use MCP Inspector
For interactive debugging:
```bash
npx @modelcontextprotocol/inspector tsx src/index.ts
```

### Test Individual Tools
1. Start the inspector
2. Initialize the server
3. List available tools
4. Test specific tool calls with sample data

### Common Debugging Steps
1. Verify Obsidian is running
2. Check API key is correct
3. Test basic connectivity
4. Review error messages
5. Check logs for details
6. Test with MCP Inspector

## FAQ

### Q: Why do I get SSL certificate warnings?
**A:** The Local REST API uses self-signed certificates. This is normal for local development. The MCP server automatically handles this.

### Q: Can I use this with remote Obsidian vaults?
**A:** No, this server only works with local Obsidian instances due to the Local REST API plugin limitation.

### Q: How do I update to a new version?
**A:** 
```bash
npm update obsidian-mcp-ts
# or
npm install obsidian-mcp-ts@latest
```

### Q: Why are some operations slow on large vaults?
**A:** Large vaults require optimization. Use pagination, caching, and batch operations. See [Performance Issues](#performance-issues) section.

### Q: Can I use this without Claude Desktop?
**A:** Yes, the MCP server can be used with any MCP-compatible client. Use the MCP Inspector for testing.

### Q: How do I report bugs?
**A:** Open an issue on the GitHub repository with:
- Error messages
- Steps to reproduce
- Environment details (OS, Node version, etc.)
- Relevant logs

### Q: Is this safe to use with my vault?
**A:** Yes, but always:
- Keep backups of your vault
- Test operations on non-critical data first
- Review the tool permissions

### Q: What Obsidian features are not supported?
**A:** Currently not supported:
- Canvas files
- Graph view operations
- Plugin-specific features (except Local REST API)
- Binary file operations