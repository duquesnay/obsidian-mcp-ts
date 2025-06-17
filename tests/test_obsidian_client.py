"""Unit tests for the Obsidian client."""

import os
import json
import pytest
from unittest.mock import Mock, patch
from mcp_obsidian.obsidian import Obsidian


class TestObsidianClient:
    """Test cases for Obsidian client methods."""
    
    @pytest.fixture
    def client(self):
        """Create an Obsidian client instance for testing."""
        return Obsidian(api_key='test-key', host='127.0.0.1')
    
    def test_rename_file_success(self, client):
        """Test successful file rename operation."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "message": "File successfully renamed",
            "oldPath": "old-file.md",
            "newPath": "new-file.md"
        }
        
        with patch('requests.post', return_value=mock_response) as mock_post:
            result = client.rename_file('old-file.md', 'new-file.md')
            
            # Verify the request
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            
            # Check URL construction
            expected_url = 'https://127.0.0.1:27124/vault/old-file.md/rename'
            assert call_args[0][0] == expected_url
            
            # Check headers
            headers = call_args[1]['headers']
            assert headers['Authorization'] == 'Bearer test-key'
            assert headers['Content-Type'] == 'application/json'
            
            # Check JSON body
            assert call_args[1]['json'] == {'newPath': 'new-file.md'}
            
            # Check SSL and timeout
            assert call_args[1]['verify'] == False
            assert call_args[1]['timeout'] == (3, 6)
    
    def test_rename_file_with_special_characters(self, client):
        """Test renaming files with spaces and special characters."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "File successfully renamed"}
        
        with patch('requests.post', return_value=mock_response) as mock_post:
            client.rename_file('folder/file with spaces.md', 'folder/new-file.md')
            
            # Check URL encoding (preserve forward slashes)
            expected_url = 'https://127.0.0.1:27124/vault/folder/file%20with%20spaces.md/rename'
            actual_url = mock_post.call_args[0][0]
            assert actual_url == expected_url
    
    def test_rename_file_not_found(self, client):
        """Test rename operation when source file doesn't exist."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.json.return_value = {
            "errorCode": 40404,
            "message": "File not found"
        }
        mock_response.raise_for_status.side_effect = Exception("Error 40404: File not found")
        
        with patch('requests.post', return_value=mock_response):
            with pytest.raises(Exception) as exc_info:
                client.rename_file('nonexistent.md', 'new.md')
            
            assert "40404" in str(exc_info.value)
            assert "File not found" in str(exc_info.value)
    
    def test_rename_file_destination_exists(self, client):
        """Test rename operation when destination already exists."""
        mock_response = Mock()
        mock_response.status_code = 409
        mock_response.json.return_value = {
            "errorCode": 40901,
            "message": "Destination file already exists"
        }
        mock_response.raise_for_status.side_effect = Exception("Error 40901: Destination file already exists")
        
        with patch('requests.post', return_value=mock_response):
            with pytest.raises(Exception) as exc_info:
                client.rename_file('source.md', 'existing.md')
            
            assert "40901" in str(exc_info.value)
            assert "Destination file already exists" in str(exc_info.value)
    
    def test_rename_file_custom_host(self):
        """Test rename with custom host configuration."""
        client = Obsidian(api_key='test-key', host='192.168.1.100', port=8080)
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "Success"}
        
        with patch('requests.post', return_value=mock_response) as mock_post:
            client.rename_file('test.md', 'renamed.md')
            
            # Check custom host in URL
            expected_url = 'https://192.168.1.100:8080/vault/test.md/rename'
            assert mock_post.call_args[0][0] == expected_url