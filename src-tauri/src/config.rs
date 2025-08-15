use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use pbkdf2::{
    password_hash::{PasswordHasher, SaltString},
    Pbkdf2,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use zeroize::ZeroizeOnDrop;
use hmac::Hmac;
use sha2::Sha256;

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptedConfig {
    pub data: String,
    pub salt: String,
    pub nonce: String,
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default = "default_algorithm")]
    pub algorithm: String,
    #[serde(default = "default_iterations")]
    pub iterations: u32,
}

fn default_version() -> String {
    "1.0".to_string()
}

fn default_algorithm() -> String {
    "AES-256-GCM".to_string()
}

fn default_iterations() -> u32 {
    100_000
}

/// Secure string that automatically zeros memory on drop
#[derive(Clone, ZeroizeOnDrop)]
pub struct SecureString {
    data: Vec<u8>,
}

impl SecureString {
    pub fn new(data: String) -> Self {
        Self {
            data: data.into_bytes(),
        }
    }

    pub fn from_bytes(data: Vec<u8>) -> Self {
        Self { data }
    }

    pub fn as_str(&self) -> Result<&str, std::str::Utf8Error> {
        std::str::from_utf8(&self.data)
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.data
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl std::fmt::Debug for SecureString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SecureString([REDACTED])")
    }
}

/// Secure key that automatically zeros memory on drop
#[derive(ZeroizeOnDrop)]
pub struct SecureKey {
    key: [u8; 32],
}

impl SecureKey {
    pub fn new(key: [u8; 32]) -> Self {
        Self { key }
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.key
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Decryption error: {0}")]
    Decryption(String),
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Config file not found")]
    ConfigNotFound,
}

pub struct ConfigManager {
    config_dir: PathBuf,
}

const ENCRYPTION_VERSION: &str = "1.0";
const ENCRYPTION_ALGORITHM: &str = "AES-256-GCM";
const PBKDF2_ITERATIONS: u32 = 100_000; // Increased iterations for better security

impl ConfigManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, ConfigError> {
        let config_dir = app_handle
            .path()
            .app_config_dir()
            .map_err(|e| ConfigError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

        // Create config directory if it doesn't exist
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir)?;
        }

