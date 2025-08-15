import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadTask, DownloadOptions } from '../../types/download';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}));

// Mock S3 service
vi.mock('../s3Service', () => ({
    s3Service: {
        getObjectMetadata: vi.fn(),
        getPresignedDownloadUrl: vi.fn(),
    }
}));

// Mock error handler
vi.mock('../errorHandler', () => ({
    errorHandler: {
        transformError: vi.fn((error) => error),
    }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DownloadService', () => {
    let downloadService: any;
    let mockInvoke: any;
    let mockS3Service: any;
    let mockErrorHandler: any;

    beforeEach(async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        const { s3Service } = await import('../s3Service');
        const { errorHandler } = await import('../errorHandler');
        const { DownloadService } = await import('../downloadService');

        mockInvoke = invoke as any;
        mockS3Service = s3Service as any;
        mockErrorHandler = errorHandler as any;
        downloadService = new DownloadService();

        vi.clearAllMocks();
    });

    afterEach(() => {
        downloadService.destroy();
    });

    describe('selectDownloadPath', () => {
        it('should return selected path when user selects a path', async () => {
            const expectedPath = '/home/user/downloads/test.txt';
            mockInvoke.mockResolvedValue(expectedPath);

            const result = await downloadService.selectDownloadPath({
                defaultPath: 'test.txt'
            });

            expect(result).toEqual({
                path: expectedPath,
                cancelled: false
            });
            expect(mockInvoke).toHaveBeenCalledWith('select_download_path', {
                defaultFilename: 'test.txt'
            });
        });

        it('should return cancelled when user cancels selection', async () => {
            mockInvoke.mockResolvedValue(null);

            const result = await downloadService.selectDownloadPath();

            expect(result).toEqual({
                path: '',
                cancelled: true
            });
        });

        it('should handle errors gracefully', async () => {
            mockInvoke.mockRejectedValue(new Error('Dialog error'));

            const result = await downloadService.selectDownloadPath();

            expect(result).toEqual({
                path: '',
                cancelled: true
            });
        });
    });

    describe('selectDownloadDirectory', () => {
        it('should return selected directory path', async () => {
            const expectedPath = '/home/user/downloads';
            mockInvoke.mockResolvedValue(expectedPath);

            const result = await downloadService.selectDownloadDirectory();

            expect(result).toEqual({
                path: expectedPath,
                cancelled: false
            });
            expect(mockInvoke).toHaveBeenCalledWith('select_download_directory');
        });

        it('should return cancelled when user cancels', async () => {
            mockInvoke.mockResolvedValue(null);

            const result = await downloadService.selectDownloadDirectory();

            expect(result).toEqual({
                path: '',
                cancelled: true
            });
        });
    });

    describe('getDefaultDownloadPath', () => {
        it('should return default download path for filename', async () => {
            const fileName = 'test.txt';
            const expectedPath = '/home/user/downloads/test.txt';
            mockInvoke.mockResolvedValue(expectedPath);

            const result = await downloadService.getDefaultDownloadPath(fileName);

            expect(result).toBe(expectedPath);
            expect(mockInvoke).toHaveBeenCalledWith('get_default_download_path', {
                filename: fileName
            });
        });

        it('should fallback to filename on error', async () => {
            const fileName = 'test.txt';
            mockInvoke.mockRejectedValue(new Error('Path error'));

            const result = await downloadService.getDefaultDownloadPath(fileName);

            expect(result).toBe(fileName);
        });
    });

    describe('validateDownloadPath', () => {
        it('should return true for valid path', async () => {
            mockInvoke.mockResolvedValue(true);

            const result = await downloadService.validateDownloadPath('/valid/path');

            expect(result).toBe(true);
            expect(mockInvoke).toHaveBeenCalledWith('validate_download_path', {
                path: '/valid/path'
            });
        });

        it('should return false for invalid path', async () => {
            mockInvoke.mockResolvedValue(false);

            const result = await downloadService.validateDownloadPath('/invalid/path');

            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            mockInvoke.mockRejectedValue(new Error('Validation error'));

            const result = await downloadService.validateDownloadPath('/path');

            expect(result).toBe(false);
        });
    });

    describe('checkFileExists', () => {
        it('should return true when file exists', async () => {
            mockInvoke.mockResolvedValue(true);

            const result = await downloadService.checkFileExists('/existing/file.txt');

            expect(result).toBe(true);
            expect(mockInvoke).toHaveBeenCalledWith('check_file_exists', {
                path: '/existing/file.txt'
            });
        });

        it('should return false when file does not exist', async () => {
            mockInvoke.mockResolvedValue(false);

            const result = await downloadService.checkFileExists('/nonexistent/file.txt');

            expect(result).toBe(false);
        });
    });

    describe('getLocalFileSize', () => {
        it('should return file size', async () => {
            const expectedSize = 1024;
            mockInvoke.mockResolvedValue(expectedSize);

            const result = await downloadService.getLocalFileSize('/file.txt');

            expect(result).toBe(expectedSize);
            expect(mockInvoke).toHaveBeenCalledWith('get_file_size', {
                path: '/file.txt'
            });
        });

        it('should return 0 on error', async () => {
            mockInvoke.mockRejectedValue(new Error('File not found'));

            const result = await downloadService.getLocalFileSize('/file.txt');

            expect(result).toBe(0);
        });
    });

    describe('generateUniqueFilename', () => {
        it('should return unique filename', async () => {
            const basePath = '/downloads/file.txt';
            const uniquePath = '/downloads/file (1).txt';
            mockInvoke.mockResolvedValue(uniquePath);

            const result = await downloadService.generateUniqueFilename(basePath);

            expect(result).toBe(uniquePath);
            expect(mockInvoke).toHaveBeenCalledWith('generate_unique_filename', {
                basePath
            });
        });

        it('should fallback to original path on error', async () => {
            const basePath = '/downloads/file.txt';
            mockInvoke.mockRejectedValue(new Error('Generation error'));

            const result = await downloadService.generateUniqueFilename(basePath);

            expect(result).toBe(basePath);
        });
    });

    describe('createDirectory', () => {
        it('should create directory successfully', async () => {
            mockInvoke.mockResolvedValue(undefined);

            await expect(downloadService.createDirectory('/new/directory')).resolves.toBeUndefined();
            expect(mockInvoke).toHaveBeenCalledWith('create_directory', {
                path: '/new/directory'
            });
        });

        it('should throw error when directory creation fails', async () => {
            mockInvoke.mockRejectedValue(new Error('Permission denied'));

            await expect(downloadService.createDirectory('/restricted/directory'))
                .rejects.toThrow('Failed to create directory: Permission denied');
        });
    });

    describe('checkDiskSpace', () => {
        it('should return true when enough space available', async () => {
            mockInvoke.mockResolvedValue(true);

            const result = await downloadService.checkDiskSpace('/path', 1024);

            expect(result).toBe(true);
            expect(mockInvoke).toHaveBeenCalledWith('check_disk_space', {
                path: '/path',
                requiredBytes: 1024
            });
        });

        it('should return false when insufficient space', async () => {
            mockInvoke.mockResolvedValue(false);

            const result = await downloadService.checkDiskSpace('/path', 1024 * 1024 * 1024);

            expect(result).toBe(false);
        });

        it('should assume enough space on error', async () => {
            mockInvoke.mockRejectedValue(new Error('Disk check error'));

            const result = await downloadService.checkDiskSpace('/path', 1024);

            expect(result).toBe(true);
        });
    });

    describe('downloadFile', () => {
        let mockTask: DownloadTask;
        let mockOptions: DownloadOptions;

        beforeEach(() => {
            mockTask = {
                id: 'test-task-1',
                key: 'test/file.txt',
                fileName: 'file.txt',
                localPath: '/downloads/file.txt',
                progress: 0,
                status: 'pending',
                downloadedBytes: 0,
                totalBytes: 0,
                retryCount: 0,
                maxRetries: 3,
            };

            mockOptions = {
                overwrite: false,
                resumable: true,
                maxRetries: 3,
                createDirectories: true,
            };
        });

        it('should download file successfully', async () => {
            // Mock S3 metadata
            mockS3Service.getObjectMetadata.mockResolvedValue({
                key: 'test/file.txt',
                name: 'file.txt',
                size: 1024,
                lastModified: new Date(),
                etag: 'test-etag',
                isDirectory: false,
            });

            // Mock presigned URL
            mockS3Service.getPresignedDownloadUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

            // Mock file operations
            mockInvoke.mockImplementation((command) => {
                switch (command) {
                    case 'check_file_exists':
                        return Promise.resolve(false);
                    case 'check_disk_space':
                        return Promise.resolve(true);
                    case 'create_directory':
                        return Promise.resolve();
                    default:
                        return Promise.resolve();
                }
            });

            // Mock fetch response
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({ done: false, value: new Uint8Array(512) })
                    .mockResolvedValueOnce({ done: false, value: new Uint8Array(512) })
                    .mockResolvedValueOnce({ done: true }),
                releaseLock: vi.fn(),
            };

            mockFetch.mockResolvedValue({
                ok: true,
                body: {
                    getReader: () => mockReader,
                },
            });

            const onProgress = vi.fn();
            const onComplete = vi.fn();
            const onError = vi.fn();

            await downloadService.downloadFile(mockTask, mockOptions, onProgress, onComplete, onError);

            expect(mockS3Service.getObjectMetadata).toHaveBeenCalledWith('test/file.txt');
            expect(mockS3Service.getPresignedDownloadUrl).toHaveBeenCalledWith('test/file.txt', 3600);
            expect(mockFetch).toHaveBeenCalledWith('https://s3.amazonaws.com/signed-url', {
                method: 'GET',
                headers: {},
                signal: expect.any(AbortSignal),
            });
            expect(onComplete).toHaveBeenCalledWith({
                taskId: 'test-task-1',
                key: 'test/file.txt',
                localPath: '/downloads/file.txt',
            });
        });

        it('should handle download errors', async () => {
            mockS3Service.getObjectMetadata.mockRejectedValue(new Error('S3 error'));

            const onProgress = vi.fn();
            const onComplete = vi.fn();
            const onError = vi.fn();

            await expect(
                downloadService.downloadFile(mockTask, mockOptions, onProgress, onComplete, onError)
            ).rejects.toThrow('S3 error');

            expect(onError).toHaveBeenCalledWith({
                taskId: 'test-task-1',
                error: expect.any(Error),
                retryable: expect.any(Boolean),
            });
        });
    });

    describe('pauseDownload', () => {
        it('should pause active download', () => {
            const taskId = 'test-task-1';

            // Simulate active download
            downloadService['activeDownloads'].set(taskId, new AbortController());

            downloadService.pauseDownload(taskId);

            expect(downloadService.isDownloadActive(taskId)).toBe(false);
        });
    });

    describe('cancelDownload', () => {
        it('should cancel active download', () => {
            const taskId = 'test-task-1';

            // Simulate active download with progress tracking
            downloadService['activeDownloads'].set(taskId, new AbortController());
            downloadService['downloadProgress'].set(taskId, {
                startTime: Date.now(),
                lastBytes: 0,
                lastTime: Date.now(),
            });

            downloadService.cancelDownload(taskId);

            expect(downloadService.isDownloadActive(taskId)).toBe(false);
            expect(downloadService['downloadProgress'].has(taskId)).toBe(false);
        });
    });

    describe('getActiveDownloadCount', () => {
        it('should return correct active download count', () => {
            expect(downloadService.getActiveDownloadCount()).toBe(0);

            downloadService['activeDownloads'].set('task1', new AbortController());
            downloadService['activeDownloads'].set('task2', new AbortController());

            expect(downloadService.getActiveDownloadCount()).toBe(2);
        });
    });

    describe('isDownloadActive', () => {
        it('should return true for active download', () => {
            const taskId = 'test-task-1';
            downloadService['activeDownloads'].set(taskId, new AbortController());

            expect(downloadService.isDownloadActive(taskId)).toBe(true);
        });

        it('should return false for inactive download', () => {
            expect(downloadService.isDownloadActive('non-existent')).toBe(false);
        });
    });

    describe('configuration', () => {
        it('should return current configuration', () => {
            const config = downloadService.getConfig();

            expect(config).toEqual({
                maxRetries: 3,
                requestTimeout: 30000,
                chunkSize: 1024 * 1024,
                maxConcurrentDownloads: 3,
            });
        });

        it('should update configuration', () => {
            downloadService.updateConfig({
                maxRetries: 5,
                maxConcurrentDownloads: 5,
            });

            const config = downloadService.getConfig();

            expect(config.maxRetries).toBe(5);
            expect(config.maxConcurrentDownloads).toBe(5);
            expect(config.requestTimeout).toBe(30000); // Should keep existing values
        });
    });

    describe('destroy', () => {
        it('should cleanup all resources', () => {
            // Add some active downloads
            downloadService['activeDownloads'].set('task1', new AbortController());
            downloadService['activeDownloads'].set('task2', new AbortController());
            downloadService['downloadProgress'].set('task1', {
                startTime: Date.now(),
                lastBytes: 0,
                lastTime: Date.now(),
            });

            downloadService.destroy();

            expect(downloadService.getActiveDownloadCount()).toBe(0);
            expect(downloadService['downloadProgress'].size).toBe(0);
        });
    });
});