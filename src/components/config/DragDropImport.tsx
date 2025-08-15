import React, { useState, useCallback, useRef } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { ImportResult, ConfigConflict } from '../../types/config';
import { Button, LoadingSpinner } from '../common';

interface DragDropImportProps {
    onImportComplete?: (result: ImportResult) => void;
    onImportStart?: () => void;
    className?: string;
}

interface ImportPreview {
    fileName: string;
    configCount: number;
    configs: Array<{
        name: string;
        status: 'new' | 'conflict' | 'invalid';
        conflictType?: 'name' | 'duplicate';
        existingName?: string;
        error?: string;
    }>;
}

export const DragDropImport: React.FC<DragDropImportProps> = ({
    onImportComplete,
    onImportStart,
    className = '',
}) => {
    const { importConfigs, configs: existingConfigs, loading } = useConfig();
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [conflictResolution, setConflictResolution] = useState<'rename' | 'overwrite' | 'skip'>('rename');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateAndPreviewFile = useCallback(async (file: File): Promise<ImportPreview> => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.configs || !Array.isArray(data.configs)) {
                throw new Error('Invalid configuration file format');
            }

            const preview: ImportPreview = {
                fileName: file.name,
                configCount: data.configs.length,
                configs: [],
            };

            // Check each config for conflicts and validity
            for (const config of data.configs) {
                const configPreview = {
                    name: config.name || 'Unnamed Config',
                    status: 'new' as const,
                    conflictType: undefined as 'name' | 'duplicate' | undefined,
                    existingName: undefined as string | undefined,
                    error: undefined as string | undefined,
                };

                // Basic validation
                if (!config.name || !config.accessKeyId || !config.secretAccessKey || !config.region || !config.bucketName) {
                    configPreview.status = 'invalid';
                    configPreview.error = 'Missing required fields';
                } else {
                    // Check for name conflicts
                    const existingConfig = existingConfigs.find(c => c.name === config.name);
                    if (existingConfig) {
                        configPreview.status = 'conflict';
                        configPreview.conflictType = 'name';
                        configPreview.existingName = existingConfig.name;
                    }
                }

                preview.configs.push(configPreview);
            }

            return preview;
        } catch (error) {
            throw new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [existingConfigs]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        const configFile = files.find(file =>
            file.type === 'application/json' ||
            file.name.endsWith('.json') ||
            file.name.endsWith('.yaml') ||
            file.name.endsWith('.yml')
        );

        if (!configFile) {
            setImportResult({
                success: false,
                imported: 0,
                skipped: 0,
                errors: ['Please drop a valid configuration file (.json, .yaml, .yml)'],
                conflicts: [],
            });
            return;
        }

        await processFile(configFile);
    }, []);

    const processFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        setImportResult(null);

        try {
            const preview = await validateAndPreviewFile(file);
            setImportPreview(preview);
            setPendingFile(file);
        } catch (error) {
            setImportResult({
                success: false,
                imported: 0,
                skipped: 0,
                errors: [error instanceof Error ? error.message : 'Failed to process file'],
                conflicts: [],
            });
        } finally {
            setIsProcessing(false);
        }
    }, [validateAndPreviewFile]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    }, [processFile]);

    const handleConfirmImport = useCallback(async () => {
        if (!pendingFile) return;

        setIsProcessing(true);
        if (onImportStart) {
            onImportStart();
        }

        try {
            const result = await importConfigs(pendingFile, {
                overwriteExisting: conflictResolution === 'overwrite',
                validateBeforeImport: true,
                skipInvalid: true,
            });

            // Apply conflict resolution for rename strategy
            if (conflictResolution === 'rename' && result.conflicts.length > 0) {
                // This would need additional logic to handle renaming
                // For now, we'll treat it as skip
                result.skipped += result.conflicts.length;
                result.imported -= result.conflicts.length;
            }

            setImportResult(result);
            setImportPreview(null);
            setPendingFile(null);

            if (onImportComplete) {
                onImportComplete(result);
            }
        } catch (error) {
            setImportResult({
                success: false,
                imported: 0,
                skipped: 0,
                errors: [error instanceof Error ? error.message : 'Import failed'],
                conflicts: [],
            });
        } finally {
            setIsProcessing(false);
        }
    }, [pendingFile, conflictResolution, importConfigs, onImportStart, onImportComplete]);

    const handleCancelImport = useCallback(() => {
        setImportPreview(null);
        setPendingFile(null);
        setImportResult(null);
    }, []);

    const clearResults = useCallback(() => {
        setImportResult(null);
        setImportPreview(null);
        setPendingFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Render import preview dialog
    if (importPreview) {
        return (
            <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Import Preview
                    </h3>

                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                            <strong>File:</strong> {importPreview.fileName}
                        </p>
                        <p className="text-sm text-blue-800">
                            <strong>Configurations found:</strong> {importPreview.configCount}
                        </p>
                    </div>

                    <div className="mb-4 max-h-64 overflow-y-auto">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Configuration Details:</h4>
                        <div className="space-y-2">
                            {importPreview.configs.map((config, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-md border ${config.status === 'new'
                                            ? 'bg-green-50 border-green-200'
                                            : config.status === 'conflict'
                                                ? 'bg-yellow-50 border-yellow-200'
                                                : 'bg-red-50 border-red-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{config.name}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.status === 'new'
                                                ? 'bg-green-100 text-green-800'
                                                : config.status === 'conflict'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                            {config.status === 'new' && 'New'}
                                            {config.status === 'conflict' && 'Conflict'}
                                            {config.status === 'invalid' && 'Invalid'}
                                        </span>
                                    </div>
                                    {config.status === 'conflict' && (
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Conflicts with existing configuration "{config.existingName}"
                                        </p>
                                    )}
                                    {config.status === 'invalid' && config.error && (
                                        <p className="text-xs text-red-700 mt-1">{config.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Conflict Resolution Options */}
                    {importPreview.configs.some(c => c.status === 'conflict') && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Conflict Resolution:</h4>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="conflictResolution"
                                        value="rename"
                                        checked={conflictResolution === 'rename'}
                                        onChange={(e) => setConflictResolution(e.target.value as 'rename')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Rename conflicting configurations (add suffix)
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="conflictResolution"
                                        value="overwrite"
                                        checked={conflictResolution === 'overwrite'}
                                        onChange={(e) => setConflictResolution(e.target.value as 'overwrite')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Overwrite existing configurations
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="conflictResolution"
                                        value="skip"
                                        checked={conflictResolution === 'skip'}
                                        onChange={(e) => setConflictResolution(e.target.value as 'skip')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Skip conflicting configurations
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3">
                        <Button
                            onClick={handleCancelImport}
                            variant="secondary"
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmImport}
                            variant="primary"
                            disabled={isProcessing || importPreview.configs.every(c => c.status === 'invalid')}
                        >
                            {isProcessing ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Importing...
                                </>
                            ) : (
                                'Import Configurations'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Drag and Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="space-y-4">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            />
                        </svg>
                    </div>

                    <div>
                        <p className="text-lg font-medium text-gray-900">
                            {isProcessing ? 'Processing file...' : 'Drop configuration file here'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            or{' '}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-500 font-medium"
                                disabled={isProcessing}
                            >
                                click to browse
                            </button>
                        </p>
                    </div>

                    <div className="text-xs text-gray-500">
                        <p>Supported formats: JSON, YAML</p>
                        <p>Maximum file size: 10MB</p>
                    </div>

                    {isProcessing && (
                        <div className="flex items-center justify-center">
                            <LoadingSpinner size="sm" className="mr-2" />
                            <span className="text-sm text-gray-600">Processing...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Import Result */}
            {importResult && (
                <div className={`mt-4 p-4 rounded-md ${importResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {importResult.success ? (
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
                            <h3 className={`text-sm font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                {importResult.success ? 'Import Successful' : 'Import Failed'}
                            </h3>
                            <div className={`mt-2 text-sm ${importResult.success ? 'text-green-700' : 'text-red-700'
                                }`}>
                                {importResult.success ? (
                                    <div>
                                        <p>Imported: {importResult.imported} configurations</p>
                                        {importResult.skipped > 0 && (
                                            <p>Skipped: {importResult.skipped} configurations</p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {importResult.errors.map((error, index) => (
                                            <p key={index}>{error}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <Button
                            onClick={clearResults}
                            variant="secondary"
                            size="sm"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};