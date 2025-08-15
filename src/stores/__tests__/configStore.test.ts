import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigStore } from '../configStore';
import { S3Config } from '../../types/config';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({}),
    })),
    HeadBucketCommand: vi.fn(),
}));

describe('ConfigStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useConfigStore.setState({
            configs: [],
            activeConfigId: null,
            loading: false,
            error: null,
        });
    });

    const mockConfig: Omit<S3Config, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Config',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        bucketName: 'test-bucket',
    };

    describe('addConfig', () => {
        it('should add a new config successfully', async () => {
            const store = useConfigStore.getState();

            await store.addConfig(mockConfig);

            const state = useConfigStore.getState();
            expect(state.configs).toHaveLength(1);
            expect(state.configs[0].name).toBe(mockConfig.name);
            expect(state.configs[0].id).toBeDefined();
            expect(state.configs[0].createdAt).toBeDefined();
            expect(state.configs[0].updatedAt).toBeDefined();
        });

        it('should set first config as active automatically', async () => {
            const store = useConfigStore.getState();

            await store.addConfig(mockConfig);

            const state = useConfigStore.getState();
            expect(state.activeConfigId).toBe(state.configs[0].id);
        });

        it('should validate config before adding', async () => {
            const store = useConfigStore.getState();
            const invalidConfig = { ...mockConfig, name: '' };

            await expect(store.addConfig(invalidConfig)).rejects.toThrow('配置验证失败');
        });
    });

    describe('updateConfig', () => {
        it('should update existing config', async () => {
            const store = useConfigStore.getState();

            // Add a config first
            await store.addConfig(mockConfig);
            const configId = useConfigStore.getState().configs[0].id;

            // Update the config
            await store.updateConfig(configId, { name: 'Updated Config' });

            const state = useConfigStore.getState();
            expect(state.configs[0].name).toBe('Updated Config');
            expect(state.configs[0].updatedAt).toBeDefined();
        });
    });

    describe('deleteConfig', () => {
        it('should delete config successfully', async () => {
            const store = useConfigStore.getState();

            // Add a config first
            await store.addConfig(mockConfig);
            const configId = useConfigStore.getState().configs[0].id;

            // Delete the config
            await store.deleteConfig(configId);

            const state = useConfigStore.getState();
            expect(state.configs).toHaveLength(0);
            expect(state.activeConfigId).toBeNull();
        });

        it('should throw error when deleting non-existent config', async () => {
            const store = useConfigStore.getState();

            await expect(store.deleteConfig('non-existent')).rejects.toThrow('配置不存在');
        });
    });

    describe('getConfig', () => {
        it('should return config by id', async () => {
            const store = useConfigStore.getState();

            await store.addConfig(mockConfig);
            const configId = useConfigStore.getState().configs[0].id;

            const config = store.getConfig(configId);
            expect(config).toBeDefined();
            expect(config?.name).toBe(mockConfig.name);
        });

        it('should return null for non-existent config', () => {
            const store = useConfigStore.getState();

            const config = store.getConfig('non-existent');
            expect(config).toBeNull();
        });
    });

    describe('setActiveConfig', () => {
        it('should set active config successfully', async () => {
            const store = useConfigStore.getState();

            await store.addConfig(mockConfig);
            const configId = useConfigStore.getState().configs[0].id;

            await store.setActiveConfig(configId);

            const state = useConfigStore.getState();
            expect(state.activeConfigId).toBe(configId);
        });

        it('should not change active config when setting non-existent config as active', () => {
            const store = useConfigStore.getState();
            const initialActiveConfigId = store.activeConfigId;

            store.setActiveConfig('non-existent');

            // Should remain unchanged
            expect(store.activeConfigId).toBe(initialActiveConfigId);
        });
    });

    describe('getActiveConfig', () => {
        it('should return active config', async () => {
            const store = useConfigStore.getState();

            await store.addConfig(mockConfig);
            const configId = useConfigStore.getState().configs[0].id;
            await store.setActiveConfig(configId);

            const activeConfig = store.getActiveConfig();
            expect(activeConfig).toBeDefined();
            expect(activeConfig?.name).toBe(mockConfig.name);
        });

        it('should return null when no active config', () => {
            const store = useConfigStore.getState();

            const activeConfig = store.getActiveConfig();
            expect(activeConfig).toBeNull();
        });
    });

    describe('validateConfig', () => {
        it('should validate valid config', async () => {
            const store = useConfigStore.getState();
            const validConfig = { ...mockConfig, id: 'test-id' } as S3Config;

            const result = await store.validateConfig(validConfig);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for invalid config', async () => {
            const store = useConfigStore.getState();
            const invalidConfig = {
                ...mockConfig,
                id: 'test-id',
                name: '',
                accessKeyId: '',
            } as S3Config;

            const result = await store.validateConfig(invalidConfig);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors).toContain('配置名称不能为空');
            expect(result.errors).toContain('Access Key ID不能为空');
        });

        it('should return warnings for potentially incorrect formats', async () => {
            const store = useConfigStore.getState();
            const configWithWarnings = {
                ...mockConfig,
                id: 'test-id',
                accessKeyId: 'invalid-format',
                secretAccessKey: 'too-short',
            } as S3Config;

            const result = await store.validateConfig(configWithWarnings);

            expect(result.warnings).toBeDefined();
            expect(result.warnings!.length).toBeGreaterThan(0);
        });
    });

    describe('testConnection', () => {
        it('should return connection test result for successful connection', async () => {
            const store = useConfigStore.getState();
            const validConfig = { ...mockConfig, id: 'test-id' } as S3Config;

            const result = await store.testConnection(validConfig);

            expect(result.success).toBe(true);
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details.authentication).toBe(true);
            expect(result.details.bucketAccess).toBe(true);
        });
    });

    describe('state management', () => {
        it('should set loading state', () => {
            const store = useConfigStore.getState();

            store.setLoading(true);

            const state = useConfigStore.getState();
            expect(state.loading).toBe(true);
        });

        it('should set error state', () => {
            const store = useConfigStore.getState();
            const errorMessage = 'Test error';

            store.setError(errorMessage);

            const state = useConfigStore.getState();
            expect(state.error).toBe(errorMessage);
        });

        it('should clear error state', () => {
            const store = useConfigStore.getState();

            store.setError('Test error');
            store.clearError();

            const state = useConfigStore.getState();
            expect(state.error).toBeNull();
        });
    });
});