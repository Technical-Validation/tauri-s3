// Upload task status types
export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Upload task interface
export interface UploadTask {
    id: string;
    file: File;
    key: string;
    progress: number;
    status: UploadStatus;
    error?: string;
    startTime?: Date;
    endTime?: Date;
    pausedAt?: Date;
    cancelledAt?: Date;
    uploadedBytes: number;
    totalBytes: number;
    speed?: number; // bytes per second
    estimatedTimeRemaining?: number; // seconds
    retryCount: number;
    maxRetries: number;
    multipartUploadId?: string; // For resumable multipart uploads
    uploadedParts?: Array<{ partNumber: number; etag: string; size: number }>; // For multipart uploads
    isMultipart?: boolean; // Whether this upload uses multipart
    resumeData?: MultipartResumeData; // Data needed for resuming multipart uploads
}

// Upload configuration options
export interface UploadOptions {
    overwrite?: boolean;
    resumable?: boolean;
    chunkSize?: number; // for multipart uploads
    maxConcurrentUploads?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
    metadata?: Record<string, string>;
    contentType?: string;
    storageClass?: string;
}

// Multipart upload specific types
export interface MultipartUploadPart {
    partNumber: number;
    etag: string;
    size: number;
}

export interface MultipartUploadInfo {
    uploadId: string;
    key: string;
    parts: MultipartUploadPart[];
    totalParts: number;
    completedParts: number;
}

// Resume data for multipart uploads
export interface MultipartResumeData {
    uploadId: string;
    partSize: number;
    totalParts: number;
    completedParts: Array<{ partNumber: number; etag: string; size: number }>;
    lastPartNumber: number;
    checksum?: string; // File checksum for integrity verification
}

// Multipart upload configuration
export interface MultipartUploadConfig {
    partSize: number;
    maxConcurrentParts: number;
    enableResume: boolean;
    checksumValidation: boolean;
    retryFailedParts: boolean;
    maxPartRetries: number;
}

// Upload queue management
export interface UploadQueue {
    tasks: UploadTask[];
    activeUploads: number;
    maxConcurrentUploads: number;
    totalProgress: number;
    overallSpeed: number;
}

// Upload statistics
export interface UploadStatistics {
    totalFiles: number;
    completedFiles: number;
    failedFiles: number;
    totalBytes: number;
    uploadedBytes: number;
    averageSpeed: number;
    totalTime: number;
}

// Upload Store Interface
export interface UploadStore {
    tasks: UploadTask[];
    queue: UploadQueue;
    statistics: UploadStatistics;
    options: UploadOptions;
    multipartConfig: MultipartUploadConfig;
    loading: boolean;
    error: string | null;

    // Task management
    addTask: (file: File, key: string, options?: Partial<UploadOptions>) => string;
    addTasks: (files: FileList | File[], basePath?: string, options?: Partial<UploadOptions>) => string[];
    removeTask: (taskId: string) => void;
    removeTasks: (taskIds: string[]) => void;
    clearCompleted: () => void;
    clearFailed: () => void;
    clearAll: () => void;

    // Upload control
    startUpload: (taskId: string) => Promise<void>;
    startAllUploads: () => Promise<void>;
    pauseUpload: (taskId: string) => void;
    pauseAllUploads: () => void;
    resumeUpload: (taskId: string) => Promise<void>;
    resumeAllUploads: () => Promise<void>;
    cancelUpload: (taskId: string) => void;
    cancelAllUploads: () => void;
    retryUpload: (taskId: string) => Promise<void>;
    retryFailedUploads: () => Promise<void>;

    // Task queries
    getTask: (taskId: string) => UploadTask | null;
    getTasksByStatus: (status: UploadStatus) => UploadTask[];
    getPendingTasks: () => UploadTask[];
    getActiveTasks: () => UploadTask[];
    getCompletedTasks: () => UploadTask[];
    getFailedTasks: () => UploadTask[];

    // Progress tracking
    updateTaskProgress: (taskId: string, progress: number, uploadedBytes: number) => void;
    updateTaskStatus: (taskId: string, status: UploadStatus, error?: string) => void;
    calculateOverallProgress: () => number;
    calculateUploadSpeed: (taskId: string) => number;

    // Configuration
    setOptions: (options: Partial<UploadOptions>) => void;
    getOptions: () => UploadOptions;
    setMultipartConfig: (config: Partial<MultipartUploadConfig>) => void;
    getMultipartConfig: () => MultipartUploadConfig;

    // Enhanced multipart upload control
    pauseMultipartUpload: (taskId: string) => Promise<void>;

    // State management
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;

    // Statistics
    updateStatistics: () => void;
    resetStatistics: () => void;
}

// Upload event types for progress tracking
export interface UploadProgressEvent {
    taskId: string;
    loaded: number;
    total: number;
    progress: number;
    speed: number;
}

export interface UploadCompleteEvent {
    taskId: string;
    key: string;
    etag: string;
    location: string;
}

export interface UploadErrorEvent {
    taskId: string;
    error: Error;
    retryable: boolean;
}

// Drag and drop types
export interface DropZoneState {
    isDragOver: boolean;
    isDragActive: boolean;
    draggedFiles: File[];
    validFiles: File[];
    invalidFiles: File[];
}

// File validation
export interface FileValidationRule {
    type: 'size' | 'type' | 'name' | 'custom';
    value: any;
    message: string;
}

export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}