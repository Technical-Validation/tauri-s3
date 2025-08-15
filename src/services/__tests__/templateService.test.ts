import { TemplateService } from '../templateService';
import { ConfigTemplate, S3Config } from '../../types/config';

describe('TemplateService', () => {
    describe('getTemplates', () => {
        it('should return all available templates', () => {
            const templates = TemplateService.getTemplates();
            expect(templates).toHaveLength(5);
            expect(templates.map(t => t.id)).toEqual(['aws', 'minio', 'aliyun', 'tencent', 'custom']);
        });

        it('should return templates with required properties', () => {
            const templates = TemplateService.getTemplates();
            templates.forEach(template => {
                expect(template).toHaveProperty('id');
                expect(template).toHaveProperty('name');
                expect(template).toHaveProperty('provider');
                expect(template).toHaveProperty('description');
                expect(template).toHaveProperty('icon');
                expect(template).toHaveProperty('defaultValues');
                expect(template).toHaveProperty('requiredFields');
            });
        });
    });

    describe('getTemplate', () => {
        it('should return specific template by ID', () => {
            const awsTemplate = TemplateService.getTemplate('aws');
            expect(awsTemplate).toBeTruthy();
            expect(awsTemplate?.name).toBe('Amazon S3');
            expect(awsTemplate?.provider).toBe('aws');
        });

        it('should return null for non-existent template', () => {
            const template = TemplateService.getTemplate('non-existent');
            expect(template).toBeNull();
        });
    });

    describe('createFromTemplate', () => {
        it('should create config from AWS template', () => {
            const config = TemplateService.createFromTemplate('aws');
            expect(config).toEqual({
                endpoint: undefined,
                forcePathStyle: false,
                region: 'us-east-1',
                templateId: 'aws',
                name: 'Amazon S3 Configuration',
            });
        });

        it('should create config from MinIO template', () => {
            const config = TemplateService.createFromTemplate('minio');
            expect(config).toEqual({
                endpoint: 'http://localhost:9000',
                forcePathStyle: true,
                region: 'us-east-1',
                templateId: 'minio',
                name: 'MinIO Configuration',
            });
        });

        it('should throw error for non-existent template', () => {
            expect(() => {
                TemplateService.createFromTemplate('non-existent');
            }).toThrow('Template with ID "non-existent" not found');
        });
    });

    describe('validateAgainstTemplate', () => {
        const mockConfig: S3Config = {
            id: '1',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket',
            templateId: 'aws',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should validate valid AWS config', () => {
            const result = TemplateService.validateAgainstTemplate(mockConfig);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for missing required fields', () => {
            const invalidConfig = { ...mockConfig, accessKeyId: '' };
            const result = TemplateService.validateAgainstTemplate(invalidConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('accessKeyId is required for Amazon S3');
        });

        it('should validate config without template', () => {
            const configWithoutTemplate = { ...mockConfig, templateId: undefined };
            const result = TemplateService.validateAgainstTemplate(configWithoutTemplate);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate MinIO config with endpoint', () => {
            const minioConfig = {
                ...mockConfig,
                templateId: 'minio',
                endpoint: 'http://localhost:9000',
            };
            const result = TemplateService.validateAgainstTemplate(minioConfig);
            expect(result.isValid).toBe(true);
        });

        it('should return error for MinIO config without endpoint', () => {
            const minioConfig = {
                ...mockConfig,
                templateId: 'minio',
                endpoint: undefined,
            };
            const result = TemplateService.validateAgainstTemplate(minioConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('endpoint is required for MinIO');
        });
    });

    describe('suggestTemplate', () => {
        it('should suggest AWS template for config without endpoint', () => {
            const config = { region: 'us-east-1' };
            const template = TemplateService.suggestTemplate(config);
            expect(template?.id).toBe('aws');
        });

        it('should suggest Aliyun template for aliyuncs.com endpoint', () => {
            const config = { endpoint: 'https://oss-cn-hangzhou.aliyuncs.com' };
            const template = TemplateService.suggestTemplate(config);
            expect(template?.id).toBe('aliyun');
        });

        it('should suggest Tencent template for myqcloud.com endpoint', () => {
            const config = { endpoint: 'https://cos.ap-beijing.myqcloud.com' };
            const template = TemplateService.suggestTemplate(config);
            expect(template?.id).toBe('tencent');
        });

        it('should suggest MinIO template for localhost endpoint', () => {
            const config = { endpoint: 'http://localhost:9000' };
            const template = TemplateService.suggestTemplate(config);
            expect(template?.id).toBe('minio');
        });

        it('should suggest custom template for unknown endpoint', () => {
            const config = { endpoint: 'https://my-custom-s3.example.com' };
            const template = TemplateService.suggestTemplate(config);
            expect(template?.id).toBe('custom');
        });
    });

    describe('getEndpointForProvider', () => {
        it('should return undefined for AWS', () => {
            const endpoint = TemplateService.getEndpointForProvider('aws', 'us-east-1');
            expect(endpoint).toBeUndefined();
        });

        it('should return correct endpoint for Aliyun', () => {
            const endpoint = TemplateService.getEndpointForProvider('aliyun', 'oss-cn-hangzhou');
            expect(endpoint).toBe('https://oss-cn-hangzhou.aliyuncs.com');
        });

        it('should return correct endpoint for Tencent', () => {
            const endpoint = TemplateService.getEndpointForProvider('tencent', 'ap-beijing');
            expect(endpoint).toBe('https://cos.ap-beijing.myqcloud.com');
        });

        it('should return undefined for custom providers', () => {
            const endpoint = TemplateService.getEndpointForProvider('custom', 'us-east-1');
            expect(endpoint).toBeUndefined();
        });
    });

    describe('addCustomTemplate', () => {
        it('should add a new custom template', () => {
            const templateData = {
                name: 'Test Custom',
                provider: 'custom' as const,
                description: 'Test custom template',
                icon: '🧪',
                defaultValues: { region: 'test-region' },
                requiredFields: ['accessKeyId', 'secretAccessKey'],
            };

            const newTemplate = TemplateService.addCustomTemplate(templateData);
            expect(newTemplate.id).toMatch(/^custom-\d+$/);
            expect(newTemplate.name).toBe('Test Custom');
            expect(newTemplate.provider).toBe('custom');

            // Verify it's added to the templates list
            const templates = TemplateService.getTemplates();
            expect(templates.find(t => t.id === newTemplate.id)).toBeTruthy();
        });
    });
});