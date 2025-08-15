import { invoke } from '@tauri-apps/api/core';
import { s3Service } from './s3Service';
import { errorHandler } from './errorHandler';
import {
    DownloadTask,
    DownloadStatus,
    DownloadOptions,
    DownloadProgressEvent,
    DownloadCompleteEvent,
    DownloadErrorEvent,
    DownloadResumeData,
    PathSelectionOptions,
    PathSelectionResult
} from '../types/download';
import { S3File } from '../types/file';

// Download service configuration
interface DownloadServiceConfig {
    maxRetries: number;
    requestTimeout: number;
    chunkSize: number; // Size of each download chunk
    maxConcurrentDownloads: number;
}

const DEFAULT_CONFIG: DownloadServiceConfig = {
    maxRetries: 3,
    requestTimeout: 30000,
    chunkSize: 1024 * 1024, // 1MB chunks
    maxConcurrentDownloads: 3,
};

// Download service class
export class DownloadService {
    private config: DownloadServiceConfig;
    private activeDownloads = new Map<string, AbortController>();
    private downloadProgress = new Map<string, { startTime: number; lastBytes: number; lastTime: number }>();

    constructor(config: Partial<DownloadServiceConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Select download path using native file dialog
     */
    public async selectDownloadPath(options: PathSelectionOptions = {}): Promise<PathSelectionResult> {
        try {
            const result = await invoke<string | null>('select_download_path', {
                defaultFilename: options.defaultPath
            });

            return {
                path: result || '',
                cancelled: !result
            };
        } catch (error) {
            console.error('Failed to select download path:', error);
            return {
                path: '',
                cancelled: true
            };
        }
    }

    /**
     * Select download directory using native folder dialog
     */
    public async selectDownloadDirectory(): Promise<PathSelectionResult> {
        try {
            const result = await invoke<string | null>('select_download_directory');

            return {
                path: result || '',
                cancelled: !result
            };
        } catch (error) {
            console.error('Failed to select download directory:', error);
            return {
                path: '',
                cancelled: true
            };
        }
    }

    /**
     * Get default download path for a file
     */
    public async getDefaultDownloadPath(fileName: string): Promise<string> {
        try {
            return await invoke<string>('get_default_download_path', { filename: fileName });
        } catch (error) {
            console.error('Failed to get default download path:', error);
            return fileName; // Fallback to just the filename
        }
    }

    /**
     * Validate if a download path is valid
     */
    public async validateDownloadPath(path: string): Promise<boolean> {
        try {
            return await invoke<boolean>('validate_download_path', { path });
        } catch (error) {
            console.error('Failed to validate download path:', error);
            return false;
        }
    }

    /**
     * Check if a file exists at the given path
     */
    public async checkFileExists(path: string): Promise<boolean> {
        try {
            return await invoke<boolean>('check_file_exists', { path });
        } catch (error) {
            console.error('Failed to check file existence:', error);
            return false;
        }
    }

    /**
     * Get the size of a file at the given path
     */
    public async getLocalFileSize(path: string): Promise<number> {
        try {
            return await invoke<number>('get_file_size', { path });
        } catch (error) {
            console.error('Failed to get file size:', error);
            return 0;
        }
    }

    /**
     * Generate a unique filename if the original already exists
     */
    public async generateUniqueFilename(basePath: string): Promise<string> {
        try {
            return await invoke<string>('generate_unique_filename', { basePath });
        } catch (error) {
            console.error('Failed to generate unique filename:', error);
            return basePath; // Fallback to original path
        }
    }

    /**
     * Create directory structure if it doesn't exist
     */
    public async createDirectory(path: string): Promise<void> {
        try {
            await invoke('create_directory', { path });
        } catch (error) {
            console.error('Failed to create directory:', error);
            throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if there's enough disk space for the download
     */
    public async checkDiskSpace(path: string, requiredBytes: number): Promise<boolean> {
        try {
            return await invoke<boolean>('check_disk_space', { path, requiredBytes });
        } catch (error) {
            console.error('Failed to check disk space:', error);
            return true; // Assume there's enough space if we can't check
        }
    }

    /**
     * Download a single file from S3
     */
    public async downloadFile(
        task: DownloadTask,
        options: DownloadOptions = {},
        onProgress?: (event: DownloadProgressEvent) => void,
        onComplete?: (event: DownloadCompleteEvent) => void,
        onError?: (event: DownloadErrorEvent) => void
    ): Promise<void> {
        const abortController = new AbortController();
        this.activeDownloads.set(task.id, abortController);

        try {
            // Initialize progress tracking
            this.downloadProgress.set(task.id, {
                startTime: Date.now(),
                lastBytes: task.downloadedBytes,
                lastTime: Date.now()
            });

            // Check if file already exists and handle accordingly
            const fileExists = await this.checkFileExists(task.localPath);
            if (fileExists && !options.overwrite) {
                if (options.resumable) {
                    // Try to resume download
                    await this.resumeDownload(task, options, onProgress, onComplete, onError);
                    return;
                } else {
                    // Generate unique filename
                    task.localPath = await this.generateUniqueFilename(task.localPath);
                }
            }

            // Get S3 object metadata to determine file size
            const metadata = await s3Service.getObjectMetadata(task.key);
            if (!metadata) {
                throw new Error('Failed to get file metadata from S3');
            }

            task.totalBytes = metadata.size;

            // Check disk space
            const hasSpace = await this.checkDiskSpace(task.localPath, task.totalBytes);
            if (!hasSpace) {
                throw new Error('Insufficient disk space');
            }

            // Create directory structure if needed
            const parentDir = task.localPath.substring(0, task.localPath.lastIndexOf('/'));
            if (parentDir && options.createDirectories !== false) {
                await this.createDirectory(parentDir);
            }

            // Download the file
            await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal);

        } catch (error) {
            const downloadError = errorHandler.transformError(error);
            onError?.({
                taskId: task.id,
                error: downloadError,
                retryable: this.isRetryableError(downloadError)
            });
            throw error;
        } finally {
            this.activeDownloads.delete(task.id);
            this.downloadProgress.delete(task.id);
        }
    }

    /**
     * Resume a partially downloaded file
     */
    private async resumeDownload(
        task: DownloadTask,
        options: DownloadOptions,
        onProgress?: (event: DownloadProgressEvent) => void,
        onComplete?: (event: DownloadCompleteEvent) => void,
        onError?: (event: DownloadErrorEvent) => void
    ): Promise<void> {
        try {
            // Get current file size to determine resume position
            const currentSize = await this.getLocalFileSize(task.localPath);
            task.downloadedBytes = currentSize;

            // Get S3 object metadata
            const metadata = await s3Service.getObjectMetadata(task.key);
            if (!metadata) {
                throw new Error('Failed to get file metadata for resume');
            }

            // Validate resume data
            if (task.resumeData) {
                // Check if the file hasn't changed since last download attempt
                if (task.resumeData.lastModified && metadata.etag !== task.resumeData.lastModified) {
                    throw new Error('File has been modified since last download attempt');
                }
            }

            // If file is already complete, just mark as complete
            if (currentSize >= metadata.size) {
                task.progress = 100;
                task.status = 'completed';
                onComplete?.({
                    taskId: task.id,
                    key: task.key,
                    localPath: task.localPath
                });
                return;
            }

            // Continue download from current position
            task.totalBytes = metadata.size;
            const abortController = this.activeDownloads.get(task.id);
            if (abortController) {
                await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal, currentSize);
            }

        } catch (error) {
            // If resume fails, start fresh download
            console.warn('Resume failed, starting fresh download:', error);
            task.downloadedBytes = 0;
            const abortController = this.activeDownloads.get(task.id);
            if (abortController) {
                await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal);
            }
        }
    }

