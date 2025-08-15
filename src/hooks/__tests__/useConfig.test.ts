import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfig, useActiveConfig, useConfigValidation } from '../useConfig';
import { useConfigStore } from '../../stores/configStore';
import { S3Config } from '../../types/config';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({}),
    })),
    HeadBucketCommand: vi.fn(),
}));

describe('useConfig hook', () => {
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

    describe('useConfig', () => {
        it('should provide access to all config store functionality', () => {
            const { result } = renderHook(() => useConfig());

            expect(result.current.configs).toEqual([]);
            expect(result.current.activeConfigId).toBeNull();
            expect(result.current.activeConfig).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.hasConfigs).toBe(false);
            expect(result.current.configCount).toBe(0);

            // Check that all methods are available
            expect(typeof result.current.addConfig).toBe('function');
            expect(typeof result.current.updateConfig).toBe('function');
            expect(typeof result.current.deleteConfig).toBe('function');
            expect(typeof result.current.setActiveConfig).toBe('function');
            expect(typeof result.current.validateConfig).toBe('function');
            expect(typeof result.current.testConnection).toBe('function');
            expect(typeof result.current.exportConfigs).toBe('function');
            expect(typeof result.current.importConfigs).toBe('function');
            expect(typeof result.current.clearError).toBe('function');
            expect(typeof result.current.getConfig).toBe('function');
        });

        it('should update computed values when configs change', async () => {
            const { result } = renderHook(() => useConfig());

            await act(async () => {
                await result.current.addConfig(mockConfig);
            });

            expect(result.current.hasConfigs).toBe(true);
            expect(result.current.configCount).toBe(1);
            expect(result.current.configs).toHaveLength(1);
            expect(result.current.activeConfig).toBeDefined();
            expect(result.current.activeConfig?.name).toBe(mockConfig.name);
        });

        it('should handle errors correctly', async () => {
            const { result } = renderHook(() => useConfig());

            await act(async () => {
                try {
                    await result.current.addConfig({ ...mockConfig, name: '' });
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBeTruthy();

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('useActiveConfig', () => {
        it('should provide active config information', async () => {
            const { result } = renderHook(() => useActiveConfig());

            expect(result.current.activeConfig).toBeNull();
            expect(result.current.activeConfigId).toBeNull();
            expect(result.current.hasActiveConfig).toBe(false);

            // Add a config using the store directly
            await act(async () => {
                await useConfigStore.getState().addConfig(mockConfig);
            });

            expect(result.current.activeConfig).toBeDefined();
            expect(result.current.activeConfigId).toBeDefined();
            expect(result.current.hasActiveConfig).toBe(true);
        });

        it('should allow setting active config', async () => {
            const { result } = renderHook(() => useActiveConfig());

            // Add two configs
            await act(async () => {
                await useConfigStore.getState().addConfig(mockConfig);
                await useConfigStore.getState().addConfig({
                    ...mockConfig,
                    name: 'Second Config',
                });
            });

            const configs = useConfigStore.getState().configs;
            const secondConfigId = configs[1].id;

            await act(async () => {
                await result.current.setActiveConfig(secondConfigId);
            });

            expect(result.current.activeConfigId).toBe(secondConfigId);
            expect(result.current.activeConfig?.name).toBe('Second Config');
        });
    });

    describe('useConfigValidation', () => {
        it('should provide validation functionality', () => {
            const { result } = renderHook(() => useConfigValidation());

            expect(typeof result.current.validateConfig).toBe('function');
            expect(typeof result.current.testConnection).toBe('function');
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should handle validation correctly', async () => {
            const { result } = renderHook(() => useConfigValidation());

            const validConfig = { ...mockConfig, id: 'test-id' } as S3Config;

            await act(async () => {
                const validationResult = await result.current.validateConfig(validConfig);
                expect(validationResult.isValid).toBe(true);
                expect(validationResult.errors).toHaveLength(0);
            });
        });

        it('should handle connection testing', async () => {
            const { result } = renderHook(() => useConfigValidation());

            const validConfig = { ...mockConfig, id: 'test-id' } as S3Config;

            await act(async () => {
                const connectionResult = await result.current.testConnection(validConfig);
                expect(connectionResult).toBe(true);
            });
        });
    });
});