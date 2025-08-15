import React from 'react';
import { ConfigTemplate } from '../../types/config';
import { useConfigTemplates } from '../../hooks/useConfigTemplates';

interface ConfigTemplateSelectorProps {
    selectedTemplateId?: string;
    onTemplateSelect: (templateId: string | null) => void;
    className?: string;
    disabled?: boolean;
}

export const ConfigTemplateSelector: React.FC<ConfigTemplateSelectorProps> = ({
    selectedTemplateId,
    onTemplateSelect,
    className = '',
    disabled = false,
}) => {
    const { templates } = useConfigTemplates();

    const handleTemplateClick = (templateId: string) => {
        if (disabled) return;
        onTemplateSelect(selectedTemplateId === templateId ? null : templateId);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">选择配置模板</h3>
                <p className="text-sm text-gray-600 mb-4">
                    选择一个预设模板来快速配置常用的云存储服务
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {templates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplateId === template.id}
                        onClick={() => handleTemplateClick(template.id)}
                        disabled={disabled}
                    />
                ))}
            </div>

            {selectedTemplateId && (
                <div className="mt-4">
                    <TemplateDetails templateId={selectedTemplateId} />
                </div>
            )}
        </div>
    );
};

interface TemplateCardProps {
    template: ConfigTemplate;
    isSelected: boolean;
    onClick: () => void;
    disabled: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    isSelected,
    onClick,
    disabled,
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
        ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
        >
            <div className="text-center">
                <div className="text-2xl mb-2">{template.icon}</div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                    {template.name}
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">
                    {template.description}
                </div>
            </div>

            {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
            )}
        </button>
    );
};

interface TemplateDetailsProps {
    templateId: string;
}

const TemplateDetails: React.FC<TemplateDetailsProps> = ({ templateId }) => {
    const { templates } = useConfigTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) return null;

    return (
        <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-start space-x-3">
                <div className="text-2xl">{template.icon}</div>
                <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                    <div className="space-y-2">
                        <div>
                            <span className="text-xs font-medium text-gray-700">必填字段：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {template.requiredFields.map((field) => (
                                    <span
                                        key={field}
                                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                                    >
                                        {getFieldDisplayName(field)}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {template.regions && template.regions.length > 0 && (
                            <div>
                                <span className="text-xs font-medium text-gray-700">
                                    可用区域：{template.regions.length} 个
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                    {template.regions.slice(0, 3).map(r => r.label).join(', ')}
                                    {template.regions.length > 3 && ` 等 ${template.regions.length} 个区域`}
                                </div>
                            </div>
                        )}

                        {template.defaultValues.endpoint && (
                            <div>
                                <span className="text-xs font-medium text-gray-700">默认端点：</span>
                                <span className="text-xs text-gray-600 ml-1">
                                    {template.defaultValues.endpoint}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to get display names for fields
const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
        accessKeyId: 'Access Key ID',
        secretAccessKey: 'Secret Access Key',
        region: '区域',
        bucketName: '存储桶名称',
        endpoint: '端点地址',
        name: '配置名称',
    };
    return fieldNames[field] || field;
};

export default ConfigTemplateSelector;