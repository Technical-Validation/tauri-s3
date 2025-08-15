// Download task status types
export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Download task interface
export interface DownloadTask {
    id: string;
    key: string;
    fileName: string;
    localPath: string;
    progress: number;
    status: DownloadStatus;
    error?: string;
    startTime?: Date;
    endTime?: Date;
    pausedAt?: Date;
    cancelledAt?: Date;
    downloadedBytes: number;
    totalBytes: number;
    speed?: number; // bytes per second
    estimatedTimeRemaining?: number; // seconds
    retryCount: number;
    maxRetries: number;
    resumeData?: DownloadResumeData; // Data needed for resuming downloads
    checksum?: string; // File checksum for integrity verification
}

// Download configuration options
export interface DownloadOptions {
    overwrite?: boolean;
    resumable?: boolean;
    maxConcurrentDownloads?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
    checksumValidation?: boolean;
    createDirectories?: boolean; // Create directory structure if it doesn't exist
}

// Resume data for downloads
export interface DownloadResumeData {
    downloadedBytes: number;
    totalBytes: number;
    lastModified?: string; // ETag or last modified date for validation
    checksum?: string; // File checksum for integrity verification
}

// Download queue management
export interface DownloadQueue {
    tasks: DownloadTask[];
    activeDownloads: number;
    maxConcurrentDownloads: number;
    totalProgress: number;
    overallSpeed: number;
}

// Download statistics
export interface DownloadStatistics {
    totalFiles: number;
    completedFiles: number;
    failedFiles: number;
    totalBytes: number;
    downloadedBytes: number;
    averageSpeed: number;
    totalTime: number;
}

// Download Store Interface
export interface DownloadStore {
    tasks: DownloadTask[];
    queue: DownloadQueue;
    statistics: DownloadStatistics;
    options: DownloadOptions;
    loading: boolean;
    error: string | null;

    // Task management
    addTask: (key: string, fileName: string, localPath: string, options?: Partial<DownloadOptions>) => string;
    addTasks: (items: Array<{ key: string; fileName: string; localPath: string }>, options?: Partial<DownloadOptions>) => string[];
    removeTask: (taskId: string) => void;
    removeTasks: (taskIds: string[]) => void;
    clearCompleted: () => void;
    clearFailed: () => void;
    clearAll: () => void;

    // Download control
    startDownload: (taskId: string) => Promise<void>;
    startAllDownloads: () => Promise<void>;
    pauseDownload: (taskId: string) => void;
    pauseAllDownloads: () => void;
    resumeDownload: (taskId: string) => Promise<void>;
    resumeAllDownloads: () => Promise<void>;
    cancelDownload: (taskId: string) => void;
    cancelAllDownloads: () => void;
    retryDownload: (taskId: string) => Promise<void>;
    retryFailedDownloads: () => Promise<void>;

    // Task queries
    getTask: (taskId: string) => DownloadTask | null;
    getTasksByStatus: (status: DownloadStatus) => DownloadTask[];
    getPendingTasks: () => DownloadTask[];
    getActiveTasks: () => DownloadTask[];
    getCompletedTasks: () => DownloadTask[];
    getFailedTasks: () => DownloadTask[];

    // Progress tracking
    updateTaskProgress: (taskId: string, progress: number, downloadedBytes: number) => void;
    updateTaskStatus: (taskId: string, status: DownloadStatus, error?: string) => void;
    calculateOverallProgress: () => number;
    calculateDownloadSpeed: (taskId: string) => number;

    // Configuration
    setOptions: (options: Partial<DownloadOptions>) => void;
    getOptions: () => DownloadOptions;

    // State management
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;

    // Statistics
    updateStatistics: () => void;
    resetStatistics: () => void;
}

// Download event types for progress tracking
export interface DownloadProgressEvent {
    taskId: string;
    loaded: number;
    total: number;
    progress: number;
    speed: number;
}

export interface DownloadCompleteEvent {
    taskId: string;
    key: string;
    localPath: string;
    checksum?: string;
}

export interface DownloadErrorEvent {
    taskId: string;
    error: Error;
    retryable: boolean;
}

// Path selection types
export interface PathSelectionOptions {
    defaultPath?: string;
    allowMultiple?: boolean;
    createDirectories?: boolean;
    filters?: Array<{
        name: string;
        extensions: string[];
    }>;
}

export interface PathSelectionResult {
    path: string;
    cancelled: boolean;
}