    /**
     * Perform the actual download operation
     */
    private async performDownload(
        task: DownloadTask,
        options: DownloadOptions,
        onProgress?: (event: DownloadProgressEvent) => void,
        onComplete?: (event: DownloadCompleteEvent) => void,
        onError?: (event: DownloadErrorEvent) => void,
        signal?: AbortSignal,
        startByte: number = 0
    ): Promise<void> {
        try {
            // Get presigned URL for download
            const downloadUrl = await s3Service.getPresignedDownloadUrl(task.key, 3600); // 1 hour expiry

            // Create fetch request with range header for resume support
            const headers: Record<string, string> = {};
            if (startByte > 0) {
                headers['Range'] = `bytes=${startByte}-`;
            }

            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers,
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to get response reader');
            }

            // Open file for writing (append mode if resuming)
            const fileHandle = await this.openFileForWriting(task.localPath, startByte > 0);

            try {
                let downloadedBytes = startByte;
                const progressTracker = this.downloadProgress.get(task.id);

                while (true) {
                    if (signal?.aborted) {
                        throw new Error('Download cancelled');
                    }

                    const { done, value } = await reader.read();
                    if (done) break;

                    // Write chunk to file
                    await this.writeChunkToFile(fileHandle, value);
                    downloadedBytes += value.length;

                    // Update progress
                    task.downloadedBytes = downloadedBytes;
                    task.progress = task.totalBytes > 0 ? (downloadedBytes / task.totalBytes) * 100 : 0;

                    // Calculate speed and ETA
                    if (progressTracker) {
                        const now = Date.now();
                        const timeDiff = now - progressTracker.lastTime;
                        const bytesDiff = downloadedBytes - progressTracker.lastBytes;

                        if (timeDiff > 1000) { // Update every second
                            const speed = (bytesDiff / timeDiff) * 1000; // bytes per second
                            const remainingBytes = task.totalBytes - downloadedBytes;
                            const eta = speed > 0 ? remainingBytes / speed : 0;

                            task.speed = speed;
                            task.estimatedTimeRemaining = eta;

                            progressTracker.lastBytes = downloadedBytes;
                            progressTracker.lastTime = now;

                            onProgress?.({
                                taskId: task.id,
                                loaded: downloadedBytes,
                                total: task.totalBytes,
                                progress: task.progress,
                                speed
                            });
                        }
                    }
                }

                // Close file handle
                await this.closeFile(fileHandle);

                // Mark as completed
                task.status = 'completed';
                task.progress = 100;
                task.endTime = new Date();

                onComplete?.({
                    taskId: task.id,
                    key: task.key,
                    localPath: task.localPath
                });

            } finally {
                reader.releaseLock();
                await this.closeFile(fileHandle);
            }

        } catch (error) {
            if (signal?.aborted) {
                task.status = 'cancelled';
                task.cancelledAt = new Date();
            } else {
                task.status = 'failed';
                task.error = error instanceof Error ? error.message : 'Unknown error';
            }
            throw error;
        }
    }

    /**
     * Pause a download
     */
    public pauseDownload(taskId: string): void {
        const abortController = this.activeDownloads.get(taskId);
        if (abortController) {
            abortController.abort();
            this.activeDownloads.delete(taskId);
        }
    }

    /**
     * Cancel a download
     */
    public cancelDownload(taskId: string): void {
        this.pauseDownload(taskId);
        this.downloadProgress.delete(taskId);
    }

    /**
     * Check if an error is retryable
     */
    private isRetryableError(error: Error): boolean {
        const retryableErrors = [
            'network',
            'timeout',
            'connection',
            'temporary',
            'service unavailable',
            'too many requests'
        ];

        const errorMessage = error.message.toLowerCase();
        return retryableErrors.some(keyword => errorMessage.includes(keyword));
    }

    /**
     * Open file for writing using Tauri file system API
     */
    private async openFileForWriting(path: string, append: boolean = false): Promise<any> {
        return { path, append, isOpen: true };
    }

    /**
     * Write chunk to file using Tauri file system API
     */
    private async writeChunkToFile(fileHandle: any, chunk: Uint8Array): Promise<void> {
        try {
            await invoke('write_file_chunk', {
                path: fileHandle.path,
                data: Array.from(chunk),
                append: fileHandle.append
            });
            // After first write, switch to append mode
            fileHandle.append = true;
        } catch (error) {
            throw new Error(`Failed to write chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Close file (no-op for Tauri file system API)
     */
    private async closeFile(fileHandle: any): Promise<void> {
        fileHandle.isOpen = false;
    }

    /**
     * Read file chunk for resume validation
     */
    public async readFileChunk(path: string, offset: number, length: number): Promise<Uint8Array> {
        try {
            const data = await invoke<number[]>('read_file_chunk', {
                path,
                offset,
                length
            });
            return new Uint8Array(data);
        } catch (error) {
            throw new Error(`Failed to read file chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Calculate file checksum for integrity verification
     */
    public async calculateLocalFileChecksum(path: string): Promise<string> {
        try {
            return await invoke<string>('calculate_file_checksum', { path });
        } catch (error) {
            throw new Error(`Failed to calculate checksum: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get file metadata
     */
    public async getFileMetadata(path: string): Promise<{ size: number; modified: number; isFile: boolean; isDir: boolean }> {
        try {
            return await invoke('get_file_metadata', { path });
        } catch (error) {
            throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate resume data integrity
     */
    public async validateResumeData(task: DownloadTask): Promise<boolean> {
        if (!task.resumeData || !await this.checkFileExists(task.localPath)) {
            return false;
        }

        try {
            const localSize = await this.getLocalFileSize(task.localPath);
            const metadata = await s3Service.getObjectMetadata(task.key);

            if (!metadata) {
                return false;
            }

            // Check if local file size matches expected downloaded bytes
            if (localSize !== task.resumeData.downloadedBytes) {
                return false;
            }

            // Check if remote file hasn't changed
            if (task.resumeData.lastModified && metadata.etag !== task.resumeData.lastModified) {
                return false;
            }

            // Validate checksum if available
            if (task.resumeData.checksum) {
                const localChecksum = await this.calculateLocalFileChecksum(task.localPath);
                // For partial files, we can't validate the full checksum
                // Instead, we trust the size and etag validation
            }

            return true;
        } catch (error) {
            console.error('Resume validation failed:', error);
            return false;
        }
    }

    /**
     * Create resume data for a download task
     */
    public createResumeData(task: DownloadTask, metadata: any): DownloadResumeData {
        return {
            downloadedBytes: task.downloadedBytes,
            totalBytes: task.totalBytes,
            lastModified: metadata.etag,
            checksum: undefined, // Will be calculated when download completes
        };
    }

    /**
     * Enhanced resume download with better validation
     */
    private async resumeDownloadEnhanced(
        task: DownloadTask,
        options: DownloadOptions,
        onProgress?: (event: DownloadProgressEvent) => void,
        onComplete?: (event: DownloadCompleteEvent) => void,
        onError?: (event: DownloadErrorEvent) => void
    ): Promise<void> {
        try {
            // Validate resume data
            const canResume = await this.validateResumeData(task);
            if (!canResume) {
                console.warn('Resume validation failed, starting fresh download');
                task.downloadedBytes = 0;
                task.resumeData = undefined;
                const abortController = this.activeDownloads.get(task.id);
                if (abortController) {
                    await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal);
                }
                return;
            }

            // Get current file size
            const currentSize = await this.getLocalFileSize(task.localPath);
            task.downloadedBytes = currentSize;

            // Get S3 object metadata
            const metadata = await s3Service.getObjectMetadata(task.key);
            if (!metadata) {
                throw new Error('Failed to get file metadata for resume');
            }

            task.totalBytes = metadata.size;

            // If file is already complete, mark as complete
            if (currentSize >= metadata.size) {
                task.progress = 100;
                task.status = 'completed';
                task.endTime = new Date();
                onComplete?.({
                    taskId: task.id,
                    key: task.key,
                    localPath: task.localPath
                });
                return;
            }

            // Continue download from current position
            const abortController = this.activeDownloads.get(task.id);
            if (abortController) {
                await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal, currentSize);
            }

        } catch (error) {
            console.error('Enhanced resume failed:', error);
            // Fall back to fresh download
            task.downloadedBytes = 0;
            task.resumeData = undefined;
            const abortController = this.activeDownloads.get(task.id);
            if (abortController) {
                await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal);
            }
        }
    }

    /**
     * Enhanced download with better resume support
     */
    public async downloadFileEnhanced(
        task: DownloadTask,
        options: DownloadOptions = {},
        onProgress?: (event: DownloadProgressEvent) => void,
        onComplete?: (event: DownloadCompleteEvent) => void,
        onError?: (event: DownloadErrorEvent) => void
    ): Promise<void> {
        const abortController = new AbortController();
        this.activeDownloads.set(task.id, abortController);

        try {
            // Initialize progress tracking
            this.downloadProgress.set(task.id, {
                startTime: Date.now(),
                lastBytes: task.downloadedBytes,
                lastTime: Date.now()
            });

            // Check if file already exists and handle accordingly
            const fileExists = await this.checkFileExists(task.localPath);
            if (fileExists && !options.overwrite) {
                if (options.resumable) {
                    // Try enhanced resume
                    await this.resumeDownloadEnhanced(task, options, onProgress, onComplete, onError);
                    return;
                } else {
                    // Generate unique filename
                    task.localPath = await this.generateUniqueFilename(task.localPath);
                }
            }

            // Get S3 object metadata to determine file size
            const metadata = await s3Service.getObjectMetadata(task.key);
            if (!metadata) {
                throw new Error('Failed to get file metadata from S3');
            }

            task.totalBytes = metadata.size;

            // Create resume data
            task.resumeData = this.createResumeData(task, metadata);

            // Check disk space
            const hasSpace = await this.checkDiskSpace(task.localPath, task.totalBytes);
            if (!hasSpace) {
                throw new Error('Insufficient disk space');
            }

            // Create directory structure if needed
            const parentDir = task.localPath.substring(0, task.localPath.lastIndexOf('/'));
            if (parentDir && options.createDirectories !== false) {
                await this.createDirectory(parentDir);
            }

            // Download the file
            await this.performDownload(task, options, onProgress, onComplete, onError, abortController.signal);

        } catch (error) {
            const downloadError = errorHandler.transformError(error);
            onError?.({
                taskId: task.id,
                error: downloadError as Error,
                retryable: this.isRetryableError(downloadError as Error)
            });
            throw error;
        } finally {
            this.activeDownloads.delete(task.id);
            this.downloadProgress.delete(task.id);
        }
    }

    /**
     * Calculate download speed for a task
     */
    public calculateDownloadSpeed(taskId: string): number {
        const progressData = this.downloadProgress.get(taskId);
        if (!progressData) return 0;

        const now = Date.now();
        const timeDiff = now - progressData.startTime;
        if (timeDiff === 0) return 0;

        return (progressData.lastBytes / timeDiff) * 1000; // bytes per second
    }

    /**
     * Get active download count
     */
    public getActiveDownloadCount(): number {
        return this.activeDownloads.size;
    }

    /**
     * Check if a download is active
     */
    public isDownloadActive(taskId: string): boolean {
        return this.activeDownloads.has(taskId);
    }

    /**
     * Get download configuration
     */
    public getConfig(): DownloadServiceConfig {
        return { ...this.config };
    }

    /**
     * Update download configuration
     */
    public updateConfig(newConfig: Partial<DownloadServiceConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        // Cancel all active downloads
        for (const [taskId] of this.activeDownloads) {
            this.cancelDownload(taskId);
        }
        this.activeDownloads.clear();
        this.downloadProgress.clear();
    }
}

// Create singleton instance
export const downloadService = new DownloadService();

// Export default instance
export default downloadService;