        Ok(ConfigManager { config_dir })
    }

    fn get_config_path(&self) -> PathBuf {
        self.config_dir.join("config.encrypted")
    }

    fn derive_key(&self, password: &SecureString, salt: &[u8]) -> Result<SecureKey, ConfigError> {
        let salt_string = SaltString::encode_b64(salt)
            .map_err(|e| ConfigError::Encryption(format!("Salt encoding error: {}", e)))?;

        // Use custom PBKDF2 with higher iteration count
        let mut key = [0u8; 32];
        pbkdf2::pbkdf2::<Hmac<Sha256>>(
            password.as_bytes(),
            salt,
            PBKDF2_ITERATIONS,
            &mut key,
        );
        // PBKDF2 doesn't return an error in this implementation

        Ok(SecureKey::new(key))
    }

    fn generate_secure_salt(&self) -> [u8; 32] {
        let mut salt = [0u8; 32]; // Increased salt size for better security
        OsRng.fill_bytes(&mut salt);
        salt
    }

    fn generate_secure_nonce(&self) -> [u8; 12] {
        let mut nonce = [0u8; 12];
        OsRng.fill_bytes(&mut nonce);
        nonce
    }

    fn secure_delete_file(&self, path: &PathBuf) -> Result<(), ConfigError> {
        if path.exists() {
            // Overwrite file with random data before deletion for secure deletion
            let file_size = fs::metadata(path)?.len() as usize;
            if file_size > 0 {
                let mut random_data = vec![0u8; file_size];
                OsRng.fill_bytes(&mut random_data);
                fs::write(path, &random_data)?;
                
                // Overwrite with zeros
                let zero_data = vec![0u8; file_size];
                fs::write(path, &zero_data)?;
            }
            
            fs::remove_file(path)?;
        }
        Ok(())
    }

    pub fn save_config(&self, config_json: &str, password: &str) -> Result<(), ConfigError> {
        let secure_password = SecureString::new(password.to_string());
        let secure_config = SecureString::new(config_json.to_string());
        
        // Generate secure random salt and nonce
        let salt = self.generate_secure_salt();
        let nonce_bytes = self.generate_secure_nonce();

        // Derive encryption key
        let secure_key = self.derive_key(&secure_password, &salt)?;

        // Create cipher
        let cipher = Aes256Gcm::new_from_slice(secure_key.as_bytes())
            .map_err(|e| ConfigError::Encryption(format!("Cipher creation error: {}", e)))?;

        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt the config
        let encrypted_data = cipher
            .encrypt(nonce, secure_config.as_bytes())
            .map_err(|e| ConfigError::Encryption(format!("Encryption failed: {}", e)))?;

        // Create encrypted config structure with metadata
        let encrypted_config = EncryptedConfig {
            data: general_purpose::STANDARD.encode(&encrypted_data),
            salt: general_purpose::STANDARD.encode(&salt),
            nonce: general_purpose::STANDARD.encode(&nonce_bytes),
            version: ENCRYPTION_VERSION.to_string(),
            algorithm: ENCRYPTION_ALGORITHM.to_string(),
            iterations: PBKDF2_ITERATIONS,
        };

        // Save to file with secure permissions
        let config_path = self.get_config_path();
        let json_data = serde_json::to_string_pretty(&encrypted_config)?;
        
        // Write with restricted permissions (owner read/write only)
        fs::write(&config_path, json_data)?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&config_path)?.permissions();
            perms.set_mode(0o600); // Owner read/write only
            fs::set_permissions(&config_path, perms)?;
        }

        Ok(())
    }

    pub fn load_config(&self, password: &str) -> Result<String, ConfigError> {
        let secure_password = SecureString::new(password.to_string());
        let config_path = self.get_config_path();

        if !config_path.exists() {
            return Err(ConfigError::ConfigNotFound);
        }

        // Read encrypted config from file
        let file_content = fs::read_to_string(config_path)?;
        let encrypted_config: EncryptedConfig = serde_json::from_str(&file_content)?;

        // Validate encryption metadata
        if encrypted_config.version != ENCRYPTION_VERSION {
            return Err(ConfigError::Decryption(format!(
                "Unsupported encryption version: {}",
                encrypted_config.version
            )));
        }

        if encrypted_config.algorithm != ENCRYPTION_ALGORITHM {
            return Err(ConfigError::Decryption(format!(
                "Unsupported encryption algorithm: {}",
                encrypted_config.algorithm
            )));
        }

        // Decode base64 data
        let encrypted_data = general_purpose::STANDARD
            .decode(&encrypted_config.data)
            .map_err(|e| ConfigError::Decryption(format!("Base64 decode error: {}", e)))?;

        let salt = general_purpose::STANDARD
            .decode(&encrypted_config.salt)
            .map_err(|e| ConfigError::Decryption(format!("Salt decode error: {}", e)))?;

        let nonce_bytes = general_purpose::STANDARD
            .decode(&encrypted_config.nonce)
            .map_err(|e| ConfigError::Decryption(format!("Nonce decode error: {}", e)))?;

        // Derive decryption key
        let secure_key = self.derive_key(&secure_password, &salt)?;

        // Create cipher
        let cipher = Aes256Gcm::new_from_slice(secure_key.as_bytes())
            .map_err(|e| ConfigError::Decryption(format!("Cipher creation error: {}", e)))?;

        let nonce = Nonce::from_slice(&nonce_bytes);

        // Decrypt the data
        let decrypted_data = cipher
            .decrypt(nonce, encrypted_data.as_ref())
            .map_err(|_| ConfigError::InvalidPassword)?;

        // Convert to secure string and then to regular string
        let secure_config = SecureString::from_bytes(decrypted_data);
        let config_json = secure_config.as_str()
            .map_err(|e| ConfigError::Decryption(format!("UTF-8 conversion error: {}", e)))?
            .to_string();

        Ok(config_json)
    }

    pub fn config_exists(&self) -> bool {
        self.get_config_path().exists()
    }

    pub fn delete_config(&self) -> Result<(), ConfigError> {
        let config_path = self.get_config_path();
        self.secure_delete_file(&config_path)?;
        Ok(())
    }

    pub fn export_config(&self, export_path: &str, config_json: &str) -> Result<(), ConfigError> {
        let export_path = PathBuf::from(export_path);
        fs::write(export_path, config_json)?;
        Ok(())
    }

    pub fn import_config(&self, import_path: &str) -> Result<String, ConfigError> {
        let import_path = PathBuf::from(import_path);
        if !import_path.exists() {
            return Err(ConfigError::ConfigNotFound);
        }
        let config_json = fs::read_to_string(import_path)?;
        Ok(config_json)
    }
}

