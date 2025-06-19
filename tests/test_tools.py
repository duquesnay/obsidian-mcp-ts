"""Unit tests for MCP tools."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from mcp_obsidian.tools import (
    AppendContentToolHandler,
    PatchContentToolHandler,
    DeleteFileToolHandler,
    ComplexSearchToolHandler,
    RenameFileToolHandler
)


class TestToolHandlers:
    """Test cases for MCP tool handlers."""
    
    @pytest.fixture(autouse=True)
    def setup_env(self, monkeypatch):
        """Set up environment variables for testing."""
        monkeypatch.setenv('OBSIDIAN_API_KEY', 'test-api-key')
        monkeypatch.setenv('OBSIDIAN_HOST', 'test-host')
    
    def test_append_content_handler(self):
        """Test AppendContentToolHandler creates Obsidian client correctly."""
        handler = AppendContentToolHandler()
        
        # Mock the Obsidian class
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            # Call the tool
            args = {'filepath': 'test.md', 'content': 'test content'}
            result = handler.run_tool(args)
            
            # Verify Obsidian client was created with correct parameters
            mock_obsidian_class.assert_called_once_with(
                api_key='test-api-key',
                host='test-host'
            )
            
            # Verify append_content was called
            mock_client.append_content.assert_called_once_with('test.md', 'test content')
            
            # Verify result
            assert len(result) == 1
            assert result[0].text == "Successfully appended content to test.md"
    
    def test_patch_content_handler(self):
        """Test PatchContentToolHandler creates Obsidian client correctly."""
        handler = PatchContentToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            args = {
                'filepath': 'test.md',
                'operation': 'append',
                'target_type': 'heading',
                'target': 'Test Section',
                'content': 'new content'
            }
            result = handler.run_tool(args)
            
            # Verify Obsidian client was created correctly
            mock_obsidian_class.assert_called_once_with(
                api_key='test-api-key',
                host='test-host'
            )
            
            # Verify patch_content was called
            mock_client.patch_content.assert_called_once_with(
                'test.md', 'append', 'heading', 'Test Section', 'new content'
            )
    
    def test_delete_file_handler(self):
        """Test DeleteFileToolHandler creates Obsidian client correctly."""
        handler = DeleteFileToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            args = {'filepath': 'test.md', 'confirm': True}
            result = handler.run_tool(args)
            
            # Verify Obsidian client was created correctly
            mock_obsidian_class.assert_called_once_with(
                api_key='test-api-key',
                host='test-host'
            )
            
            # Verify delete_file was called
            mock_client.delete_file.assert_called_once_with('test.md')
    
    def test_complex_search_handler(self):
        """Test ComplexSearchToolHandler creates Obsidian client correctly."""
        handler = ComplexSearchToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_client.search_json.return_value = []
            mock_obsidian_class.return_value = mock_client
            
            args = {'query': {'==': [{'var': 'file.name'}, 'test.md']}}
            result = handler.run_tool(args)
            
            # Verify Obsidian client was created correctly
            mock_obsidian_class.assert_called_once_with(
                api_key='test-api-key',
                host='test-host'
            )
            
            # Verify search_json was called
            mock_client.search_json.assert_called_once_with(
                {'==': [{'var': 'file.name'}, 'test.md']}
            )
    
    def test_rename_file_handler(self):
        """Test RenameFileToolHandler creates Obsidian client correctly."""
        handler = RenameFileToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            args = {'old_path': 'old.md', 'new_path': 'new.md'}
            result = handler.run_tool(args)
            
            # Verify Obsidian client was created correctly
            mock_obsidian_class.assert_called_once_with(
                api_key='test-api-key',
                host='test-host'
            )
            
            # Verify rename_file was called
            mock_client.rename_file.assert_called_once_with('old.md', 'new.md')
    
    def test_rename_file_handler_rejects_cross_directory(self):
        """Test RenameFileToolHandler rejects renames across directories."""
        handler = RenameFileToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            # Try to rename across directories
            args = {'old_path': 'folder1/old.md', 'new_path': 'folder2/new.md'}
            
            with pytest.raises(RuntimeError, match="different director"):
                handler.run_tool(args)
            
            # Client should not be called for invalid rename
            mock_client.rename_file.assert_not_called()
    
    def test_rename_file_handler_accepts_same_directory(self):
        """Test RenameFileToolHandler accepts renames within same directory."""
        handler = RenameFileToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            # Rename within same directory
            args = {'old_path': 'folder/old.md', 'new_path': 'folder/new.md'}
            result = handler.run_tool(args)
            
            # Verify rename was called
            mock_client.rename_file.assert_called_once_with('folder/old.md', 'folder/new.md')
    
    def test_move_file_handler(self):
        """Test MoveFileToolHandler handles cross-directory moves."""
        from mcp_obsidian.tools import MoveFileToolHandler
        handler = MoveFileToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            # Move file to different directory
            args = {'old_path': 'folder1/file.md', 'new_path': 'folder2/file.md'}
            result = handler.run_tool(args)
            
            # Verify rename_file was called (uses same API method)
            mock_client.rename_file.assert_called_once_with('folder1/file.md', 'folder2/file.md')
            
            # Verify result message
            assert len(result) == 1
            assert "moved" in result[0].text.lower()
    
    def test_move_file_handler_with_rename(self):
        """Test MoveFileToolHandler handles move with rename."""
        from mcp_obsidian.tools import MoveFileToolHandler
        handler = MoveFileToolHandler()
        
        with patch('mcp_obsidian.tools.obsidian.Obsidian') as mock_obsidian_class:
            mock_client = Mock()
            mock_obsidian_class.return_value = mock_client
            
            # Move and rename file
            args = {'old_path': 'folder1/old.md', 'new_path': 'folder2/new.md'}
            result = handler.run_tool(args)
            
            # Verify rename_file was called
            mock_client.rename_file.assert_called_once_with('folder1/old.md', 'folder2/new.md')
    
    def test_handler_missing_env_vars(self, monkeypatch):
        """Test that handlers fail gracefully when API key is missing."""
        monkeypatch.delenv('OBSIDIAN_API_KEY')
        
        handler = AppendContentToolHandler()
        
        with pytest.raises(ValueError, match="OBSIDIAN_API_KEY environment variable required"):
            handler.run_tool({'filepath': 'test.md', 'content': 'test'})