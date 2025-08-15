import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, LoadingSpinner } from '../common';
import { useConfig } from '../../hooks/useConfig';
import { useConfigTemplates } from '../../hooks/useConfigTemplates';
import { ConfigTemplateSelector } from './ConfigTemplateSelector';
import { S3Config } from '../../types/config';

interface ConfigFormProps {
    config?: S3Config;
    onSave?: (config: S3Config) => void;
    onCancel?: () => void;
    isEditing?: boolean;
    enableAutoSave?: boolean;
    enableDraft?: boolean;
    showTemplateSelector?: boolean;
}

interface FormData {
    name: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucketName: string;
    endpoint: string;
    forcePathStyle: boolean;
    templateId?: string;
    tags?: string[];
}

interface DraftData extends FormData {
    id: string;
    savedAt: Date;
}

const initialFormData: FormData = {
    name: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucketName: '',
    endpoint: '',
    forcePathStyle: false,
    templateId: undefined,
    tags: [],
};

const AWS_REGIONS = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-west-2', label: 'Europe (London)' },
    { value: 'eu-west-3', label: 'Europe (Paris)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
    { value: 'sa-east-1', label: 'South America (São Paulo)' },
];

export const ConfigForm: React.FC<ConfigFormProps> = ({
    config,
    onSave,
    onCancel,
    isEditing = false,
    enableAutoSave = true,
    enableDraft = true,
    showTemplateSelector: initialShowTemplateSelector,
}) => {
    const { addConfig, updateConfig, validateConfig, testConnection, loading, error, clearError } = useConfig();
    const {
        templates,
        selectedTemplate,
        selectTemplate,
        createFromTemplate,
        getRegionsForTemplate,
        isFieldRequired
    } = useConfigTemplates(config?.templateId);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<boolean | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showTemplateSelector, setShowTemplateSelector] = useState(
        initialShowTemplateSelector !== undefined ? initialShowTemplateSelector : (!isEditing && !config)
    );
    const [availableDrafts, setAvailableDrafts] = useState<DraftData[]>([]);
    const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState('');

    const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
    const formRef = useRef<HTMLFormElement>(null);

    // Draft management functions
    const getDraftKey = useCallback(() => {
        return config?.id ? `config-draft-${config.id}` : 'config-draft-new';
    }, [config?.id]);

    const saveDraft = useCallback((data: FormData) => {
        if (!enableDraft) return;

        const draftData: DraftData = {
            ...data,
            id: getDraftKey(),
            savedAt: new Date(),
        };

        localStorage.setItem(getDraftKey(), JSON.stringify(draftData));
        setLastSaved(new Date());
    }, [enableDraft, getDraftKey]);

    const loadDraft = useCallback(() => {
        if (!enableDraft) return null;

        const draftJson = localStorage.getItem(getDraftKey());
        if (draftJson) {
            try {
                return JSON.parse(draftJson) as DraftData;
            } catch (error) {
                console.error('Failed to parse draft:', error);
                localStorage.removeItem(getDraftKey());
            }
        }
        return null;
    }, [enableDraft, getDraftKey]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(getDraftKey());
        setLastSaved(null);
    }, [getDraftKey]);

    const loadAvailableDrafts = useCallback(() => {
        if (!enableDraft) return;

        const drafts: DraftData[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('config-draft-')) {
                const draftJson = localStorage.getItem(key);
                if (draftJson) {
                    try {
                        const draft = JSON.parse(draftJson) as DraftData;
                        drafts.push(draft);
                    } catch (error) {
                        console.error('Failed to parse draft:', error);
                    }
                }
            }
        }
        setAvailableDrafts(drafts.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime()));
    }, [enableDraft]);

    // Auto-save functionality
    const performAutoSave = useCallback(async (data: FormData) => {
        if (!enableAutoSave || !isDirty) return;

        setAutoSaveStatus('saving');
        try {
            saveDraft(data);
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (error) {
            setAutoSaveStatus('error');
            setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
    }, [enableAutoSave, isDirty, saveDraft]);

    // Initialize form data when config prop changes
    useEffect(() => {
        if (config) {
            const configData = {
                name: config.name,
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                region: config.region,
                bucketName: config.bucketName,
                endpoint: config.endpoint || '',
                forcePathStyle: config.forcePathStyle || false,
                templateId: config.templateId,
                tags: config.tags || [],
            };
            setFormData(configData);
            if (config.templateId) {
                selectTemplate(config.templateId);
            }
        } else {
            // Try to load draft for new configs
            const draft = loadDraft();
            if (draft) {
                setFormData(draft);
                setLastSaved(draft.savedAt);
                if (draft.templateId) {
                    selectTemplate(draft.templateId);
                }
            } else {
                setFormData(initialFormData);
            }
        }
        setIsDirty(false);
    }, [config, loadDraft, selectTemplate]);

    // Load available drafts on mount
    useEffect(() => {
        loadAvailableDrafts();
    }, [loadAvailableDrafts]);

    // Auto-save effect
    useEffect(() => {
        if (isDirty && enableAutoSave) {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }

            autoSaveTimeoutRef.current = setTimeout(() => {
                performAutoSave(formData);
            }, 2000); // Auto-save after 2 seconds of inactivity
        }

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [formData, isDirty, enableAutoSave, performAutoSave]);

    // Clear errors when form data changes
    useEffect(() => {
        if (error) {
            clearError();
        }
        setValidationErrors([]);
        setValidationWarnings([]);
        setConnectionTestResult(null);
    }, [formData, error, clearError]);

    // Handle template selection
    const handleTemplateSelect = useCallback((templateId: string | null) => {
        selectTemplate(templateId);

        if (templateId) {
            const templateData = createFromTemplate(templateId);
            const regions = getRegionsForTemplate(templateId);

            setFormData(prev => ({
                ...prev,
                ...templateData,
                templateId,
                // Keep existing values if they exist
                name: prev.name || templateData.name || '',
                region: regions && regions.length > 0 ? regions[0].value : templateData.region || prev.region,
            }));
            setIsDirty(true);
        }
    }, [selectTemplate, createFromTemplate, getRegionsForTemplate]);

    const handleInputChange = (field: keyof FormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
        setIsDirty(true);
    };

    // Tag management functions
    const addTag = useCallback((tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...(prev.tags || []), trimmedTag],
            }));
            setIsDirty(true);
        }
        setTagInput('');
    }, [formData.tags]);

    const removeTag = useCallback((tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
        }));
        setIsDirty(true);
    }, []);

    const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && tagInput === '' && formData.tags && formData.tags.length > 0) {
            removeTag(formData.tags[formData.tags.length - 1]);
        }
    }, [tagInput, addTag, removeTag, formData.tags]);

    // Draft management functions
    const loadDraftData = useCallback((draftId: string) => {
        const draft = availableDrafts.find(d => d.id === draftId);
        if (draft) {
            setFormData(draft);
            setSelectedDraft(draftId);
            setIsDirty(true);
            if (draft.templateId) {
                selectTemplate(draft.templateId);
            }
        }
    }, [availableDrafts, selectTemplate]);

    const deleteDraft = useCallback((draftId: string) => {
        localStorage.removeItem(draftId);
        loadAvailableDrafts();
        if (selectedDraft === draftId) {
            setSelectedDraft(null);
        }
    }, [selectedDraft, loadAvailableDrafts]);

    // Copy configuration function
    const copyConfiguration = useCallback(() => {
        if (config) {
            const copiedData = {
                ...formData,
                name: `${formData.name} (副本)`,
            };
            setFormData(copiedData);
            setIsDirty(true);
        }
    }, [config, formData]);

    const validateForm = async (): Promise<boolean> => {
        const tempConfig: S3Config = {
            id: config?.id || 'temp',
            name: formData.name,
            accessKeyId: formData.accessKeyId,
            secretAccessKey: formData.secretAccessKey,
            region: formData.region,
            bucketName: formData.bucketName,
            endpoint: formData.endpoint || undefined,
            forcePathStyle: formData.forcePathStyle,
            templateId: formData.templateId,
            tags: formData.tags,
            createdAt: config?.createdAt || new Date(),
            updatedAt: new Date(),
        };

        try {
            const validation = await validateConfig(tempConfig);
            const errors = [...validation.errors];
            const warnings = [...(validation.warnings || [])];

            // Additional template-based validation
            if (selectedTemplate) {
                selectedTemplate.requiredFields.forEach(field => {
                    const value = (tempConfig as any)[field];
                    if (!value || (typeof value === 'string' && value.trim() === '')) {
                        errors.push(`${getFieldDisplayName(field)} 是 ${selectedTemplate.name} 的必填字段`);
                    }
                });

                // Validate region for template
                if (selectedTemplate.regions && selectedTemplate.regions.length > 0) {
                    const validRegions = selectedTemplate.regions.map(r => r.value);
                    if (tempConfig.region && !validRegions.includes(tempConfig.region)) {
                        errors.push(`区域 "${tempConfig.region}" 不适用于 ${selectedTemplate.name}`);
                    }
                }
            }

            setValidationErrors(errors);
            setValidationWarnings(warnings);
            return errors.length === 0;
        } catch (err) {
            setValidationErrors(['验证配置时发生错误']);
            return false;
        }
    };

    // Helper function to get field display names
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

    const handleTestConnection = async () => {
        const isValid = await validateForm();
        if (!isValid) {
            return;
        }

        setIsTestingConnection(true);
        setConnectionTestResult(null);

        const tempConfig: S3Config = {
            id: config?.id || 'temp',
            name: formData.name,
            accessKeyId: formData.accessKeyId,
            secretAccessKey: formData.secretAccessKey,
            region: formData.region,
            bucketName: formData.bucketName,
            endpoint: formData.endpoint || undefined,
            forcePathStyle: formData.forcePathStyle,
            createdAt: config?.createdAt || new Date(),
            updatedAt: new Date(),
        };

        try {
            const result = await testConnection(tempConfig);
            setConnectionTestResult(result);
        } catch (err) {
            setConnectionTestResult(false);
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = await validateForm();
        if (!isValid) {
            return;
        }

        try {
            const configData = {
                name: formData.name,
                accessKeyId: formData.accessKeyId,
                secretAccessKey: formData.secretAccessKey,
                region: formData.region,
                bucketName: formData.bucketName,
                endpoint: formData.endpoint || undefined,
                forcePathStyle: formData.forcePathStyle,
                templateId: formData.templateId,
                tags: formData.tags,
            };

            if (isEditing && config) {
                await updateConfig(config.id, configData);
            } else {
                await addConfig(configData);
            }

            // Clear draft after successful save
            clearDraft();
            setIsDirty(false);

            if (onSave) {
                onSave({
                    ...configData,
                    id: config?.id || 'new',
                    createdAt: config?.createdAt || new Date(),
                    updatedAt: new Date(),
                });
            }
        } catch (err) {
            // Error is handled by the store
        }
    };

    const handleCancel = () => {
        // Ask user if they want to save draft if form is dirty
        if (isDirty && enableDraft) {
            const shouldSaveDraft = window.confirm('是否保存当前更改为草稿？');
            if (shouldSaveDraft) {
                saveDraft(formData);
            }
        }

        setFormData(config ? {
            name: config.name,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region,
            bucketName: config.bucketName,
            endpoint: config.endpoint || '',
            forcePathStyle: config.forcePathStyle || false,
            templateId: config.templateId,
            tags: config.tags || [],
        } : initialFormData);
        setValidationErrors([]);
        setValidationWarnings([]);
        setConnectionTestResult(null);
        setIsDirty(false);
        clearError();

        if (onCancel) {
            onCancel();
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            {/* Header with status indicators */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isEditing ? '编辑S3配置' : '新建S3配置'}
                    </h2>
                    {selectedTemplate && (
                        <p className="text-sm text-gray-600 mt-1">
                            使用 {selectedTemplate.name} 模板
                        </p>
                    )}
                </div>

                <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    {/* Auto-save status */}
                    {enableAutoSave && (
                        <div className="flex items-center text-sm">
                            {autoSaveStatus === 'saving' && (
                                <>
                                    <LoadingSpinner size="sm" className="mr-1" />
                                    <span className="text-gray-600">保存中...</span>
                                </>
                            )}
                            {autoSaveStatus === 'saved' && (
                                <>
                                    <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-green-600">已自动保存</span>
                                </>
                            )}
                            {autoSaveStatus === 'error' && (
                                <>
                                    <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-red-600">保存失败</span>
                                </>
                            )}
                            {lastSaved && autoSaveStatus === 'idle' && (
                                <span className="text-gray-500">
                                    上次保存: {lastSaved instanceof Date ? lastSaved.toLocaleTimeString() : new Date(lastSaved).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Copy configuration button */}
                    {isEditing && config && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={copyConfiguration}
                            className="flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            复制配置
                        </Button>
                    )}
                </div>
            </div>

            {/* Draft management */}
            {enableDraft && availableDrafts.length > 0 && !isEditing && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">发现草稿</h3>
                    <div className="space-y-2">
                        {availableDrafts.slice(0, 3).map((draft) => (
                            <div key={draft.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <span className="font-medium">{draft.name || '未命名配置'}</span>
                                    <span className="text-gray-500 ml-2">
                                        {new Date(draft.savedAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => loadDraftData(draft.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        加载
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteDraft(draft.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Template Selector */}
            {showTemplateSelector && (
                <div className="mb-8">
                    <ConfigTemplateSelector
                        selectedTemplateId={formData.templateId}
                        onTemplateSelect={handleTemplateSelect}
                        disabled={loading}
                    />
                    <div className="mt-4 flex justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowTemplateSelector(false)}
                        >
                            {formData.templateId ? '继续配置' : '跳过模板选择'}
                        </Button>
                    </div>
                </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                            基本信息
                        </h3>

                        {/* Configuration Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                配置名称 *
                            </label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={handleInputChange('name')}
                                placeholder="输入配置名称"
                                required
                                className="w-full"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                                标签
                            </label>
                            <div className="space-y-2">
                                {formData.tags && formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <Input
                                    id="tags"
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagInputKeyDown}
                                    placeholder="输入标签后按回车键添加"
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500">
                                    按回车键或逗号添加标签
                                </p>
                            </div>
                        </div>

                        {/* Template Info */}
                        {selectedTemplate && (
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg">{selectedTemplate.icon}</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {selectedTemplate.name}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {selectedTemplate.description}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplateSelector(true)}
                                        className="ml-auto text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        更换模板
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                            连接参数
                        </h3>

                        {/* Access Key ID */}
                        <div>
                            <label htmlFor="accessKeyId" className="block text-sm font-medium text-gray-700 mb-2">
                                Access Key ID {isFieldRequired(formData.templateId, 'accessKeyId') && '*'}
                            </label>
                            <Input
                                id="accessKeyId"
                                type="text"
                                value={formData.accessKeyId}
                                onChange={handleInputChange('accessKeyId')}
                                placeholder={selectedTemplate?.provider === 'aws' ? '输入AWS Access Key ID' : '输入Access Key ID'}
                                required={isFieldRequired(formData.templateId, 'accessKeyId')}
                                className="w-full"
                            />
                        </div>

                        {/* Secret Access Key */}
                        <div>
                            <label htmlFor="secretAccessKey" className="block text-sm font-medium text-gray-700 mb-2">
                                Secret Access Key {isFieldRequired(formData.templateId, 'secretAccessKey') && '*'}
                            </label>
                            <div className="relative">
                                <Input
                                    id="secretAccessKey"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.secretAccessKey}
                                    onChange={handleInputChange('secretAccessKey')}
                                    placeholder={selectedTemplate?.provider === 'aws' ? '输入AWS Secret Access Key' : '输入Secret Access Key'}
                                    required={isFieldRequired(formData.templateId, 'secretAccessKey')}
                                    className="w-full pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Region */}
                        <div>
                            <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                                区域 {isFieldRequired(formData.templateId, 'region') && '*'}
                            </label>
                            <select
                                id="region"
                                value={formData.region}
                                onChange={handleInputChange('region')}
                                required={isFieldRequired(formData.templateId, 'region')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                {(selectedTemplate?.regions || AWS_REGIONS).map(region => (
                                    <option key={region.value} value={region.value}>
                                        {region.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bucket Name */}
                        <div>
                            <label htmlFor="bucketName" className="block text-sm font-medium text-gray-700 mb-2">
                                存储桶名称 {isFieldRequired(formData.templateId, 'bucketName') && '*'}
                            </label>
                            <Input
                                id="bucketName"
                                type="text"
                                value={formData.bucketName}
                                onChange={handleInputChange('bucketName')}
                                placeholder="输入存储桶名称"
                                required={isFieldRequired(formData.templateId, 'bucketName')}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        高级选项
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Custom Endpoint */}
                        <div>
                            <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-2">
                                自定义端点 {isFieldRequired(formData.templateId, 'endpoint') && '*'}
                            </label>
                            <Input
                                id="endpoint"
                                type="url"
                                value={formData.endpoint}
                                onChange={handleInputChange('endpoint')}
                                placeholder={selectedTemplate?.defaultValues.endpoint || "https://s3.example.com"}
                                required={isFieldRequired(formData.templateId, 'endpoint')}
                                className="w-full"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                {selectedTemplate?.provider === 'minio'
                                    ? '用于MinIO服务器地址'
                                    : selectedTemplate?.provider === 'custom'
                                        ? '用于自定义S3兼容服务'
                                        : '用于兼容S3的存储服务，如MinIO'
                                }
                            </p>
                        </div>

                        {/* Force Path Style */}
                        <div>
                            <div className="flex items-center h-10">
                                <input
                                    id="forcePathStyle"
                                    type="checkbox"
                                    checked={formData.forcePathStyle}
                                    onChange={handleInputChange('forcePathStyle')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="forcePathStyle" className="ml-2 block text-sm text-gray-700">
                                    强制路径样式
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                {selectedTemplate?.provider === 'minio'
                                    ? 'MinIO通常需要启用此选项'
                                    : '用于某些S3兼容服务'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">配置验证失败</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        {validationErrors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">配置警告</h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        {validationWarnings.map((warning, index) => (
                                            <li key={index}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* General Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">操作失败</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    {error}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Connection Test Result */}
                {connectionTestResult !== null && (
                    <div className={`border rounded-md p-4 ${connectionTestResult
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {connectionTestResult ? (
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3">
                                <h3 className={`text-sm font-medium ${connectionTestResult ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {connectionTestResult ? '连接测试成功' : '连接测试失败'}
                                </h3>
                                <div className={`mt-2 text-sm ${connectionTestResult ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {connectionTestResult
                                        ? '配置正确，可以成功连接到S3存储桶'
                                        : '无法连接到S3存储桶，请检查配置信息'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleTestConnection}
                        disabled={loading || isTestingConnection}
                        className="flex items-center justify-center"
                    >
                        {isTestingConnection ? (
                            <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                测试连接中...
                            </>
                        ) : (
                            '测试连接'
                        )}
                    </Button>

                    <div className="flex gap-4 sm:ml-auto">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            取消
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading || validationErrors.length > 0}
                            className="flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    保存中...
                                </>
                            ) : (
                                isEditing ? '更新配置' : '保存配置'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};