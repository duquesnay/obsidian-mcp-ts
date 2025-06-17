"""Pytest configuration and fixtures."""

import os
import pytest
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_api_key():
    """Automatically mock the API key for all tests."""
    with patch.dict(os.environ, {'OBSIDIAN_API_KEY': 'test-api-key'}):
        yield