# Security Guidelines for Obsidian MCP Server

## Overview

This document outlines the security considerations and best practices for the Obsidian MCP (Model Context Protocol) server, which interfaces with Obsidian vaults via the Local REST API plugin. Due to the local-only nature of the Obsidian REST API, certain security trade-offs have been made to ensure functionality.

## SSL Verification and Local Connections

### Why SSL Verification is Disabled

The Obsidian Local REST API plugin runs on `https://127.0.0.1:27124` with a self-signed certificate. This creates several challenges:

1. **Self-signed Certificate**: The certificate is not issued by a trusted Certificate Authority (CA)
2. **Dynamic Certificate Generation**: Each Obsidian installation generates its own certificate
3. **Local-only Access**: The API is designed to be accessed only from localhost
4. **No Certificate Management**: There's no built-in mechanism to trust or manage these certificates

To ensure reliable connectivity, SSL verification is disabled in the client configuration:

```typescript
// In src/tools/base.ts and src/resources/BaseResourceHandler.ts
const client = new ObsidianClient({
  apiKey: config.apiKey,
  host: config.host,
  port: config.port,
  verifySsl: false  // Disable SSL verification for self-signed Obsidian certificates
});
```

This setting is implemented at the client level and affects all HTTP requests to the Obsidian REST API.

### Security Implications

While disabling SSL verification has security implications, the risk is mitigated by:

- **Localhost-only binding**: The API only listens on 127.0.0.1, not on network interfaces
- **API Key Authentication**: All requests require a valid API key
- **Local process communication**: Traffic never leaves the local machine

## API Key Security

### Best Practices

1. **Generate Strong Keys**: Use the Obsidian plugin's key generation feature
2. **Environment Variables**: Store keys in environment variables, never in code
3. **Secure Storage**: Use secure credential storage for production deployments
4. **Key Rotation**: Regularly rotate API keys, especially if exposed
5. **Minimal Permissions**: Use separate keys for different applications

### Configuration Examples

**Development** (`.env` file):
```bash
OBSIDIAN_API_KEY=your_secure_key_here
```

**Production** (Environment variables):
```bash
export OBSIDIAN_API_KEY="your_secure_key_here"
```

**Claude Desktop** (config file):
```json
{
  "mcpServers": {
    "obsidian-mcp-ts": {
      "command": "npx",
      "args": ["obsidian-mcp-ts"],
      "env": {
        "OBSIDIAN_API_KEY": "your_secure_key_here"
      }
    }
  }
}
```

## Self-signed Certificate Challenges

### Technical Challenges

1. **Certificate Validation**: Node.js rejects self-signed certificates by default
2. **Certificate Pinning**: Not feasible due to dynamic certificate generation
3. **Trust Store Management**: No standard way to add certificates to system trust
4. **Cross-platform Differences**: Certificate handling varies by OS

### Mitigation Strategies

1. **Validate Host**: Always verify connection is to 127.0.0.1
2. **Port Verification**: Ensure connection is to expected port (27124)
3. **API Key Validation**: Rely on API key as primary authentication
4. **Connection Encryption**: Even with disabled verification, TLS encryption is active

## Obsidian Local REST API Security Model

### Design Philosophy

The Obsidian Local REST API follows a specific security model:

1. **Local-first**: Designed for local access only
2. **Explicit Enablement**: Must be manually enabled by user
3. **Key-based Auth**: Requires explicit key generation
4. **No Network Access**: Cannot be accessed from network

### Security Boundaries

- **Process Isolation**: Runs within Obsidian's process
- **Filesystem Access**: Limited to configured vault
- **No Remote Access**: Cannot be exposed to internet
- **User Control**: User must explicitly enable and configure

## Recommended Security Practices

### For Developers

1. **Validate Inputs**: Always validate and sanitize file paths
2. **Path Traversal Protection**: Prevent access outside vault
3. **Error Handling**: Don't expose sensitive information in errors
4. **Audit Logging**: Log access attempts for security monitoring
5. **Least Privilege**: Request only necessary permissions

### For Users

1. **Secure Key Storage**: Never share or commit API keys
2. **Regular Updates**: Keep Obsidian and plugins updated
3. **Vault Permissions**: Use OS-level permissions for sensitive vaults
4. **Access Monitoring**: Monitor MCP server logs for unusual activity
5. **Disable When Unused**: Turn off REST API when not needed

## Secure Local Development Setup

### Development Environment

1. **Use .env Files**: Store development keys in `.env` (git-ignored)
2. **Separate Keys**: Use different keys for dev/test/prod
3. **Local Testing**: Always test with local Obsidian instance
4. **Mock Services**: Use mocks for automated testing

### Testing Security

```bash
# Verify localhost-only binding
curl -k https://127.0.0.1:27124/

# Test from external IP (should fail)
curl -k https://[your-ip]:27124/

# Verify API key requirement
curl -k https://127.0.0.1:27124/vault/ -H "Authorization: Bearer invalid_key"

# Test with valid API key (should succeed)
curl -k https://127.0.0.1:27124/vault/ -H "Authorization: Bearer your_api_key_here"

# Verify SSL verification is properly disabled (should not show certificate errors)
npm run test:integration
```

### Configuration Validation

Ensure your development setup follows security best practices:

```bash
# Check that API key is not in version control
git log --all --full-history -- .env
git log --all --full-history -- "*.key"

# Verify .env is properly ignored
git check-ignore .env

# Test MCP server authentication
npx @modelcontextprotocol/inspector tsx src/index.ts
```

## Alternative Security Measures

### If Higher Security is Required

1. **Proxy Server**: Implement a proxy with proper certificates
2. **VPN/Tunnel**: Use secure tunnels for remote access
3. **Certificate Management**: Implement custom certificate validation
4. **Network Isolation**: Run in isolated network namespace
5. **Audit Trail**: Implement comprehensive logging

### Future Improvements

Potential enhancements to consider:

1. **Certificate Pinning**: Pin known certificates per installation
2. **Mutual TLS**: Implement client certificate authentication
3. **Token Rotation**: Automatic API key rotation
4. **Rate Limiting**: Prevent brute force attempts
5. **IP Allowlisting**: Restrict to specific local IPs

## Incident Response

### If API Key is Exposed

1. **Regenerate Immediately**: Generate new key in Obsidian
2. **Update Configuration**: Update all MCP server configs
3. **Check Logs**: Review access logs for unauthorized use
4. **Audit Vault**: Check for unauthorized modifications
5. **Update Security**: Review how exposure occurred

### Security Monitoring

Monitor these indicators:

- Unexpected MCP server connections
- Failed authentication attempts
- Unusual file access patterns
- Performance degradation (potential DoS)
- Error spike in logs

## Related Documentation

For additional security-related information, see:

- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - SSL certificate issues and API key problems
- **[README.md](./README.md)** - API key configuration and authentication setup  
- **[TESTING.md](./TESTING.md)** - Security considerations for testing environments
- **[docs/RESOURCES.md](./docs/RESOURCES.md)** - Authentication requirements for MCP resources

## Conclusion

The security model of the Obsidian MCP server prioritizes functionality for local development while maintaining reasonable security boundaries. The localhost-only design and API key authentication provide adequate security for the intended use case. Users requiring higher security should implement additional measures based on their threat model.

The deliberate decision to disable SSL verification for localhost connections is well-documented and implemented consistently across the codebase. This trade-off enables reliable operation with Obsidian's self-signed certificates while maintaining encryption for data in transit.

For security concerns or vulnerability reports, please follow responsible disclosure practices and report to the project maintainers.