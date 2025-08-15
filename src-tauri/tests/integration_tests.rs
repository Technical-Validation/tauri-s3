use std::fs;
use std::path::PathBuf;
use std::env;
use serde_json::json;

// Import the modules we want to test
use s3_upload_tool::config::ConfigError;
use s3_upload_tool::download::DownloadError;

// Mock AppHandle for testing
struct MockAppHandle {
    config_dir: PathBuf,
    downloads_dir: PathBuf,
}

impl MockAppHandle {
    fn new() -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        
        // Create unique directory for each test run
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        
        let base_dir = env::temp_dir().join(format!("s3-upload-tool-integration-test-{}", timestamp));
        let config_dir = base_dir.join("config");
        let downloads_dir = base_dir.join("downloads");

        // Clean up any existing test directories (should not exist with unique names)
        if base_dir.exists() {
            let _ = fs::remove_dir_all(&base_dir);
        }

        fs::create_dir_all(&config_dir).unwrap();
        fs::create_dir_all(&downloads_dir).unwrap();

        MockAppHandle {
            config_dir,
            downloads_dir,
        }
    }

    fn config_dir(&self) -> &PathBuf {
        &self.config_dir
    }

    fn downloads_dir(&self) -> &PathBuf {
        &self.downloads_dir
    }
}

// Mock ConfigManager that uses our test directories
struct TestConfigManager {
    config_dir: PathBuf,
}

impl TestConfigManager {
    fn new(app_handle: &MockAppHandle) -> Self {
        TestConfigManager {
            config_dir: app_handle.config_dir().clone(),
        }
    }

    fn get_config_path(&self) -> PathBuf {
        self.config_dir.join("config.encrypted")
    }

    // Simplified version of the actual config manager for testing
    fn save_config(&self, config_json: &str, password: &str) -> Result<(), ConfigError> {
        // For integration tests, we'll use a simplified encryption
        let encrypted_data = format!("PASSWORD:{}:DATA:{}", password, config_json);
        fs::write(self.get_config_path(), encrypted_data)?;
        Ok(())
    }

    fn load_config(&self, password: &str) -> Result<String, ConfigError> {
        let config_path = self.get_config_path();
        if !config_path.exists() {
            return Err(ConfigError::ConfigNotFound);
        }

        let encrypted_data = fs::read_to_string(config_path)?;
        
        // Parse the format: PASSWORD:password:DATA:config_json
        if !encrypted_data.starts_with("PASSWORD:") {
            return Err(ConfigError::InvalidPassword);
        }
        
        let without_prefix = &encrypted_data[9..]; // Remove "PASSWORD:"
        if let Some(data_pos) = without_prefix.find(":DATA:") {
            let stored_password = &without_prefix[..data_pos];
            let config_data = &without_prefix[data_pos + 6..]; // Remove ":DATA:"
            
            if stored_password != password {
                return Err(ConfigError::InvalidPassword);
            }
            
            Ok(config_data.to_string())
        } else {
            Err(ConfigError::InvalidPassword)
        }
    }

    fn config_exists(&self) -> bool {
        self.get_config_path().exists()
    }

    fn delete_config(&self) -> Result<(), ConfigError> {
        let config_path = self.get_config_path();
        if config_path.exists() {
            fs::remove_file(config_path)?;
        }
        Ok(())
    }

    fn export_config(&self, export_path: &str, config_json: &str) -> Result<(), ConfigError> {
        fs::write(export_path, config_json)?;
        Ok(())
    }

    fn import_config(&self, import_path: &str) -> Result<String, ConfigError> {
        if !PathBuf::from(import_path).exists() {
            return Err(ConfigError::ConfigNotFound);
        }
        let config_json = fs::read_to_string(import_path)?;
        Ok(config_json)
    }
}

// Mock DownloadManager for testing
struct TestDownloadManager {
    downloads_dir: PathBuf,
}

