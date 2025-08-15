import { useCallback } from 'react';
import { useConfigStore } from '../stores/configStore';
import { S3Config, ConfigValidationResult } from '../types/config';

/**
 * Custom hook for configuration management
 * Provides convenient methods for working with S3 configurations
 */
export const useConfig = () => {
    const store = useConfigStore();

    // Memoized callbacks to prevent unnecessary re-renders
    const addConfig = useCallback(
        async (config: Omit<S3Config, 'id' | 'createdAt' | 'updatedAt'>) => {
            return store.addConfig(config);
        },
        [store.addConfig]
    );

    const updateConfig = useCallback(
        async (id: string, updates: Partial<S3Config>) => {
            return store.updateConfig(id, updates);
        },
        [store.updateConfig]
    );

    const deleteConfig = useCallback(
        async (id: string) => {
            return store.deleteConfig(id);
        },
        [store.deleteConfig]
    );

    const setActiveConfig = useCallback(
        async (id: string) => {
            return store.setActiveConfig(id);
        },
        [store.setActiveConfig]
    );

    const validateConfig = useCallback(
        async (config: S3Config): Promise<ConfigValidationResult> => {
            return store.validateConfig(config);
        },
        [store.validateConfig]
    );

    const testConnection = useCallback(
        async (config: S3Config): Promise<boolean> => {
            return store.testConnection(config);
        },
        [store.testConnection]
    );

    const exportConfigs = useCallback(
        async (options?: { includeSensitiveData: boolean }) => {
            return store.exportConfigs(options);
        },
        [store.exportConfigs]
    );

    const importConfigs = useCallback(
        async (file: File, options?: { overwriteExisting: boolean; validateBeforeImport: boolean }) => {
            return store.importConfigs(file, options);
        },
        [store.importConfigs]
    );

    const clearError = useCallback(() => {
        store.clearError();
    }, [store.clearError]);

    // Computed values
    const activeConfig = store.getActiveConfig();
    const hasConfigs = store.configs.length > 0;
    const configCount = store.configs.length;

    return {
        // State
        configs: store.configs,
        activeConfigId: store.activeConfigId,
        activeConfig,
        loading: store.loading,
        error: store.error,
        hasConfigs,
        configCount,

        // Actions
        addConfig,
        updateConfig,
        deleteConfig,
        setActiveConfig,
        validateConfig,
        testConnection,
        exportConfigs,
        importConfigs,
        clearError,

        // Utilities
        getConfig: store.getConfig,
    };
};

/**
 * Hook specifically for getting the active configuration
 * Useful when components only need the active config
 */
export const useActiveConfig = () => {
    const activeConfig = useConfigStore((state) => state.getActiveConfig());
    const activeConfigId = useConfigStore((state) => state.activeConfigId);
    const setActiveConfig = useConfigStore((state) => state.setActiveConfig);

    return {
        activeConfig,
        activeConfigId,
        setActiveConfig,
        hasActiveConfig: activeConfig !== null,
    };
};

/**
 * Hook for configuration validation
 * Provides validation utilities without the full store
 */
export const useConfigValidation = () => {
    const validateConfig = useConfigStore((state) => state.validateConfig);
    const testConnection = useConfigStore((state) => state.testConnection);
    const loading = useConfigStore((state) => state.loading);
    const error = useConfigStore((state) => state.error);

    return {
        validateConfig,
        testConnection,
        loading,
        error,
    };
};