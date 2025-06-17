# Testing Guide

## Overview

This project uses pytest for testing with two types of tests:
1. **Unit tests** - Run without any external dependencies
2. **Integration tests** - Require a real Obsidian instance with REST API plugin

## Running Tests

### Unit Tests (No Setup Required)

```bash
# Run all unit tests
uv run pytest tests/test_obsidian_client.py

# Run all tests (integration tests will be skipped)
uv run pytest
```

### Integration Tests (Requires Obsidian)

1. **Set up Obsidian**:
   - Install and open Obsidian
   - Install the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) community plugin
   - Enable the plugin and copy the API key from settings

2. **Configure environment**:
   ```bash
   # Create .env file (already in .gitignore)
   echo "OBSIDIAN_API_KEY=your-api-key-here" > .env
   echo "OBSIDIAN_HOST=127.0.0.1" >> .env
   ```

3. **Run integration tests**:
   ```bash
   # Run only integration tests
   uv run pytest tests/test_integration.py
   
   # Run all tests including integration
   uv run pytest -v
   ```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest configuration and fixtures
├── test_obsidian_client.py  # Unit tests (mocked)
└── test_integration.py      # Integration tests (real Obsidian)
```

## Writing New Tests

### Unit Tests
```python
def test_new_feature(self, client):
    """Test description."""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"result": "success"}
    
    with patch('requests.post', return_value=mock_response):
        result = client.new_method()
        assert result == expected_value
```

### Integration Tests
```python
@pytest.mark.skipif(
    not os.getenv('OBSIDIAN_API_KEY'),
    reason="Integration tests require real OBSIDIAN_API_KEY"
)
def test_real_feature(self, client):
    """Test against real Obsidian."""
    # Test implementation
```

## Security Notes

- **Never commit API keys**: The `.env` file is in `.gitignore`
- **Use environment variables**: All sensitive data comes from environment
- **CI/CD secrets**: Use GitHub secrets for automated testing
- **Test vaults**: Use a dedicated test vault, not your personal notes

## Troubleshooting

### "OBSIDIAN_API_KEY environment variable required"
- For unit tests: This shouldn't happen, check that conftest.py is being loaded
- For integration tests: Create a `.env` file with your API key

### "Connection refused" errors
- Ensure Obsidian is running
- Check the REST API plugin is enabled
- Verify the port (default: 27124 for HTTPS)

### Integration tests are skipped
- This is normal if no API key is provided
- Set OBSIDIAN_API_KEY environment variable to run them