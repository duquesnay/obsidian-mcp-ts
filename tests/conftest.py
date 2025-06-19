"""Pytest configuration and fixtures."""

import os
import pytest
from unittest.mock import patch


@pytest.fixture
def mock_api_key():
    """Mock the API key for unit tests only."""
    with patch.dict(os.environ, {'OBSIDIAN_API_KEY': 'test-api-key'}):
        yield