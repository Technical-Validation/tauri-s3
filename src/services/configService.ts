import { invoke } from '@tauri-apps/api/core';

/**
 * Service for handling configuration operations through Tauri backend
 * Provides encrypted storage and retrieval of S3 configurations
 */
export class ConfigService {
    private static readonly DEFAULT_PASSWORD = 'default-config-password';

    /**
     * Save configuration data to encrypted storage
     * @param configJson - JSON string of configuration data
     * @param password - Password for encryption (optional, uses default if not provided)
     */
    static async saveConfig(configJson: string, password?: string): Promise<void> {
        try {
            await invoke('save_config', {
                configJson,
                password: password || this.DEFAULT_PASSWORD,
            });
        } catch (error) {
            throw new Error(`Failed to save config: ${error}`);
        }
    }

    /**
     * Load configuration data from encrypted storage
     * @param password - Password for decryption (optional, uses default if not provided)
     * @returns Promise<string> - JSON string of configuration data
     */
    static async loadConfig(password?: string): Promise<string> {
        try {
            return await invoke('load_config', {
                password: password || this.DEFAULT_PASSWORD,
            });
        } catch (error) {
            throw new Error(`Failed to load config: ${error}`);
        }
    }

    /**
     * Check if configuration file exists
     * @returns Promise<boolean> - True if config exists, false otherwise
     */
    static async configExists(): Promise<boolean> {
        try {
            return await invoke('config_exists');
        } catch (error) {
            throw new Error(`Failed to check config existence: ${error}`);
        }
    }

    /**
     * Delete configuration file
     */
    static async deleteConfig(): Promise<void> {
        try {
            await invoke('delete_config');
        } catch (error) {
            throw new Error(`Failed to delete config: ${error}`);
        }
    }

    /**
     * Export configuration to a file
     * @param exportPath - Path where to export the configuration
     * @param configJson - JSON string of configuration data to export
     */
    static async exportConfig(exportPath: string, configJson: string): Promise<void> {
        try {
            await invoke('export_config', {
                exportPath,
                configJson,
            });
        } catch (error) {
            throw new Error(`Failed to export config: ${error}`);
        }
    }

    /**
     * Import configuration from a file
     * @param importPath - Path of the file to import
     * @returns Promise<string> - JSON string of imported configuration data
     */
    static async importConfig(importPath: string): Promise<string> {
        try {
            return await invoke('import_config', {
                importPath,
            });
        } catch (error) {
            throw new Error(`Failed to import config: ${error}`);
        }
    }

    /**
     * Open file dialog to select export path
     * @returns Promise<string | null> - Selected path or null if cancelled
     */
    static async selectExportPath(): Promise<string | null> {
        try {
            return await invoke('select_export_path');
        } catch (error) {
            throw new Error(`Failed to select export path: ${error}`);
        }
    }

    /**
     * Open file dialog to select import path
     * @returns Promise<string | null> - Selected path or null if cancelled
     */
    static async selectImportPath(): Promise<string | null> {
        try {
            return await invoke('select_import_path');
        } catch (error) {
            throw new Error(`Failed to select import path: ${error}`);
        }
    }

    /**
     * Utility method to safely parse JSON configuration
     * @param configJson - JSON string to parse
     * @returns Parsed configuration object
     */
    static parseConfig<T = any>(configJson: string): T {
        try {
            return JSON.parse(configJson);
        } catch (error) {
            throw new Error(`Failed to parse config JSON: ${error}`);
        }
    }

    /**
     * Utility method to safely stringify configuration
     * @param config - Configuration object to stringify
     * @returns JSON string
     */
    static stringifyConfig(config: any): string {
        try {
            return JSON.stringify(config, null, 2);
        } catch (error) {
            throw new Error(`Failed to stringify config: ${error}`);
        }
    }

    /**
     * Check if the backend is available (for testing purposes)
     * @returns Promise<boolean> - True if backend is available
     */
    static async isBackendAvailable(): Promise<boolean> {
        try {
            await this.configExists();
            return true;
        } catch (error) {
            return false;
        }
    }
}