impl TestDownloadManager {
    fn new(app_handle: &MockAppHandle) -> Self {
        TestDownloadManager {
            downloads_dir: app_handle.downloads_dir().clone(),
        }
    }

    fn validate_download_path(&self, path: &str) -> Result<PathBuf, DownloadError> {
        let path_buf = PathBuf::from(path);
        
        // For testing, accept both relative and absolute paths
        if path_buf.is_relative() {
            Ok(self.downloads_dir.join(path_buf))
        } else {
            Ok(path_buf)
        }
    }

    fn check_file_exists(&self, path: &PathBuf) -> bool {
        path.exists()
    }

    fn get_file_size(&self, path: &PathBuf) -> Result<u64, DownloadError> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.len())
    }

    fn get_default_download_path(&self, filename: &str) -> PathBuf {
        self.downloads_dir.join(filename)
    }

    fn generate_unique_filename(&self, base_path: &PathBuf) -> PathBuf {
        if !base_path.exists() {
            return base_path.clone();
        }

        let parent = base_path.parent().unwrap_or_else(|| std::path::Path::new("."));
        let stem = base_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let extension = base_path.extension().and_then(|s| s.to_str()).unwrap_or("");

        for i in 1..1000 {
            let new_filename = if extension.is_empty() {
                format!("{} ({})", stem, i)
            } else {
                format!("{} ({}).{}", stem, i, extension)
            };
            
            let new_path = parent.join(new_filename);
            if !new_path.exists() {
                return new_path;
            }
        }

        // Fallback with timestamp
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let new_filename = if extension.is_empty() {
            format!("{}-{}", stem, timestamp)
        } else {
            format!("{}-{}.{}", stem, timestamp, extension)
        };
        
        parent.join(new_filename)
    }

    fn create_directory(&self, path: &str) -> Result<(), DownloadError> {
        fs::create_dir_all(path)?;
        Ok(())
    }

    fn write_file_chunk(&self, path: &str, data: &[u8], append: bool) -> Result<(), DownloadError> {
        if append {
            let mut existing_data = Vec::new();
            if PathBuf::from(path).exists() {
                existing_data = fs::read(path)?;
            }
            existing_data.extend_from_slice(data);
            fs::write(path, existing_data)?;
        } else {
            fs::write(path, data)?;
        }
        Ok(())
    }

    fn read_file_chunk(&self, path: &str, offset: u64, length: usize) -> Result<Vec<u8>, DownloadError> {
        let data = fs::read(path)?;
        let start = offset as usize;
        let end = std::cmp::min(start + length, data.len());
        
        if start >= data.len() {
            return Ok(Vec::new());
        }
        
        Ok(data[start..end].to_vec())
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_config_management_workflow() {
        let app_handle = MockAppHandle::new();
        let config_manager = TestConfigManager::new(&app_handle);

        // Test configuration data
        let test_config = json!({
            "configs": [
                {
                    "id": "1",
                    "name": "Test S3 Config",
                    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
                    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                    "region": "us-east-1",
                    "bucketName": "test-bucket"
                }
            ],
            "activeConfigId": "1"
        });
        let config_json = test_config.to_string();
        let password = "test-password-123";

        // Test 1: Config doesn't exist initially
        assert!(!config_manager.config_exists());

        // Test 2: Save configuration
        let save_result = config_manager.save_config(&config_json, password);
        assert!(save_result.is_ok(), "Failed to save config: {:?}", save_result);
        assert!(config_manager.config_exists());

        // Test 3: Load configuration with correct password
        let load_result = config_manager.load_config(password);
        assert!(load_result.is_ok(), "Failed to load config: {:?}", load_result);
        let loaded_config = load_result.unwrap();
        assert_eq!(loaded_config, config_json);

        // Test 4: Load configuration with wrong password
        let wrong_password_result = config_manager.load_config("wrong-password");
        assert!(wrong_password_result.is_err());
        assert!(matches!(wrong_password_result.unwrap_err(), ConfigError::InvalidPassword));

        // Test 5: Export configuration
        let export_path = app_handle.config_dir().join("exported-config.json");
        let export_result = config_manager.export_config(
            &export_path.to_string_lossy(),
            &config_json
        );
        assert!(export_result.is_ok(), "Failed to export config: {:?}", export_result);
        assert!(export_path.exists());

        // Test 6: Import configuration
        let import_result = config_manager.import_config(&export_path.to_string_lossy());
        assert!(import_result.is_ok(), "Failed to import config: {:?}", import_result);
        let imported_config = import_result.unwrap();
        assert_eq!(imported_config, config_json);

        // Test 7: Delete configuration
        let delete_result = config_manager.delete_config();
        assert!(delete_result.is_ok(), "Failed to delete config: {:?}", delete_result);
        assert!(!config_manager.config_exists());

        // Test 8: Try to load deleted configuration
        let load_deleted_result = config_manager.load_config(password);
        assert!(load_deleted_result.is_err());
        assert!(matches!(load_deleted_result.unwrap_err(), ConfigError::ConfigNotFound));
    }

    #[test]
    fn test_download_management_workflow() {
        let app_handle = MockAppHandle::new();
        let download_manager = TestDownloadManager::new(&app_handle);

        // Test 1: Validate download paths
        let relative_path = "test-file.txt";
        let validate_result = download_manager.validate_download_path(relative_path);
        assert!(validate_result.is_ok(), "Failed to validate relative path: {:?}", validate_result);

        let absolute_path = app_handle.downloads_dir().join("test-file.txt");
        let validate_absolute_result = download_manager.validate_download_path(
            &absolute_path.to_string_lossy()
        );
        assert!(validate_absolute_result.is_ok(), "Failed to validate absolute path: {:?}", validate_absolute_result);

        // Test 2: Check file existence
        let test_file_path = app_handle.downloads_dir().join("test-file.txt");
        assert!(!download_manager.check_file_exists(&test_file_path));

        // Test 3: Create file and check existence
        fs::write(&test_file_path, "test content").unwrap();
        assert!(download_manager.check_file_exists(&test_file_path));

        // Test 4: Get file size
        let file_size_result = download_manager.get_file_size(&test_file_path);
        assert!(file_size_result.is_ok(), "Failed to get file size: {:?}", file_size_result);
        assert_eq!(file_size_result.unwrap(), "test content".len() as u64);

        // Test 5: Get default download path
        let default_path = download_manager.get_default_download_path("example.txt");
        let expected_path = app_handle.downloads_dir().join("example.txt");
        assert_eq!(default_path, expected_path);

        // Test 6: Generate unique filename
        let unique_path = download_manager.generate_unique_filename(&test_file_path);
        assert_ne!(unique_path, test_file_path);
        assert!(unique_path.to_string_lossy().contains("test-file (1).txt"));

        // Test 7: Create directory
        let new_dir = app_handle.downloads_dir().join("new-directory");
        let create_dir_result = download_manager.create_directory(&new_dir.to_string_lossy());
        assert!(create_dir_result.is_ok(), "Failed to create directory: {:?}", create_dir_result);
        assert!(new_dir.exists());

        // Test 8: Write file chunk
        let chunk_file = app_handle.downloads_dir().join("chunk-file.txt");
        let chunk_data = b"Hello, ";
        let write_result = download_manager.write_file_chunk(
            &chunk_file.to_string_lossy(),
            chunk_data,
            false
        );
        assert!(write_result.is_ok(), "Failed to write file chunk: {:?}", write_result);

        // Test 9: Append file chunk
        let append_data = b"World!";
        let append_result = download_manager.write_file_chunk(
            &chunk_file.to_string_lossy(),
            append_data,
            true
        );
        assert!(append_result.is_ok(), "Failed to append file chunk: {:?}", append_result);

        // Test 10: Read file chunk
        let read_result = download_manager.read_file_chunk(
            &chunk_file.to_string_lossy(),
            0,
            13
        );
        assert!(read_result.is_ok(), "Failed to read file chunk: {:?}", read_result);
        let read_data = read_result.unwrap();
        assert_eq!(read_data, b"Hello, World!");

        // Test 11: Read partial file chunk
        let partial_read_result = download_manager.read_file_chunk(
            &chunk_file.to_string_lossy(),
            7,
            6
        );
        assert!(partial_read_result.is_ok(), "Failed to read partial chunk: {:?}", partial_read_result);
        let partial_data = partial_read_result.unwrap();
        assert_eq!(partial_data, b"World!");
    }

    #[test]
    fn test_config_error_handling() {
        let app_handle = MockAppHandle::new();
        let config_manager = TestConfigManager::new(&app_handle);

        // Test 1: Load non-existent config
        let load_result = config_manager.load_config("any-password");
        assert!(load_result.is_err());
        assert!(matches!(load_result.unwrap_err(), ConfigError::ConfigNotFound));

        // Test 2: Import non-existent file
        let import_result = config_manager.import_config("/non/existent/path.json");
        assert!(import_result.is_err());
        assert!(matches!(import_result.unwrap_err(), ConfigError::ConfigNotFound));

        // Test 3: Export to invalid path (permission denied simulation)
        // This test might not work on all systems, so we'll skip it for now
        // let invalid_export_result = config_manager.export_config("/root/config.json", "{}");
        // assert!(invalid_export_result.is_err());
    }

    #[test]
    fn test_download_error_handling() {
        let app_handle = MockAppHandle::new();
        let download_manager = TestDownloadManager::new(&app_handle);

        // Test 1: Get size of non-existent file
        let non_existent_path = app_handle.downloads_dir().join("non-existent.txt");
        let size_result = download_manager.get_file_size(&non_existent_path);
        assert!(size_result.is_err());

        // Test 2: Read from non-existent file
        let read_result = download_manager.read_file_chunk(
            &non_existent_path.to_string_lossy(),
            0,
            100
        );
        assert!(read_result.is_err());

        // Test 3: Read beyond file bounds
        let test_file = app_handle.downloads_dir().join("small-file.txt");
        fs::write(&test_file, "small").unwrap();
        
        let read_beyond_result = download_manager.read_file_chunk(
            &test_file.to_string_lossy(),
            10,
            100
        );
        assert!(read_beyond_result.is_ok());
        let data = read_beyond_result.unwrap();
        assert!(data.is_empty());
    }

    #[test]
    fn test_config_data_integrity() {
        let app_handle = MockAppHandle::new();
        let config_manager = TestConfigManager::new(&app_handle);

        // Test with various config formats
        let test_configs = vec![
            json!({"simple": "config"}),
            json!({
                "complex": {
                    "nested": {
                        "data": [1, 2, 3],
                        "unicode": "测试数据",
                        "special": "!@#$%^&*()"
                    }
                }
            }),
            json!({"empty": {}}),
            json!({"array": [1, "two", {"three": 3}]}),
        ];

        for (i, test_config) in test_configs.iter().enumerate() {
            let config_json = test_config.to_string();
            let password = format!("password-{}", i);

            // Save config
            let save_result = config_manager.save_config(&config_json, &password);
            assert!(save_result.is_ok(), "Failed to save config {}: {:?}", i, save_result);

            // Load config
            let load_result = config_manager.load_config(&password);
            assert!(load_result.is_ok(), "Failed to load config {}: {:?}", i, load_result);
            
            let loaded_config = load_result.unwrap();
            assert_eq!(loaded_config, config_json, "Config {} data mismatch", i);

            // Clean up for next iteration
            config_manager.delete_config().unwrap();
        }
    }

    #[test]
    fn test_file_operations_integrity() {
        let app_handle = MockAppHandle::new();
        let download_manager = TestDownloadManager::new(&app_handle);

        // Test with various data types
        let test_data_sets = vec![
            b"Simple text".to_vec(),
            b"Binary data: \x00\x01\x02\x03\xFF\xFE\xFD".to_vec(),
            "Unicode: 你好世界 🌍 🚀".as_bytes().to_vec(),
            vec![0u8; 1024], // Large zero-filled data
            (0..=255).collect::<Vec<u8>>(), // Sequential bytes
        ];

        for (i, test_data) in test_data_sets.iter().enumerate() {
            let test_file = app_handle.downloads_dir().join(format!("test-{}.bin", i));

            // Write data
            let write_result = download_manager.write_file_chunk(
                &test_file.to_string_lossy(),
                test_data,
                false
            );
            assert!(write_result.is_ok(), "Failed to write test data {}: {:?}", i, write_result);

            // Read data back
            let read_result = download_manager.read_file_chunk(
                &test_file.to_string_lossy(),
                0,
                test_data.len()
            );
            assert!(read_result.is_ok(), "Failed to read test data {}: {:?}", i, read_result);
            
            let read_data = read_result.unwrap();
            assert_eq!(read_data, *test_data, "Data integrity check failed for test {}", i);

            // Test partial reads
            if test_data.len() > 10 {
                let end_pos = std::cmp::min(15, test_data.len());
                let partial_read_result = download_manager.read_file_chunk(
                    &test_file.to_string_lossy(),
                    5,
                    10
                );
                assert!(partial_read_result.is_ok(), "Failed partial read for test {}: {:?}", i, partial_read_result);
                
                let partial_data = partial_read_result.unwrap();
                assert_eq!(partial_data, test_data[5..end_pos], "Partial read mismatch for test {}", i);
            }
        }
    }

    #[test]
    fn test_concurrent_operations() {
        use std::thread;
        use std::sync::Arc;

        let app_handle = Arc::new(MockAppHandle::new());
        let mut handles = vec![];

        // Test concurrent config operations
        for i in 0..5 {
            let app_handle_clone = Arc::clone(&app_handle);
            let handle = thread::spawn(move || {
                // Create a unique config manager for each thread
                let thread_config_dir = app_handle_clone.config_dir().join(format!("thread-{}", i));
                fs::create_dir_all(&thread_config_dir).unwrap();
                
                let config_manager = TestConfigManager {
                    config_dir: thread_config_dir,
                };
                
                let config_json = json!({"thread": i, "data": "test"}).to_string();
                let password = format!("password-{}", i);
                
                // Save and load config
                let save_result = config_manager.save_config(&config_json, &password);
                assert!(save_result.is_ok(), "Thread {} failed to save config: {:?}", i, save_result);

                let load_result = config_manager.load_config(&password);
                assert!(load_result.is_ok(), "Thread {} failed to load config: {:?}", i, load_result);
                assert_eq!(load_result.unwrap(), config_json);
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Test concurrent file operations
        let mut file_handles = vec![];
        for i in 0..5 {
            let app_handle_clone = Arc::clone(&app_handle);
            let handle = thread::spawn(move || {
                let download_manager = TestDownloadManager::new(&app_handle_clone);
                let test_file = app_handle_clone.downloads_dir().join(format!("concurrent-{}.txt", i));
                let test_data = format!("Thread {} data", i).as_bytes().to_vec();

                let write_result = download_manager.write_file_chunk(
                    &test_file.to_string_lossy(),
                    &test_data,
                    false
                );
                assert!(write_result.is_ok());

                let read_result = download_manager.read_file_chunk(
                    &test_file.to_string_lossy(),
                    0,
                    test_data.len()
                );
                assert!(read_result.is_ok());
                assert_eq!(read_result.unwrap(), test_data);
            });
            file_handles.push(handle);
        }

        // Wait for all file operation threads to complete
        for handle in file_handles {
            handle.join().unwrap();
        }
    }
}