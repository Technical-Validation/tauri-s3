import { create } from 'zustand';
import { S3Config, ConfigStore, ConfigValidationResult, ConfigExportOptions, ConfigImportOptions, ImportResult, ConnectionTestResult, ConfigTemplate } from '../types/config';
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { ConfigService } from '../services/configService';
import { TemplateService } from '../services/templateService';

// Helper function to generate unique IDs
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Helper function to validate S3 config fields
const validateConfigFields = (config: S3Config): ConfigValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!config.name?.trim()) {
        errors.push('配置名称不能为空');
    }

    if (!config.accessKeyId?.trim()) {
        errors.push('Access Key ID不能为空');
    }

    if (!config.secretAccessKey?.trim()) {
        errors.push('Secret Access Key不能为空');
    }

    if (!config.region?.trim()) {
        errors.push('区域不能为空');
    }

    if (!config.bucketName?.trim()) {
        errors.push('存储桶名称不能为空');
    }

    // Format validation
    if (config.accessKeyId && !/^[A-Z0-9]{20}$/.test(config.accessKeyId)) {
        warnings.push('Access Key ID格式可能不正确（应为20位大写字母和数字）');
    }

    if (config.secretAccessKey && config.secretAccessKey.length !== 40) {
        warnings.push('Secret Access Key长度可能不正确（通常为40位）');
    }

    if (config.bucketName && !/^[a-z0-9.-]{3,63}$/.test(config.bucketName)) {
        errors.push('存储桶名称格式不正确（3-63位小写字母、数字、点和连字符）');
    }

    if (config.endpoint && !config.endpoint.startsWith('http')) {
        errors.push('自定义端点必须以http://或https://开头');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

// Helper function to test S3 connection with detailed results
const testS3Connection = async (config: S3Config): Promise<ConnectionTestResult> => {
    const startTime = Date.now();

    try {
        const s3Client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
        });

        // Test authentication and bucket access
        const headBucketResult = await s3Client.send(new HeadBucketCommand({ Bucket: config.bucketName }));

        // Test permissions by trying to list objects
        let permissions: string[] = ['read'];
        try {
            await s3Client.send(new ListObjectsV2Command({
                Bucket: config.bucketName,
                MaxKeys: 1
            }));
            permissions.push('list');
        } catch (error) {
            // List permission might not be available
        }

        const duration = Date.now() - startTime;

        return {
            success: true,
            duration,
            details: {
                authentication: true,
                bucketAccess: true,
                permissions,
                bucketInfo: {
                    region: config.region,
                    creationDate: new Date(), // We can't get this from HeadBucket
                },
            },
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;

        let errorCode = 'UnknownError';
        let errorMessage = 'Connection failed';
        let suggestions: string[] = [];

        if (error.name === 'NoSuchBucket') {
            errorCode = 'NoSuchBucket';
            errorMessage = 'Bucket does not exist';
            suggestions = ['Check bucket name spelling', 'Verify bucket exists in the specified region'];
        } else if (error.name === 'InvalidAccessKeyId') {
            errorCode = 'InvalidAccessKeyId';
            errorMessage = 'Invalid access key ID';
            suggestions = ['Check access key ID', 'Verify credentials are correct'];
        } else if (error.name === 'SignatureDoesNotMatch') {
            errorCode = 'SignatureDoesNotMatch';
            errorMessage = 'Invalid secret access key';
            suggestions = ['Check secret access key', 'Verify credentials are correct'];
        } else if (error.name === 'AccessDenied') {
            errorCode = 'AccessDenied';
            errorMessage = 'Access denied to bucket';
            suggestions = ['Check IAM permissions', 'Verify bucket policy allows access'];
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorCode = 'NetworkError';
            errorMessage = 'Network connection failed';
            suggestions = ['Check internet connection', 'Verify endpoint URL', 'Check firewall settings'];
        }

        return {
            success: false,
            duration,
            details: {
                authentication: false,
                bucketAccess: false,
                permissions: [],
            },
            error: {
                code: errorCode,
                message: errorMessage,
                suggestions,
            },
        };
    }
};

