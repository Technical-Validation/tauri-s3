import { useState, useCallback, useMemo } from 'react';
import { ConfigTemplate, S3Config } from '../types/config';
import { TemplateService } from '../services/templateService';

export interface UseConfigTemplatesReturn {
    templates: ConfigTemplate[];
    selectedTemplate: ConfigTemplate | null;
    selectTemplate: (templateId: string | null) => void;
    createFromTemplate: (templateId: string) => Partial<S3Config>;
    validateAgainstTemplate: (config: S3Config) => { isValid: boolean; errors: string[] };
    suggestTemplate: (config: Partial<S3Config>) => ConfigTemplate | null;
    getRegionsForTemplate: (templateId: string) => { value: string; label: string }[] | undefined;
    getRequiredFields: (templateId: string) => string[];
    isFieldRequired: (templateId: string | undefined, fieldName: string) => boolean;
}

/**
 * Hook for managing configuration templates
 */
export const useConfigTemplates = (initialTemplateId?: string): UseConfigTemplatesReturn => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId || null);

    // Get all available templates
    const templates = useMemo(() => TemplateService.getTemplates(), []);

    // Get currently selected template
    const selectedTemplate = useMemo(() => {
        return selectedTemplateId ? TemplateService.getTemplate(selectedTemplateId) : null;
    }, [selectedTemplateId]);

    // Select a template
    const selectTemplate = useCallback((templateId: string | null) => {
        setSelectedTemplateId(templateId);
    }, []);

    // Create configuration from template
    const createFromTemplate = useCallback((templateId: string) => {
        return TemplateService.createFromTemplate(templateId);
    }, []);

    // Validate configuration against template
    const validateAgainstTemplate = useCallback((config: S3Config) => {
        return TemplateService.validateAgainstTemplate(config);
    }, []);

    // Suggest template based on configuration
    const suggestTemplate = useCallback((config: Partial<S3Config>) => {
        return TemplateService.suggestTemplate(config);
    }, []);

    // Get regions for a specific template
    const getRegionsForTemplate = useCallback((templateId: string) => {
        const template = TemplateService.getTemplate(templateId);
        return template?.regions;
    }, []);

    // Get required fields for a template
    const getRequiredFields = useCallback((templateId: string) => {
        const template = TemplateService.getTemplate(templateId);
        return template?.requiredFields || [];
    }, []);

    // Check if a field is required for the current template
    const isFieldRequired = useCallback((templateId: string | undefined, fieldName: string) => {
        if (!templateId) return false;
        const template = TemplateService.getTemplate(templateId);
        return template?.requiredFields.includes(fieldName) || false;
    }, []);

    return {
        templates,
        selectedTemplate,
        selectTemplate,
        createFromTemplate,
        validateAgainstTemplate,
        suggestTemplate,
        getRegionsForTemplate,
        getRequiredFields,
        isFieldRequired,
    };
};

/**
 * Hook for template-specific functionality
 */
export const useTemplateValidation = (config: S3Config | Partial<S3Config>) => {
    const { validateAgainstTemplate, suggestTemplate } = useConfigTemplates();

    const validation = useMemo(() => {
        if ('id' in config && config.id) {
            return validateAgainstTemplate(config as S3Config);
        }
        return { isValid: true, errors: [] };
    }, [config, validateAgainstTemplate]);

    const suggestedTemplate = useMemo(() => {
        return suggestTemplate(config);
    }, [config, suggestTemplate]);

    return {
        validation,
        suggestedTemplate,
        isValid: validation.isValid,
        errors: validation.errors,
    };
};

/**
 * Hook for managing template regions
 */
export const useTemplateRegions = (templateId?: string) => {
    const { getRegionsForTemplate } = useConfigTemplates();

    const regions = useMemo(() => {
        return templateId ? getRegionsForTemplate(templateId) : undefined;
    }, [templateId, getRegionsForTemplate]);

    const getRegionLabel = useCallback((regionValue: string) => {
        const region = regions?.find(r => r.value === regionValue);
        return region?.label || regionValue;
    }, [regions]);

    const isValidRegion = useCallback((regionValue: string) => {
        if (!regions) return true; // No restrictions
        return regions.some(r => r.value === regionValue);
    }, [regions]);

    return {
        regions: regions || [],
        hasRegions: Boolean(regions && regions.length > 0),
        getRegionLabel,
        isValidRegion,
    };
};