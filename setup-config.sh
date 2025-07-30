#!/bin/bash
# Obsidian MCP Server Configuration Setup Script

set -e

echo "Obsidian MCP Server Configuration Setup"
echo "======================================="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default config directory
CONFIG_DIR="$HOME/.config/mcp"
CONFIG_FILE="$CONFIG_DIR/obsidian.json"

# Check if config already exists
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Configuration file already exists at: $CONFIG_FILE${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Create config directory if it doesn't exist
echo "Creating configuration directory..."
mkdir -p "$CONFIG_DIR"

# Get API key from user
echo
echo "Enter your Obsidian REST API key"
echo "(Found in Obsidian → Settings → Community Plugins → Local REST API)"
read -p "API Key: " API_KEY

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: API key cannot be empty${NC}"
    exit 1
fi

# Get host from user
echo
echo "Enter the host where Obsidian is running"
echo "(Press Enter for default: 127.0.0.1)"
read -p "Host [127.0.0.1]: " HOST

# Use default if empty
HOST=${HOST:-127.0.0.1}

# Create the configuration file
echo
echo "Creating configuration file..."
cat > "$CONFIG_FILE" << EOF
{
  "apiKey": "$API_KEY",
  "host": "$HOST"
}
EOF

# Set appropriate permissions
chmod 600 "$CONFIG_FILE"

echo -e "${GREEN}✓ Configuration created successfully!${NC}"
echo
echo "Configuration file location: $CONFIG_FILE"
echo

# Test the configuration
echo "Testing configuration..."
if command -v npx &> /dev/null; then
    echo "You can now test the server with:"
    echo "  npx @modelcontextprotocol/inspector npx obsidian-mcp-ts"
else
    echo "Note: npx not found. Install Node.js to use the MCP server."
fi

echo
echo "To use a different configuration file, set:"
echo "  export OBSIDIAN_CONFIG_FILE=/path/to/your/config.json"
echo
echo -e "${GREEN}Setup complete!${NC}"