// Helper function to save configs to Tauri backend
const saveConfigsToBackend = async (configs: S3Config[], activeConfigId: string | null) => {
    try {
        const configData = {
            configs,
            activeConfigId,
            version: '1.0',
            lastUpdated: new Date().toISOString(),
        };
        await ConfigService.saveConfig(ConfigService.stringifyConfig(configData));
    } catch (error) {
        console.error('Failed to save configs to backend:', error);
        // Don't throw here to avoid breaking the store operations
    }
};

// Helper function to load configs from Tauri backend
const loadConfigsFromBackend = async (): Promise<{ configs: S3Config[], activeConfigId: string | null }> => {
    try {
        const configExists = await ConfigService.configExists();
        if (!configExists) {
            return { configs: [], activeConfigId: null };
        }

        const configJson = await ConfigService.loadConfig();
        const configData = ConfigService.parseConfig(configJson);

        return {
            configs: configData.configs || [],
            activeConfigId: configData.activeConfigId || null,
        };
    } catch (error) {
        console.error('Failed to load configs from backend:', error);
        return { configs: [], activeConfigId: null };
    }
};

export const useConfigStore = create<ConfigStore>()((set, get) => ({
    configs: [],
    activeConfigId: null,
    selectedConfigs: [],
    searchQuery: '',
    sortBy: 'name',
    sortOrder: 'asc',
    loading: false,
    error: null,

    // Basic CRUD operations
    addConfig: async (configData) => {
        set({ loading: true, error: null });

        try {
            const newConfig: S3Config = {
                ...configData,
                id: generateId(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Validate config before adding
            const validation = validateConfigFields(newConfig);
            if (!validation.isValid) {
                throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
            }

            set((state) => {
                const newState = {
                    configs: [...state.configs, newConfig],
                    loading: false,
                };
                // Save to backend
                saveConfigsToBackend(newState.configs, state.activeConfigId);
                return newState;
            });

            // Set as active if it's the first config
            if (get().configs.length === 1) {
                await get().setActiveConfig(newConfig.id);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '添加配置失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    updateConfig: async (id, updates) => {
        set({ loading: true, error: null });

        try {
            set((state) => {
                const newState = {
                    configs: state.configs.map((config) =>
                        config.id === id
                            ? { ...config, ...updates, updatedAt: new Date() }
                            : config
                    ),
                    loading: false,
                };
                // Save to backend
                saveConfigsToBackend(newState.configs, state.activeConfigId);
                return newState;
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '更新配置失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    deleteConfig: async (id) => {
        set({ loading: true, error: null });

        try {
            const state = get();
            const configToDelete = state.configs.find(c => c.id === id);

            if (!configToDelete) {
                throw new Error('配置不存在');
            }

            set((state) => {
                const newState = {
                    configs: state.configs.filter((config) => config.id !== id),
                    activeConfigId: state.activeConfigId === id ? null : state.activeConfigId,
                    selectedConfigs: state.selectedConfigs.filter(selectedId => selectedId !== id),
                    loading: false,
                };
                // Save to backend
                saveConfigsToBackend(newState.configs, newState.activeConfigId);
                return newState;
            });

            // If deleted config was active, set first available as active
            const remainingConfigs = get().configs;
            if (state.activeConfigId === id && remainingConfigs.length > 0) {
                await get().setActiveConfig(remainingConfigs[0].id);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除配置失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    deleteConfigs: async (ids) => {
        set({ loading: true, error: null });

        try {
            const state = get();
            const configsToDelete = state.configs.filter(c => ids.includes(c.id));

            if (configsToDelete.length === 0) {
                throw new Error('没有找到要删除的配置');
            }

            set((state) => {
                const newActiveConfigId = ids.includes(state.activeConfigId || '') ? null : state.activeConfigId;
                const newState = {
                    configs: state.configs.filter((config) => !ids.includes(config.id)),
                    activeConfigId: newActiveConfigId,
                    selectedConfigs: state.selectedConfigs.filter(selectedId => !ids.includes(selectedId)),
                    loading: false,
                };
                // Save to backend
                saveConfigsToBackend(newState.configs, newState.activeConfigId);
                return newState;
            });

            // If active config was deleted, set first available as active
            const remainingConfigs = get().configs;
            if (ids.includes(state.activeConfigId || '') && remainingConfigs.length > 0) {
                await get().setActiveConfig(remainingConfigs[0].id);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量删除配置失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    duplicateConfig: async (id) => {
        set({ loading: true, error: null });

        try {
            const originalConfig = get().getConfig(id);
            if (!originalConfig) {
                throw new Error('配置不存在');
            }

            const duplicatedConfig: S3Config = {
                ...originalConfig,
                id: generateId(),
                name: `${originalConfig.name} (副本)`,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUsed: undefined,
                connectionStatus: 'unknown',
                connectionError: undefined,
            };

            set((state) => {
                const newState = {
                    configs: [...state.configs, duplicatedConfig],
                    loading: false,
                };
                // Save to backend
                saveConfigsToBackend(newState.configs, state.activeConfigId);
                return newState;
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '复制配置失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    getConfig: (id) => {
        return get().configs.find((config) => config.id === id) || null;
    },

    // Selection and filtering
    setActiveConfig: (id) => {
        set((state) => {
            const config = state.configs.find(c => c.id === id);
            if (!config) return state;

            const updatedConfigs = state.configs.map(c =>
                c.id === id ? { ...c, lastUsed: new Date() } : c
            );

            const newState = {
                configs: updatedConfigs,
                activeConfigId: id,
            };
            // Save to backend
            saveConfigsToBackend(newState.configs, newState.activeConfigId);
            return newState;
        });
    },

    toggleConfigSelection: (id) => {
        set((state) => ({
            selectedConfigs: state.selectedConfigs.includes(id)
                ? state.selectedConfigs.filter(selectedId => selectedId !== id)
                : [...state.selectedConfigs, id]
        }));
    },

    selectAllConfigs: () => {
        set((state) => ({
            selectedConfigs: state.configs.map(config => config.id)
        }));
    },

    clearSelection: () => {
        set({ selectedConfigs: [] });
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    setSorting: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder });
    },

    // Active configuration management (legacy method for backward compatibility)


    getActiveConfig: () => {
        const state = get();
        return state.activeConfigId ? state.getConfig(state.activeConfigId) : null;
    },

    // Configuration validation
    validateConfig: async (config) => {
        set({ loading: true, error: null });

        try {
            const result = validateConfigFields(config);
            set({ loading: false });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '配置验证失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    testConnection: async (config) => {
        set({ loading: true, error: null });

        try {
            const result = await testS3Connection(config);

            // Update config with connection status
            if (config.id) {
                await get().updateConfig(config.id, {
                    connectionStatus: result.success ? 'connected' : 'error',
                    connectionError: result.error?.message,
                });
            }

            set({ loading: false });
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '连接测试失败';
            set({ error: errorMessage, loading: false });

            const failedResult: ConnectionTestResult = {
                success: false,
                duration: 0,
                details: {
                    authentication: false,
                    bucketAccess: false,
                    permissions: [],
                },
                error: {
                    code: 'TestError',
                    message: errorMessage,
                    suggestions: ['Check your network connection', 'Verify configuration settings'],
                },
            };
            return failedResult;
        }
    },

    testAllConnections: async () => {
        set({ loading: true, error: null });

        try {
            const configs = get().configs;
            const testPromises = configs.map(async (config) => {
                try {
                    const result = await testS3Connection(config);
                    await get().updateConfig(config.id, {
                        connectionStatus: result.success ? 'connected' : 'error',
                        connectionError: result.error?.message,
                    });
                } catch (error) {
                    await get().updateConfig(config.id, {
                        connectionStatus: 'error',
                        connectionError: error instanceof Error ? error.message : '测试失败',
                    });
                }
            });

            await Promise.all(testPromises);
            set({ loading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量连接测试失败';
            set({ error: errorMessage, loading: false });
        }
    },

    // Templates
    getTemplates: () => {
        return TemplateService.getTemplates();
    },

    createFromTemplate: (templateId) => {
        return TemplateService.createFromTemplate(templateId);
    },

    // Import/Export functionality
    exportConfigs: async (configIds, includeSensitive = false) => {
        set({ loading: true, error: null });

        try {
            const allConfigs = get().configs;
            let configsToExport = configIds && configIds.length > 0
                ? allConfigs.filter(config => configIds.includes(config.id))
                : allConfigs;

            // Remove sensitive data if requested
            if (!includeSensitive) {
                configsToExport = configsToExport.map(config => ({
                    ...config,
                    accessKeyId: '',
                    secretAccessKey: '',
                }));
            }

            // Create export object
            const exportObject = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                configs: configsToExport,
                activeConfigId: get().activeConfigId,
            };

            // Use Tauri backend to select export path and save file
            const exportPath = await ConfigService.selectExportPath();
            if (exportPath) {
                await ConfigService.exportConfig(exportPath, ConfigService.stringifyConfig(exportObject));
            }

            set({ loading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '导出配置失败';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    importConfigs: async (file, options = { overwriteExisting: false, validateBeforeImport: true }) => {
        set({ loading: true, error: null });

        try {
            let importData;

            // Handle both File object (web) and file path (Tauri backend)
            if (typeof file === 'string') {
                // File path from Tauri backend
                const configJson = await ConfigService.importConfig(file);
                importData = ConfigService.parseConfig(configJson);
            } else {
                // File object from web
                const text = await file.text();
                importData = JSON.parse(text);
            }

            // Validate import format
            if (!importData.configs || !Array.isArray(importData.configs)) {
                throw new Error('无效的配置文件格式');
            }

            const importedConfigs = importData.configs as S3Config[];
            const result: ImportResult = {
                success: true,
                imported: 0,
                skipped: 0,
                errors: [],
                conflicts: [],
            };

            // Validate each config if requested
            if (options.validateBeforeImport) {
                for (const config of importedConfigs) {
                    const validation = validateConfigFields(config);
                    if (!validation.isValid) {
                        if (options.skipInvalid) {
                            result.errors.push(`配置 "${config.name}" 验证失败: ${validation.errors.join(', ')}`);
                            result.skipped++;
                            continue;
                        } else {
                            throw new Error(`配置 "${config.name}" 验证失败: ${validation.errors.join(', ')}`);
                        }
                    }
                }
            }

            // Process import
            const currentConfigs = get().configs;
            let newConfigs = [...currentConfigs];

            for (const importedConfig of importedConfigs) {
                const existingIndex = newConfigs.findIndex(c => c.name === importedConfig.name);

                if (existingIndex >= 0) {
                    // Handle conflicts
                    const existingConfig = newConfigs[existingIndex];
                    result.conflicts.push({
                        existingConfig,
                        newConfig: importedConfig,
                        conflictType: 'name',
                    });

                    if (options.overwriteExisting) {
                        newConfigs[existingIndex] = {
                            ...importedConfig,
                            id: existingConfig.id, // Keep existing ID
                            updatedAt: new Date(),
                        };
                        result.imported++;
                    } else {
                        result.skipped++;
                    }
                } else {
                    // Add new config
                    newConfigs.push({
                        ...importedConfig,
                        id: generateId(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    result.imported++;
                }
            }

            // Save to backend and update state
            const newActiveConfigId = importData.activeConfigId || get().activeConfigId;
            await saveConfigsToBackend(newConfigs, newActiveConfigId);
            set({ configs: newConfigs, activeConfigId: newActiveConfigId, loading: false });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '导入配置失败';
            set({ error: errorMessage, loading: false });
            const result: ImportResult = {
                success: false,
                imported: 0,
                skipped: 0,
                errors: [errorMessage],
                conflicts: [],
            };
            return result;
        }
    },

    // State management
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Initialize store by loading from backend
    initializeFromBackend: async () => {
        set({ loading: true, error: null });
        try {
            const { configs, activeConfigId } = await loadConfigsFromBackend();
            set({ configs, activeConfigId, loading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '初始化配置失败';
            set({ error: errorMessage, loading: false });
        }
    },
}));