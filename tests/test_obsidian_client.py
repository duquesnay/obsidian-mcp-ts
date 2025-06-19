"""Unit tests for the Obsidian client."""

import os
import json
import pytest
from unittest.mock import Mock, patch
from mcp_obsidian.obsidian import Obsidian


class TestObsidianClient:
    """Test cases for Obsidian client methods."""
    
    @pytest.fixture
    def client(self, mock_api_key):
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
        
        with patch('requests.patch', return_value=mock_response) as mock_patch:
            result = client.rename_file('old-file.md', 'new-file.md')
            
            # Verify the request
            mock_patch.assert_called_once()
            call_args = mock_patch.call_args
            
            # Check URL construction
            expected_url = 'https://127.0.0.1:27124/vault/old-file.md'
            assert call_args[0][0] == expected_url
            
            # Check headers
            headers = call_args[1]['headers']
            assert headers['Authorization'] == 'Bearer test-key'
            assert headers['Content-Type'] == 'text/plain'
            assert headers['Operation'] == 'rename'
            assert headers['Target-Type'] == 'file'
            assert headers['Target'] == 'name'
            
            # Check body (new filename only, no path)
            assert call_args[1]['data'] == 'new-file.md'
            
            # Check SSL and timeout
            assert call_args[1]['verify'] == False
            assert call_args[1]['timeout'] == (3, 6)
    
    def test_rename_file_with_special_characters(self, client):
        """Test renaming files with spaces and special characters."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "File successfully renamed"}
        
        with patch('requests.patch', return_value=mock_response) as mock_patch:
            client.rename_file('folder/file with spaces.md', 'folder/new-file.md')
            
            # Check URL encoding (preserve forward slashes)
            expected_url = 'https://127.0.0.1:27124/vault/folder/file%20with%20spaces.md'
            actual_url = mock_patch.call_args[0][0]
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
        
        with patch('requests.patch', return_value=mock_response):
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
        
        with patch('requests.patch', return_value=mock_response):
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
        
        with patch('requests.patch', return_value=mock_response) as mock_patch:
            client.rename_file('test.md', 'renamed.md')
            
            # Check custom host in URL
            expected_url = 'https://192.168.1.100:8080/vault/test.md'
            assert mock_patch.call_args[0][0] == expected_url
    
    def test_move_file_success(self):
        """Test successful file move with new API signature."""
        client = Obsidian(api_key='test-key', host='localhost')
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status = Mock()
        
        with patch('requests.patch', return_value=mock_response) as mock_patch:
            result = client.move_file('folder1/test.md', 'folder2/test.md')
            
            # Verify request details
            mock_patch.assert_called_once()
            call_args = mock_patch.call_args
            
            # Check URL
            expected_url = 'https://localhost:27124/vault/folder1/test.md'
            assert call_args[0][0] == expected_url
            
            # Check headers for new move operation
            headers = call_args[1]['headers']
            assert headers['Operation'] == 'move'
            assert headers['Target-Type'] == 'file'
            assert headers['Target'] == 'path'
            assert headers['Content-Type'] == 'text/plain'
            
            # Check body contains new path
            assert call_args[1]['data'] == 'folder2/test.md'
            
            # Result should be None for successful move
            assert result is None
    
    def test_move_file_with_rename(self):
        """Test moving file to different directory with name change."""
        client = Obsidian(api_key='test-key', host='localhost')
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status = Mock()
        
        with patch('requests.patch', return_value=mock_response) as mock_patch:
            result = client.move_file('folder1/old.md', 'folder2/new.md')
            
            # Verify the move operation handles both directory and name change
            assert mock_patch.call_args[1]['data'] == 'folder2/new.md'
            assert mock_patch.call_args[1]['headers']['Operation'] == 'move'