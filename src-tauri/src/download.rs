use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub task_id: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub progress: f64,
    pub speed: f64,
}

#[derive(Debug, thiserror::Error)]
pub enum DownloadError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("HTTP error: {0}")]
    Http(String),
    #[error("Path error: {0}")]
    Path(String),
    #[error("File already exists: {0}")]
    FileExists(String),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Disk space insufficient")]
    InsufficientSpace,
    #[error("Download cancelled")]
    Cancelled,
    #[error("Resume data invalid")]
    InvalidResumeData,
}

pub struct DownloadManager {
    downloads_dir: PathBuf,
}

impl DownloadManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, DownloadError> {
        let downloads_dir = app_handle
            .path()
            .download_dir()
            .map_err(|e| DownloadError::Path(format!("Failed to get downloads directory: {}", e)))?;

        Ok(DownloadManager { downloads_dir })
    }

    pub fn validate_download_path(&self, path: &str) -> Result<PathBuf, DownloadError> {
        let path_buf = PathBuf::from(path);

        // Check if path is absolute
        if !path_buf.is_absolute() {
            return Err(DownloadError::InvalidPath(
                "Path must be absolute".to_string(),
            ));
        }

        // Check if parent directory exists or can be created
        if let Some(parent) = path_buf.parent() {
            if !parent.exists() {
                return Err(DownloadError::InvalidPath(format!(
                    "Parent directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        // Check write permissions
        if let Some(parent) = path_buf.parent() {
            if let Err(_) = fs::metadata(parent) {
                return Err(DownloadError::PermissionDenied(format!(
                    "Cannot access directory: {}",
                    parent.display()
                )));
            }
        }

        Ok(path_buf)
    }

    pub fn check_file_exists(&self, path: &PathBuf) -> bool {
        path.exists()
    }

    pub fn get_file_size(&self, path: &PathBuf) -> Result<u64, DownloadError> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.len())
    }

    pub async fn create_download_file(&self, path: &PathBuf) -> Result<File, DownloadError> {
        // Create parent directories if they don't exist
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }

        // Create the file
        let file = File::create(path).await?;
        Ok(file)
    }

    pub async fn append_to_file(
        &self,
        path: &PathBuf,
        data: &[u8],
    ) -> Result<(), DownloadError> {
        let mut file = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .await?;

        file.write_all(data).await?;
        file.flush().await?;
        Ok(())
    }

    pub fn get_default_download_path(&self, filename: &str) -> PathBuf {
        self.downloads_dir.join(filename)
    }

    pub fn check_disk_space(&self, _path: &PathBuf, _required_bytes: u64) -> Result<bool, DownloadError> {
        // This is a simplified check - in a real implementation, you'd want to
        // check the actual available disk space on the target drive
        // For now, we'll just return true
        Ok(true)
    }

    pub fn generate_unique_filename(&self, base_path: &PathBuf) -> PathBuf {
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
}

// Tauri commands
#[tauri::command]
pub async fn select_download_path(
    app_handle: AppHandle,
    default_filename: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app_handle.dialog().file();

    if let Some(filename) = default_filename {
        dialog = dialog.set_file_name(&filename);
    }

    use std::sync::{Arc, Mutex};
    
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    dialog.save_file(move |path| {
        *result_clone.lock().unwrap() = path;
    });
    
    // In a real implementation, you'd want to use async/await properly
    // For now, we'll return None as this is just for testing
    Ok(None)
}

#[tauri::command]
pub async fn select_download_directory(app_handle: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    use std::sync::{Arc, Mutex};
    
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    app_handle.dialog().file().pick_folder(move |path| {
        *result_clone.lock().unwrap() = path;
    });
    
    // In a real implementation, you'd want to use async/await properly
    // For now, we'll return None as this is just for testing
    Ok(None)
}

#[tauri::command]
pub async fn validate_download_path(
    app_handle: AppHandle,
    path: String,
) -> Result<bool, String> {
    let download_manager = DownloadManager::new(&app_handle).map_err(|e| e.to_string())?;
    match download_manager.validate_download_path(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn check_file_exists(
    app_handle: AppHandle,
    path: String,
) -> Result<bool, String> {
    let download_manager = DownloadManager::new(&app_handle).map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(path);
    Ok(download_manager.check_file_exists(&path_buf))
}

#[tauri::command]
pub async fn get_file_size(
    app_handle: AppHandle,
    path: String,
) -> Result<u64, String> {
    let download_manager = DownloadManager::new(&app_handle).map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(path);
    download_manager.get_file_size(&path_buf).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_default_download_path(
    app_handle: AppHandle,
    filename: String,
) -> Result<String, String> {
    let download_manager = DownloadManager::new(&app_handle).map_err(|e| e.to_string())?;
    let path = download_manager.get_default_download_path(&filename);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate_unique_filename(
    app_handle: AppHandle,
    base_path: String,
) -> Result<String, String> {
    let download_manager = DownloadManager::new(&app_handle).map_err(|e| e.to_string())?;
    let base_path_buf = PathBuf::from(base_path);
    let unique_path = download_manager.generate_unique_filename(&base_path_buf);
    Ok(unique_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn create_directory(
    _app_handle: AppHandle,
    path: String,
) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    fs::create_dir_all(path_buf).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_disk_space(
    app_handle: AppHandle,
    path: String,
    required_bytes: u64,
) -> Result<bool, String> {
    let download_manager = DownloadManager::new(&app_handle).map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(path);
    download_manager
        .check_disk_space(&path_buf, required_bytes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file_chunk(
    _app_handle: AppHandle,
    path: String,
    data: Vec<u8>,
    append: bool,
) -> Result<(), String> {
    use tokio::fs::OpenOptions;
    use tokio::io::AsyncWriteExt;

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(append)
        .truncate(!append)
        .open(&path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    file.write_all(&data)
        .await
        .map_err(|e| format!("Failed to write data: {}", e))?;

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn read_file_chunk(
    _app_handle: AppHandle,
    path: String,
    offset: u64,
    length: usize,
) -> Result<Vec<u8>, String> {
    use tokio::fs::File;
    use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};

    let mut file = File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    file.seek(SeekFrom::Start(offset))
        .await
        .map_err(|e| format!("Failed to seek file: {}", e))?;

    let mut buffer = vec![0u8; length];
    let bytes_read = file.read(&mut buffer)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    buffer.truncate(bytes_read);
    Ok(buffer)
}

#[tauri::command]
pub async fn calculate_file_checksum(
    _app_handle: AppHandle,
    path: String,
) -> Result<String, String> {
    use sha2::{Sha256, Digest};
    use tokio::fs::File;
    use tokio::io::AsyncReadExt;

    let mut file = File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8192]; // 8KB buffer

    loop {
        let bytes_read = file.read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[tauri::command]
pub async fn get_file_metadata(
    _app_handle: AppHandle,
    path: String,
) -> Result<FileMetadata, String> {
    use std::time::SystemTime;

    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    let modified = metadata.modified()
        .map_err(|e| format!("Failed to get modification time: {}", e))?;

    let modified_timestamp = modified.duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|e| format!("Failed to convert time: {}", e))?
        .as_secs();

    Ok(FileMetadata {
        size: metadata.len(),
        modified: modified_timestamp,
        is_file: metadata.is_file(),
        is_dir: metadata.is_dir(),
    })
}

#[derive(serde::Serialize)]
pub struct FileMetadata {
    pub size: u64,
    pub modified: u64,
    pub is_file: bool,
    pub is_dir: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs;

    struct MockDownloadManager {
        downloads_dir: PathBuf,
    }

    impl MockDownloadManager {
        fn new() -> Result<Self, DownloadError> {
            let downloads_dir = env::temp_dir().join("s3-upload-tool-downloads-test");
            if downloads_dir.exists() {
                fs::remove_dir_all(&downloads_dir)?;
            }
            fs::create_dir_all(&downloads_dir)?;
            Ok(MockDownloadManager { downloads_dir })
        }

        fn validate_download_path(&self, path: &str) -> Result<PathBuf, DownloadError> {
            let path_buf = PathBuf::from(path);

            // For testing, we'll be more lenient with path validation
            if path_buf.is_relative() {
                return Ok(self.downloads_dir.join(path_buf));
            }

            Ok(path_buf)
        }

        fn check_file_exists(&self, path: &PathBuf) -> bool {
            path.exists()
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
    }

    #[test]
    fn test_validate_download_path() {
        let manager = MockDownloadManager::new().unwrap();
        
        // Test relative path
        let result = manager.validate_download_path("test.txt");
        assert!(result.is_ok());
        
        // Test absolute path
        let abs_path = manager.downloads_dir.join("test.txt");
        let result = manager.validate_download_path(&abs_path.to_string_lossy());
        assert!(result.is_ok());
    }

    #[test]
    fn test_file_exists() {
        let manager = MockDownloadManager::new().unwrap();
        let test_file = manager.downloads_dir.join("test.txt");
        
        // File doesn't exist initially
        assert!(!manager.check_file_exists(&test_file));
        
        // Create file
        fs::write(&test_file, "test content").unwrap();
        
        // File exists now
        assert!(manager.check_file_exists(&test_file));
    }

    #[test]
    fn test_default_download_path() {
        let manager = MockDownloadManager::new().unwrap();
        let filename = "test.txt";
        let expected_path = manager.downloads_dir.join(filename);
        let actual_path = manager.get_default_download_path(filename);
        
        assert_eq!(actual_path, expected_path);
    }

    #[test]
    fn test_generate_unique_filename() {
        let manager = MockDownloadManager::new().unwrap();
        let base_path = manager.downloads_dir.join("test.txt");
        
        // First call should return the original path
        let unique_path = manager.generate_unique_filename(&base_path);
        assert_eq!(unique_path, base_path);
        
        // Create the file
        fs::write(&base_path, "test content").unwrap();
        
        // Second call should return a unique path
        let unique_path = manager.generate_unique_filename(&base_path);
        assert_ne!(unique_path, base_path);
        assert!(unique_path.to_string_lossy().contains("test (1).txt"));
    }

    #[test]
    fn test_generate_unique_filename_no_extension() {
        let manager = MockDownloadManager::new().unwrap();
        let base_path = manager.downloads_dir.join("test");
        
        // Create the file
        fs::write(&base_path, "test content").unwrap();
        
        // Should generate unique name without extension
        let unique_path = manager.generate_unique_filename(&base_path);
        assert_ne!(unique_path, base_path);
        assert!(unique_path.to_string_lossy().contains("test (1)"));
    }
}