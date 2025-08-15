import { ConfigTemplate, S3Config } from '../types/config';

// Predefined configuration templates for popular cloud providers
const TEMPLATES: ConfigTemplate[] = [
    {
        id: 'aws',
        name: 'Amazon S3',
        provider: 'aws',
        description: 'Amazon Web Services S3 storage',
        icon: '🟠',
        defaultValues: {
            endpoint: undefined,
            forcePathStyle: false,
            region: 'us-east-1',
        },
        requiredFields: ['accessKeyId', 'secretAccessKey', 'region', 'bucketName'],
        regions: [
            { value: 'us-east-1', label: 'US East (N. Virginia)' },
            { value: 'us-east-2', label: 'US East (Ohio)' },
            { value: 'us-west-1', label: 'US West (N. California)' },
            { value: 'us-west-2', label: 'US West (Oregon)' },
            { value: 'eu-west-1', label: 'Europe (Ireland)' },
            { value: 'eu-west-2', label: 'Europe (London)' },
            { value: 'eu-west-3', label: 'Europe (Paris)' },
            { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
            { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
            { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
            { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
            { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
            { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
            { value: 'sa-east-1', label: 'South America (São Paulo)' },
        ],
    },
    {
        id: 'minio',
        name: 'MinIO',
        provider: 'minio',
        description: 'MinIO object storage server',
        icon: '🔵',
        defaultValues: {
            endpoint: 'http://localhost:9000',
            forcePathStyle: true,
            region: 'us-east-1',
        },
        requiredFields: ['accessKeyId', 'secretAccessKey', 'endpoint', 'bucketName'],
        regions: [
            { value: 'us-east-1', label: 'Default Region' },
        ],
    },
    {
        id: 'aliyun',
        name: '阿里云 OSS',
        provider: 'aliyun',
        description: '阿里云对象存储服务',
        icon: '🟡',
        defaultValues: {
            forcePathStyle: false,
            region: 'oss-cn-hangzhou',
        },
        requiredFields: ['accessKeyId', 'secretAccessKey', 'region', 'bucketName', 'endpoint'],
        regions: [
            { value: 'oss-cn-hangzhou', label: '华东1（杭州）' },
            { value: 'oss-cn-shanghai', label: '华东2（上海）' },
            { value: 'oss-cn-qingdao', label: '华北1（青岛）' },
            { value: 'oss-cn-beijing', label: '华北2（北京）' },
            { value: 'oss-cn-zhangjiakou', label: '华北3（张家口）' },
            { value: 'oss-cn-huhehaote', label: '华北5（呼和浩特）' },
            { value: 'oss-cn-wulanchabu', label: '华北6（乌兰察布）' },
            { value: 'oss-cn-shenzhen', label: '华南1（深圳）' },
            { value: 'oss-cn-heyuan', label: '华南2（河源）' },
            { value: 'oss-cn-guangzhou', label: '华南3（广州）' },
            { value: 'oss-cn-chengdu', label: '西南1（成都）' },
            { value: 'oss-cn-hongkong', label: '中国香港' },
        ],
    },
    {
        id: 'tencent',
        name: '腾讯云 COS',
        provider: 'tencent',
        description: '腾讯云对象存储',
        icon: '🟢',
        defaultValues: {
            forcePathStyle: false,
            region: 'ap-beijing',
        },
        requiredFields: ['accessKeyId', 'secretAccessKey', 'region', 'bucketName'],
        regions: [
            { value: 'ap-beijing', label: '北京' },
            { value: 'ap-shanghai', label: '上海' },
            { value: 'ap-guangzhou', label: '广州' },
            { value: 'ap-chengdu', label: '成都' },
            { value: 'ap-chongqing', label: '重庆' },
            { value: 'ap-shenzhen-fsi', label: '深圳金融' },
            { value: 'ap-shanghai-fsi', label: '上海金融' },
            { value: 'ap-beijing-fsi', label: '北京金融' },
            { value: 'ap-hongkong', label: '中国香港' },
            { value: 'ap-singapore', label: '新加坡' },
            { value: 'ap-mumbai', label: '孟买' },
            { value: 'ap-seoul', label: '首尔' },
            { value: 'ap-bangkok', label: '曼谷' },
            { value: 'ap-tokyo', label: '东京' },
        ],
    },
    {
        id: 'custom',
        name: '自定义配置',
        provider: 'custom',
        description: '自定义S3兼容存储服务',
        icon: '⚙️',
        defaultValues: {
            forcePathStyle: true,
            region: 'us-east-1',
        },
        requiredFields: ['accessKeyId', 'secretAccessKey', 'endpoint', 'bucketName'],
        regions: [
            { value: 'us-east-1', label: 'Default Region' },
        ],
    },
];

export class TemplateService {
    /**
     * Get all available configuration templates
     */
    static getTemplates(): ConfigTemplate[] {
        return [...TEMPLATES];
    }

    /**
     * Get a specific template by ID
     */
    static getTemplate(templateId: string): ConfigTemplate | null {
        return TEMPLATES.find(template => template.id === templateId) || null;
    }

    /**
     * Create a partial configuration from a template
     */
    static createFromTemplate(templateId: string): Partial<S3Config> {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template with ID "${templateId}" not found`);
        }

        return {
            ...template.defaultValues,
            templateId: template.id,
            name: `${template.name} Configuration`,
        };
    }

    /**
     * Get endpoint URL for a specific provider and region
     */
    static getEndpointForProvider(provider: string, region: string, bucketName?: string): string | undefined {
        switch (provider) {
            case 'aws':
                return undefined; // AWS SDK handles this automatically
            case 'aliyun':
                return `https://${region}.aliyuncs.com`;
            case 'tencent':
                return `https://cos.${region}.myqcloud.com`;
            case 'minio':
            case 'custom':
            default:
                return undefined; // User must specify custom endpoint
        }
    }

    /**
     * Validate if a configuration matches its template requirements
     */
    static validateAgainstTemplate(config: S3Config): { isValid: boolean; errors: string[] } {
        if (!config.templateId) {
            return { isValid: true, errors: [] };
        }

        const template = this.getTemplate(config.templateId);
        if (!template) {
            return { isValid: false, errors: ['Invalid template ID'] };
        }

        const errors: string[] = [];

        // Check required fields
        for (const field of template.requiredFields) {
            const value = (config as any)[field];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                errors.push(`${field} is required for ${template.name}`);
            }
        }

        // Validate region for templates that have specific regions
        if (template.regions && template.regions.length > 0) {
            const validRegions = template.regions.map(r => r.value);
            if (config.region && !validRegions.includes(config.region)) {
                errors.push(`Invalid region "${config.region}" for ${template.name}`);
            }
        }

        // Provider-specific validations
        switch (template.provider) {
            case 'aliyun':
                if (config.endpoint && !config.endpoint.includes('aliyuncs.com')) {
                    errors.push('Aliyun OSS endpoint should contain "aliyuncs.com"');
                }
                break;
            case 'tencent':
                if (config.endpoint && !config.endpoint.includes('myqcloud.com')) {
                    errors.push('Tencent COS endpoint should contain "myqcloud.com"');
                }
                break;
            case 'minio':
            case 'custom':
                if (!config.endpoint) {
                    errors.push('Custom endpoint is required for MinIO/custom configurations');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Get template suggestions based on endpoint or other config properties
     */
    static suggestTemplate(config: Partial<S3Config>): ConfigTemplate | null {
        if (config.endpoint) {
            const endpoint = config.endpoint.toLowerCase();

            if (endpoint.includes('aliyuncs.com')) {
                return this.getTemplate('aliyun');
            }
            if (endpoint.includes('myqcloud.com')) {
                return this.getTemplate('tencent');
            }
            if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1') || endpoint.includes('minio')) {
                return this.getTemplate('minio');
            }

            return this.getTemplate('custom');
        }

        // Default to AWS if no endpoint specified
        return this.getTemplate('aws');
    }

    /**
     * Update template default values (for custom templates)
     */
    static updateTemplate(templateId: string, updates: Partial<ConfigTemplate>): boolean {
        const templateIndex = TEMPLATES.findIndex(t => t.id === templateId);
        if (templateIndex === -1) {
            return false;
        }

        TEMPLATES[templateIndex] = { ...TEMPLATES[templateIndex], ...updates };
        return true;
    }

    /**
     * Add a new custom template
     */
    static addCustomTemplate(template: Omit<ConfigTemplate, 'id'>): ConfigTemplate {
        const id = `custom-${Date.now()}`;
        const newTemplate: ConfigTemplate = {
            ...template,
            id,
            provider: 'custom',
        };

        TEMPLATES.push(newTemplate);
        return newTemplate;
    }
}