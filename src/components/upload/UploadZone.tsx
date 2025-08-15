import React, { useCallback, useState, useRef } from 'react';
import { Button } from '../common/Button';
import { useUploadStore } from '../../stores/uploadStore';
import { FileValidationResult, FileValidationRule } from '../../types/upload';

export interface UploadZoneProps {
    basePath?: string;
    accept?: string;
    maxFileSize?: number; // in bytes
    maxFiles?: number;
    multiple?: boolean;
    disabled?: boolean;
    validationRules?: FileValidationRule[];
    onFilesSelected?: (files: File[]) => void;
    onValidationError?: (errors: string[]) => void;
    className?: string;
}

interface FilePreview {
    file: File;
    id: string;
    isValid: boolean;
    errors: string[];
    preview?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
    basePath = '',
    accept,
    maxFileSize = 100 * 1024 * 1024, // 100MB default
    maxFiles = 10,
    multiple = true,
    disabled = false,
    validationRules = [],
    onFilesSelected,
    onValidationError,
    className = ''
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);

    const { addTasks } = useUploadStore();

    // Default validation rules
    const defaultValidationRules: FileValidationRule[] = [
        {
            type: 'size',
            value: maxFileSize,
            message: `File size must be less than ${formatFileSize(maxFileSize)}`
        },
        ...(accept ? [{
            type: 'type' as const,
            value: accept.split(',').map(type => type.trim()),
            message: `File type must be one of: ${accept}`
        }] : []),
        ...validationRules
    ];

    // File validation function
    const validateFile = useCallback((file: File): FileValidationResult => {
        const errors: string[] = [];

        for (const rule of defaultValidationRules) {
            switch (rule.type) {
                case 'size':
                    if (file.size > rule.value) {
                        errors.push(rule.message);
                    }
                    break;
                case 'type':
                    const allowedTypes = Array.isArray(rule.value) ? rule.value : [rule.value];
                    const fileType = file.type;
                    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

                    const isTypeAllowed = allowedTypes.some(type => {
                        if (type.startsWith('.')) {
                            return fileExtension === type.toLowerCase();
                        }
                        return fileType.match(new RegExp(type.replace('*', '.*')));
                    });

                    if (!isTypeAllowed) {
                        errors.push(rule.message);
                    }
                    break;
                case 'name':
                    if (!file.name.match(new RegExp(rule.value))) {
                        errors.push(rule.message);
                    }
                    break;
                case 'custom':
                    if (typeof rule.value === 'function' && !rule.value(file)) {
                        errors.push(rule.message);
                    }
                    break;
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }, [defaultValidationRules]);

    // Create file preview
    const createFilePreview = useCallback(async (file: File): Promise<FilePreview> => {
        const validation = validateFile(file);
        const id = `${file.name}_${file.size}_${Date.now()}`;

        let preview: string | undefined;

        // Create preview for images
        if (file.type.startsWith('image/')) {
            try {
                preview = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } catch (error) {
                console.warn('Failed to create image preview:', error);
            }
        }

        return {
            file,
            id,
            isValid: validation.isValid,
            errors: validation.errors,
            preview
        };
    }, [validateFile]);

    // Process selected files
    const processFiles = useCallback(async (files: FileList | File[]) => {
        if (disabled || isProcessing) return;

        setIsProcessing(true);
        const fileArray = Array.from(files);

        // Limit number of files
        const limitedFiles = multiple ? fileArray.slice(0, maxFiles) : fileArray.slice(0, 1);

        try {
            // Create previews for all files
            const previews = await Promise.all(
                limitedFiles.map(file => createFilePreview(file))
            );

            setFilePreviews(previews);

            // Separate valid and invalid files
            const validFiles = previews.filter(p => p.isValid).map(p => p.file);
            const invalidFiles = previews.filter(p => !p.isValid);

            // Report validation errors
            if (invalidFiles.length > 0) {
                const allErrors = invalidFiles.flatMap(f => f.errors);
                onValidationError?.(allErrors);
            }

            // Notify parent component
            onFilesSelected?.(validFiles);

        } catch (error) {
            console.error('Error processing files:', error);
            onValidationError?.(['Failed to process selected files']);
        } finally {
            setIsProcessing(false);
        }
    }, [disabled, isProcessing, multiple, maxFiles, createFilePreview, onFilesSelected, onValidationError]);

    // Drag event handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current++;

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragActive(true);
            setIsDragOver(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current--;

        if (dragCounterRef.current === 0) {
            setIsDragActive(false);
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        }
    }, [disabled]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDragActive(false);
        setIsDragOver(false);
        dragCounterRef.current = 0;

        if (disabled) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFiles(files);
        }
    }, [disabled, processFiles]);

    // File input change handler
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFiles(files);
        }

        // Reset input value to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [processFiles]);

    // Open file dialog
    const openFileDialog = useCallback(() => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, [disabled]);

    // Remove file from preview
    const removeFile = useCallback((fileId: string) => {
        setFilePreviews(prev => prev.filter(f => f.id !== fileId));
    }, []);

    // Upload selected files
    const uploadFiles = useCallback(() => {
        const validFiles = filePreviews.filter(p => p.isValid).map(p => p.file);
        if (validFiles.length > 0) {
            addTasks(validFiles, basePath);
            setFilePreviews([]); // Clear previews after adding to upload queue
        }
    }, [filePreviews, addTasks, basePath]);

    // Clear all files
    const clearFiles = useCallback(() => {
        setFilePreviews([]);
    }, []);

    const hasValidFiles = filePreviews.some(f => f.isValid);
    const hasInvalidFiles = filePreviews.some(f => !f.isValid);

    return (
        <div className={`upload-zone ${className}`}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple={multiple}
                accept={accept}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
            />

            {/* Drop zone */}
            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                    ${isDragOver && !disabled
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={openFileDialog}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600">Processing files...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col items-center">
                            <svg
                                className={`w-12 h-12 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>

                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {isDragOver ? 'Drop files here' : 'Upload files'}
                            </h3>

                            <p className="text-gray-600 mb-4">
                                Drag and drop files here, or{' '}
                                <span className="text-blue-600 font-medium">browse</span>
                            </p>

                            <div className="text-sm text-gray-500 space-y-1">
                                {accept && (
                                    <p>Accepted types: {accept}</p>
                                )}
                                <p>Max file size: {formatFileSize(maxFileSize)}</p>
                                <p>Max files: {multiple ? maxFiles : 1}</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* File previews */}
            {filePreviews.length > 0 && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">
                            Selected Files ({filePreviews.length})
                        </h4>
                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFiles}
                            >
                                Clear All
                            </Button>
                            {hasValidFiles && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={uploadFiles}
                                >
                                    Upload Files
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filePreviews.map((filePreview) => (
                            <FilePreviewItem
                                key={filePreview.id}
                                filePreview={filePreview}
                                onRemove={() => removeFile(filePreview.id)}
                            />
                        ))}
                    </div>

                    {hasInvalidFiles && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex">
                                <svg
                                    className="w-5 h-5 text-red-400 mr-2 mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <div>
                                    <h5 className="text-sm font-medium text-red-800">
                                        Some files cannot be uploaded
                                    </h5>
                                    <p className="text-sm text-red-700 mt-1">
                                        Please fix the issues or remove invalid files before uploading.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// File preview item component
interface FilePreviewItemProps {
    filePreview: FilePreview;
    onRemove: () => void;
}

const FilePreviewItem: React.FC<FilePreviewItemProps> = ({ filePreview, onRemove }) => {
    const { file, isValid, errors, preview } = filePreview;

    return (
        <div className={`
            flex items-center p-4 border rounded-lg
            ${isValid ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}
        `}>
            {/* File preview/icon */}
            <div className="flex-shrink-0 mr-4">
                {preview ? (
                    <img
                        src={preview}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                    />
                ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                    </p>
                    {isValid ? (
                        <svg
                            className="w-4 h-4 text-green-500 ml-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-4 h-4 text-red-500 ml-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    )}
                </div>

                <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                </p>

                {!isValid && errors.length > 0 && (
                    <div className="mt-2">
                        {errors.map((error, index) => (
                            <p key={index} className="text-sm text-red-600">
                                • {error}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Remove button */}
            <button
                onClick={onRemove}
                className="flex-shrink-0 ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Remove file"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
    );
};

// Utility function to format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}