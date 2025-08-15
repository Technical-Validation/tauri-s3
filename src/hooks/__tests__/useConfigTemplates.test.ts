import { renderHook, act } from '@testing-library/react';
import { useConfigTemplates, useTemplateValidation, useTemplateRegions } from '../useConfigTemplates';
import { S3Config } from '../../types/config';

describe('useConfigTemplates', () => {
    it('should return all templates', () => {
        const { result } = renderHook(() => useConfigTemplates());

        expect(result.current.templates).toHaveLength(5);
        expect(result.current.templates.map(t => t.id)).toEqual(['aws', 'minio', 'aliyun', 'tencent', 'custom']);
    });

    it('should handle template selection', () => {
        const { result } = renderHook(() => useConfigTemplates());

        expect(result.current.selectedTemplate).toBeNull();

        act(() => {
            result.current.selectTemplate('aws');
        });

        expect(result.current.selectedTemplate?.id).toBe('aws');
        expect(result.current.selectedTemplate?.name).toBe('Amazon S3');
    });

    it('should create config from template', () => {
        const { result } = renderHook(() => useConfigTemplates());

        const config = result.current.createFromTemplate('aws');
        expect(config).toEqual({
            endpoint: undefined,
            forcePathStyle: false,
            region: 'us-east-1',
            templateId: 'aws',
            name: 'Amazon S3 Configuration',
        });
    });

    it('should validate config against template', () => {
        const { result } = renderHook(() => useConfigTemplates());

        const validConfig: S3Config = {
            id: '1',
            name: 'Test',
            accessKeyId: 'key',
            secretAccessKey: 'secret',
            region: 'us-east-1',
            bucketName: 'bucket',
            templateId: 'aws',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const validation = result.current.validateAgainstTemplate(validConfig);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    it('should suggest template based on config', () => {
        const { result } = renderHook(() => useConfigTemplates());

        const config = { endpoint: 'https://oss-cn-hangzhou.aliyuncs.com' };
        const suggested = result.current.suggestTemplate(config);
        expect(suggested?.id).toBe('aliyun');
    });

    it('should get regions for template', () => {
        const { result } = renderHook(() => useConfigTemplates());

        const regions = result.current.getRegionsForTemplate('aws');
        expect(regions).toBeDefined();
        expect(regions!.length).toBeGreaterThan(0);
        expect(regions![0]).toHaveProperty('value');
        expect(regions![0]).toHaveProperty('label');
    });

    it('should check if field is required', () => {
        const { result } = renderHook(() => useConfigTemplates());

        expect(result.current.isFieldRequired('aws', 'accessKeyId')).toBe(true);
        expect(result.current.isFieldRequired('aws', 'endpoint')).toBe(false);
        expect(result.current.isFieldRequired('minio', 'endpoint')).toBe(true);
    });

    it('should initialize with template ID', () => {
        const { result } = renderHook(() => useConfigTemplates('minio'));

        expect(result.current.selectedTemplate?.id).toBe('minio');
    });
});

describe('useTemplateValidation', () => {
    it('should validate complete config', () => {
        const config: S3Config = {
            id: '1',
            name: 'Test',
            accessKeyId: 'key',
            secretAccessKey: 'secret',
            region: 'us-east-1',
            bucketName: 'bucket',
            templateId: 'aws',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const { result } = renderHook(() => useTemplateValidation(config));

        expect(result.current.isValid).toBe(true);
        expect(result.current.errors).toHaveLength(0);
    });

    it('should suggest template for partial config', () => {
        const config = { endpoint: 'http://localhost:9000' };

        const { result } = renderHook(() => useTemplateValidation(config));

        expect(result.current.suggestedTemplate?.id).toBe('minio');
    });

    it('should handle config without template', () => {
        const config = { name: 'Test', region: 'us-east-1' };

        const { result } = renderHook(() => useTemplateValidation(config));

        expect(result.current.isValid).toBe(true);
        expect(result.current.suggestedTemplate?.id).toBe('aws');
    });
});

describe('useTemplateRegions', () => {
    it('should return regions for AWS template', () => {
        const { result } = renderHook(() => useTemplateRegions('aws'));

        expect(result.current.hasRegions).toBe(true);
        expect(result.current.regions.length).toBeGreaterThan(0);
        expect(result.current.regions[0]).toHaveProperty('value');
        expect(result.current.regions[0]).toHaveProperty('label');
    });

    it('should return empty regions for undefined template', () => {
        const { result } = renderHook(() => useTemplateRegions());

        expect(result.current.hasRegions).toBe(false);
        expect(result.current.regions).toHaveLength(0);
    });

    it('should get region label', () => {
        const { result } = renderHook(() => useTemplateRegions('aws'));

        const label = result.current.getRegionLabel('us-east-1');
        expect(label).toBe('US East (N. Virginia)');
    });

    it('should validate region', () => {
        const { result } = renderHook(() => useTemplateRegions('aws'));

        expect(result.current.isValidRegion('us-east-1')).toBe(true);
        expect(result.current.isValidRegion('invalid-region')).toBe(false);
    });

    it('should allow any region when no restrictions', () => {
        const { result } = renderHook(() => useTemplateRegions());

        expect(result.current.isValidRegion('any-region')).toBe(true);
    });
});