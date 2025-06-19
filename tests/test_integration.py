"""Integration tests for mcp-obsidian.

These tests require a running Obsidian instance with the REST API plugin.
They are skipped by default unless the OBSIDIAN_API_KEY environment variable is set.
"""

import os
import pytest
import requests
from dotenv import load_dotenv
from mcp_obsidian.obsidian import Obsidian

# Load environment variables from .env file
load_dotenv()


@pytest.mark.skipif(
    not os.getenv('OBSIDIAN_API_KEY') or os.getenv('OBSIDIAN_API_KEY') == 'test-api-key',
    reason="Integration tests require real OBSIDIAN_API_KEY"
)
class TestObsidianIntegration:
    """Integration tests that run against a real Obsidian instance."""
    
    @pytest.fixture
    def client(self):
        """Create a real Obsidian client."""
        api_key = os.getenv('OBSIDIAN_API_KEY')
        host = os.getenv('OBSIDIAN_HOST', '127.0.0.1')
        return Obsidian(api_key=api_key, host=host)
    
    @pytest.fixture
    def test_file_path(self):
        """Path for test files."""
        return "test-integration-rename.md"
    
    @pytest.fixture
    def renamed_file_path(self):
        """Path for renamed test files."""
        return "test-integration-renamed.md"
    
    def cleanup_files(self, client, *file_paths):
        """Clean up test files."""
        for path in file_paths:
            try:
                client.delete_file(path)
            except:
                pass  # File might not exist
    
    def test_rename_file_integration(self, client, test_file_path, renamed_file_path):
        """Test the complete rename workflow."""
        # Rename endpoint is now available
        
        # Clean up any existing test files
        self.cleanup_files(client, test_file_path, renamed_file_path)
        
        try:
            # Create a test file
            test_content = "# Integration Test\n\nThis file will be renamed."
            client.append_content(test_file_path, test_content)
            
            # Verify file was created
            content = client.get_file_contents(test_file_path)
            assert test_content in content
            
            # Rename the file
            client.rename_file(test_file_path, renamed_file_path)
            
            # Verify new file exists
            new_content = client.get_file_contents(renamed_file_path)
            assert test_content in new_content
            
            # Verify old file is gone
            with pytest.raises(Exception) as exc_info:
                client.get_file_contents(test_file_path)
            assert "404" in str(exc_info.value) or "not found" in str(exc_info.value).lower()
            
        finally:
            # Clean up
            self.cleanup_files(client, test_file_path, renamed_file_path)
    
    def test_rename_file_with_links_integration(self, client):
        """Test renaming a file that has incoming links."""
        # Rename endpoint is now available
        
        source_file = "test-integration-source.md"
        target_file = "test-integration-target.md"
        renamed_target = "test-integration-target-renamed.md"
        
        # Clean up
        self.cleanup_files(client, source_file, target_file, renamed_target)
        
        try:
            # Create target file
            client.append_content(target_file, "# Target File\n\nThis file will be linked to.")
            
            # Create source file with link
            client.append_content(source_file, f"# Source File\n\nThis links to [[{target_file}]].")
            
            # Rename the target file
            client.rename_file(target_file, renamed_target)
            
            # Check if link was updated in source file
            source_content = client.get_file_contents(source_file)
            
            # Note: Link update depends on Obsidian settings
            # This test documents the behavior rather than asserting it
            if f"[[{renamed_target}]]" in source_content:
                print("✓ Links were automatically updated")
            else:
                print("✗ Links were not automatically updated (check Obsidian settings)")
            
        finally:
            # Clean up
            self.cleanup_files(client, source_file, target_file, renamed_target)
    
    def test_rename_endpoint_availability(self, client):
        """Test if the rename endpoint is available."""
        # Test the rename endpoint by attempting a simple rename
        test_file = "test-endpoint-check.md"
        renamed_file = "test-endpoint-renamed.md"
        
        try:
            # Create a test file
            client.append_content(test_file, "# Test")
            
            # Try to rename it
            client.rename_file(test_file, renamed_file)
            
            # If we get here, the endpoint is available
            # Clean up
            client.delete_file(renamed_file)
            
        except Exception as e:
            # Clean up original file if rename failed
            try:
                client.delete_file(test_file)
            except:
                pass
            pytest.fail(f"Rename endpoint not available: {str(e)}")
    
    def test_basic_file_operations(self, client):
        """Test basic file operations to verify API connection."""
        test_file = "test-integration-basic.md"
        test_content = "# Test File\n\nThis is a basic integration test."
        
        try:
            # Create a file
            client.append_content(test_file, test_content)
            
            # Read it back
            content = client.get_file_contents(test_file)
            assert test_content in content
            
            # List files to ensure it appears
            files = client.list_files_in_vault()
            assert test_file in files
            
            # Delete it
            client.delete_file(test_file)
            
            # Verify it's gone
            with pytest.raises(Exception) as exc_info:
                client.get_file_contents(test_file)
            assert "404" in str(exc_info.value) or "not found" in str(exc_info.value).lower()
            
        finally:
            # Clean up just in case
            try:
                client.delete_file(test_file)
            except:
                pass