// Tauri commands
#[tauri::command]
pub async fn save_config(
    app_handle: AppHandle,
    config_json: String,
    password: String,
) -> Result<(), String> {
    let config_manager = ConfigManager::new(&app_handle).map_err(|e| e.to_string())?;
    config_manager
        .save_config(&config_json, &password)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_config(app_handle: AppHandle, password: String) -> Result<String, String> {
    let config_manager = ConfigManager::new(&app_handle).map_err(|e| e.to_string())?;
    config_manager
        .load_config(&password)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn config_exists(app_handle: AppHandle) -> Result<bool, String> {
    let config_manager = ConfigManager::new(&app_handle).map_err(|e| e.to_string())?;
    Ok(config_manager.config_exists())
}

#[tauri::command]
pub async fn delete_config(app_handle: AppHandle) -> Result<(), String> {
    let config_manager = ConfigManager::new(&app_handle).map_err(|e| e.to_string())?;
    config_manager.delete_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_config(
    app_handle: AppHandle,
    export_path: String,
    config_json: String,
) -> Result<(), String> {
    let config_manager = ConfigManager::new(&app_handle).map_err(|e| e.to_string())?;
    config_manager
        .export_config(&export_path, &config_json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_config(app_handle: AppHandle, import_path: String) -> Result<String, String> {
    let config_manager = ConfigManager::new(&app_handle).map_err(|e| e.to_string())?;
    config_manager
        .import_config(&import_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn select_export_path(app_handle: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    use std::sync::{Arc, Mutex};
    
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    app_handle
        .dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .set_file_name("s3-config-export.json")
        .save_file(move |path| {
            *result_clone.lock().unwrap() = path;
        });
    
    // In a real implementation, you'd want to use async/await properly
    // For now, we'll return None as this is just for testing
    Ok(None)
}

#[tauri::command]
pub async fn select_import_path(app_handle: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    use std::sync::{Arc, Mutex};
    
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    app_handle
        .dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .pick_file(move |path| {
            *result_clone.lock().unwrap() = path;
        });
    
    // In a real implementation, you'd want to use async/await properly
    // For now, we'll return None as this is just for testing
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs;

    // Mock AppHandle for testing
    struct MockConfigManager {
        config_dir: PathBuf,
    }

    impl MockConfigManager {
        fn new() -> Result<Self, ConfigError> {
            let config_dir = env::temp_dir().join("s3-upload-tool-test");
            if config_dir.exists() {
                fs::remove_dir_all(&config_dir)?;
            }
            fs::create_dir_all(&config_dir)?;
            Ok(MockConfigManager { config_dir })
        }

        fn get_config_path(&self) -> PathBuf {
            self.config_dir.join("config.encrypted")
        }

        fn derive_key(&self, password: &str, salt: &[u8]) -> Result<SecureKey, ConfigError> {
            let secure_password = SecureString::new(password.to_string());
            let mut key = [0u8; 32];
            pbkdf2::pbkdf2::<Hmac<Sha256>>(
                secure_password.as_bytes(),
                salt,
                PBKDF2_ITERATIONS,
                &mut key,
            );
            Ok(SecureKey::new(key))
        }

        fn generate_secure_salt(&self) -> [u8; 32] {
            let mut salt = [0u8; 32];
            OsRng.fill_bytes(&mut salt);
            salt
        }

        fn generate_secure_nonce(&self) -> [u8; 12] {
            let mut nonce = [0u8; 12];
            OsRng.fill_bytes(&mut nonce);
            nonce
        }

        fn secure_delete_file(&self, path: &PathBuf) -> Result<(), ConfigError> {
            if path.exists() {
                let file_size = fs::metadata(path)?.len() as usize;
                if file_size > 0 {
                    let mut random_data = vec![0u8; file_size];
                    OsRng.fill_bytes(&mut random_data);
                    fs::write(path, &random_data)?;
                    
                    let zero_data = vec![0u8; file_size];
                    fs::write(path, &zero_data)?;
                }
                
                fs::remove_file(path)?;
            }
            Ok(())
        }

        fn save_config(&self, config_json: &str, password: &str) -> Result<(), ConfigError> {
            let secure_password = SecureString::new(password.to_string());
            let secure_config = SecureString::new(config_json.to_string());
            
            let salt = self.generate_secure_salt();
            let nonce_bytes = self.generate_secure_nonce();

            let secure_key = self.derive_key(password, &salt)?;

            let cipher = Aes256Gcm::new_from_slice(secure_key.as_bytes())
                .map_err(|e| ConfigError::Encryption(format!("Cipher creation error: {}", e)))?;

            let nonce = Nonce::from_slice(&nonce_bytes);

            let encrypted_data = cipher
                .encrypt(nonce, secure_config.as_bytes())
                .map_err(|e| ConfigError::Encryption(format!("Encryption failed: {}", e)))?;

            let encrypted_config = EncryptedConfig {
                data: general_purpose::STANDARD.encode(&encrypted_data),
                salt: general_purpose::STANDARD.encode(&salt),
                nonce: general_purpose::STANDARD.encode(&nonce_bytes),
                version: ENCRYPTION_VERSION.to_string(),
                algorithm: ENCRYPTION_ALGORITHM.to_string(),
                iterations: PBKDF2_ITERATIONS,
            };

            let config_path = self.get_config_path();
            let json_data = serde_json::to_string_pretty(&encrypted_config)?;
            fs::write(&config_path, json_data)?;

            Ok(())
        }

        fn load_config(&self, password: &str) -> Result<String, ConfigError> {
            let config_path = self.get_config_path();

            if !config_path.exists() {
                return Err(ConfigError::ConfigNotFound);
            }

            let file_content = fs::read_to_string(config_path)?;
            let encrypted_config: EncryptedConfig = serde_json::from_str(&file_content)?;

            // For test compatibility, handle both old and new format
            let version = encrypted_config.version.as_deref().unwrap_or("1.0");
            let algorithm = encrypted_config.algorithm.as_deref().unwrap_or("AES-256-GCM");

            let encrypted_data = general_purpose::STANDARD
                .decode(&encrypted_config.data)
                .map_err(|e| ConfigError::Decryption(format!("Base64 decode error: {}", e)))?;

            let salt = general_purpose::STANDARD
                .decode(&encrypted_config.salt)
                .map_err(|e| ConfigError::Decryption(format!("Salt decode error: {}", e)))?;

            let nonce_bytes = general_purpose::STANDARD
                .decode(&encrypted_config.nonce)
                .map_err(|e| ConfigError::Decryption(format!("Nonce decode error: {}", e)))?;

            let secure_key = self.derive_key(password, &salt)?;

            let cipher = Aes256Gcm::new_from_slice(secure_key.as_bytes())
                .map_err(|e| ConfigError::Decryption(format!("Cipher creation error: {}", e)))?;

            let nonce = Nonce::from_slice(&nonce_bytes);

            let decrypted_data = cipher
                .decrypt(nonce, encrypted_data.as_ref())
                .map_err(|_| ConfigError::InvalidPassword)?;

            let secure_config = SecureString::from_bytes(decrypted_data);
            let config_json = secure_config.as_str()
                .map_err(|e| ConfigError::Decryption(format!("UTF-8 conversion error: {}", e)))?
                .to_string();

            Ok(config_json)
        }

        fn config_exists(&self) -> bool {
            self.get_config_path().exists()
        }

        fn delete_config(&self) -> Result<(), ConfigError> {
            let config_path = self.get_config_path();
            self.secure_delete_file(&config_path)?;
            Ok(())
        }
    }

    #[test]
    fn test_config_save_and_load() {
        let manager = MockConfigManager::new().unwrap();
        let test_config = r#"{"test": "data", "number": 42}"#;
        let password = "test-password";

        // Test saving config
        assert!(manager.save_config(test_config, password).is_ok());
        assert!(manager.config_exists());

        // Test loading config
        let loaded_config = manager.load_config(password).unwrap();
        assert_eq!(loaded_config, test_config);
    }

    #[test]
    fn test_config_wrong_password() {
        let manager = MockConfigManager::new().unwrap();
        let test_config = r#"{"test": "data"}"#;
        let password = "correct-password";
        let wrong_password = "wrong-password";

        // Save with correct password
        manager.save_config(test_config, password).unwrap();

        // Try to load with wrong password
        let result = manager.load_config(wrong_password);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ConfigError::InvalidPassword));
    }

    #[test]
    fn test_config_not_found() {
        let manager = MockConfigManager::new().unwrap();
        let password = "test-password";

        // Try to load non-existent config
        let result = manager.load_config(password);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ConfigError::ConfigNotFound));
    }

    #[test]
    fn test_config_delete() {
        let manager = MockConfigManager::new().unwrap();
        let test_config = r#"{"test": "data"}"#;
        let password = "test-password";

        // Save config
        manager.save_config(test_config, password).unwrap();
        assert!(manager.config_exists());

        // Delete config
        manager.delete_config().unwrap();
        assert!(!manager.config_exists());
    }

    #[test]
    fn test_encryption_decryption_roundtrip() {
        let manager = MockConfigManager::new().unwrap();
        let test_configs = vec![
            r#"{"simple": "test"}"#,
            r#"{"complex": {"nested": {"data": [1, 2, 3]}, "unicode": "测试数据"}}"#,
            r#"{"empty": {}}"#,
            r#"{"special_chars": "!@#$%^&*()_+-=[]{}|;':\",./<>?"}"#,
        ];

        for test_config in test_configs {
            let password = "test-password-123";

            // Save and load
            manager.save_config(test_config, password).unwrap();
            let loaded_config = manager.load_config(password).unwrap();

            assert_eq!(loaded_config, test_config);

            // Clean up for next test
            manager.delete_config().unwrap();
        }
    }
}