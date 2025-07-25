# Troubleshooting Guide

This guide helps you resolve common issues with the Obsidian MCP TypeScript server.

## Table of Contents

- [Common Setup Issues](#common-setup-issues)
- [Connection Problems](#connection-problems)
- [Authentication Errors](#authentication-errors)
- [Performance Issues](#performance-issues)
- [Error Messages Guide](#error-messages-guide)
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

### Cannot Connect to Obsidian
1. **Check if Obsidian is running**
   - Obsidian must be open for the REST API to work

2. **Verify Local REST API plugin is enabled**
   - Go to Settings → Community plugins
   - Ensure "Local REST API" is enabled

3. **Test the connection manually**
   ```bash
   curl -k https://127.0.0.1:27124/
   ```

### Port Already in Use
If you see "EADDRINUSE" errors:
- The default port (27124) might be in use
- Check if another instance is running
- Restart Obsidian and the plugin

### SSL Certificate Issues
The server uses self-signed certificates. If you encounter SSL errors:
- The MCP server automatically disables SSL verification for local connections
- This is expected behavior for local development

## Authentication Errors

### Invalid API Key
If you receive 401 Unauthorized errors:
1. Generate a new API key in Obsidian:
   - Settings → Local REST API → API Key
2. Update your environment variable:
   ```bash
   export OBSIDIAN_API_KEY=your_new_key_here
   ```

### API Key Not Found
Ensure the API key is set in your environment:
```bash
# Check if it's set
echo $OBSIDIAN_API_KEY

# Set it if missing
export OBSIDIAN_API_KEY=your_key_here
```

### Permission Denied Errors
- Check that the API key has the necessary permissions
- Regenerate the key if needed
- Ensure the plugin is properly configured

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

### Common Error Codes
- **400 Bad Request**: Invalid parameters or malformed request
- **401 Unauthorized**: Invalid or missing API key
- **403 Forbidden**: Operation not permitted
- **404 Not Found**: File or resource doesn't exist
- **500 Internal Server Error**: Server-side issue

### MCP-Specific Errors
- **InvalidRequest**: Check your request parameters
- **InternalError**: Check server logs for details
- **MethodNotFound**: Tool name might be incorrect

### Parsing Errors
If you encounter JSON parsing errors:
- Check for invalid characters in file names
- Ensure proper UTF-8 encoding
- Validate JSON structure in requests

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