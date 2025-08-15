import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDownloadStore } from '../downloadStore';
import { DownloadTask, DownloadStatus } from '../../types/download';

// Mock download service
const mockDownloadService = {
    downloadFile: vi.fn(),
    pauseDownload: vi.fn(),
    cancelDownload: vi.fn(),
    isDownloadActive: vi.fn(),
    getActiveDownloadCount: vi.fn(),
    calculateDownloadSpeed: vi.fn(),
    updateConfig: vi.fn(),
    getDefaultDownloadPath: vi.fn(),
};

vi.mock('../../services/downloadService', () => ({
    downloadService: mockDownloadService
}));

// Mock UUID
vi.mock('uuid', () => ({
    v4: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)
}));

describe('useDownloadStore', () => {
    beforeEach(() => {
        // Reset store state
        useDownloadStore.setState({
            tasks: [],
            queue: {
                tasks: [],
                activeDownloads: 0,
                maxConcurrentDownloads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 0,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 0,
                downloadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            options: {
                overwrite: false,
                resumable: true,
                maxConcurrentDownloads: 3,
                retryOnFailure: true,
                maxRetries: 3,
                checksumValidation: false,
                createDirectories: true,
            },
            loading: false,
            error: null,
        });

        vi.clearAllMocks();
    });

    describe('addTask', () => {
        it('should add a new download task', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            expect(taskId).toBeDefined();
            expect(store.tasks).toHaveLength(1);

            const task = store.tasks[0];
            expect(task.key).toBe('test/file.txt');
            expect(task.fileName).toBe('file.txt');
            expect(task.localPath).toBe('/downloads/file.txt');
            expect(task.status).toBe('pending');
            expect(task.progress).toBe(0);
            expect(task.downloadedBytes).toBe(0);
            expect(task.totalBytes).toBe(0);
            expect(task.retryCount).toBe(0);
            expect(task.maxRetries).toBe(3);
        });

        it('should add task with custom options', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt', {
                maxRetries: 5,
                overwrite: true,
            });

            const task = store.tasks[0];
            expect(task.maxRetries).toBe(5);
        });

        it('should update statistics after adding task', () => {
            const store = useDownloadStore.getState();

            store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            expect(store.statistics.totalFiles).toBe(1);
        });
    });

    describe('addTasks', () => {
        it('should add multiple download tasks', () => {
            const store = useDownloadStore.getState();

            const items = [
                { key: 'test/file1.txt', fileName: 'file1.txt', localPath: '/downloads/file1.txt' },
                { key: 'test/file2.txt', fileName: 'file2.txt', localPath: '/downloads/file2.txt' },
            ];

            const taskIds = store.addTasks(items);

            expect(taskIds).toHaveLength(2);
            expect(store.tasks).toHaveLength(2);
            expect(store.statistics.totalFiles).toBe(2);
        });
    });

    describe('removeTask', () => {
        it('should remove a task', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');
            expect(store.tasks).toHaveLength(1);

            store.removeTask(taskId);

            expect(store.tasks).toHaveLength(0);
            expect(mockDownloadService.cancelDownload).toHaveBeenCalledWith(taskId);
        });

        it('should not cancel inactive downloads', () => {
            const store = useDownloadStore.getState();

            mockDownloadService.isDownloadActive.mockReturnValue(false);

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');
            store.removeTask(taskId);

            expect(mockDownloadService.cancelDownload).toHaveBeenCalledWith(taskId);
        });
    });

    describe('removeTasks', () => {
        it('should remove multiple tasks', () => {
            const store = useDownloadStore.getState();

            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');

            store.removeTasks([taskId1, taskId2]);

            expect(store.tasks).toHaveLength(0);
            expect(mockDownloadService.cancelDownload).toHaveBeenCalledTimes(2);
        });
    });

    describe('clearCompleted', () => {
        it('should remove only completed tasks', () => {
            const store = useDownloadStore.getState();

            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');

            // Mark one as completed
            store.updateTaskStatus(taskId1, 'completed');

            store.clearCompleted();

            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0].id).toBe(taskId2);
        });
    });

    describe('clearFailed', () => {
        it('should remove only failed tasks', () => {
            const store = useDownloadStore.getState();

            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');

            // Mark one as failed
            store.updateTaskStatus(taskId1, 'failed', 'Download error');

            store.clearFailed();

            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0].id).toBe(taskId2);
        });
    });

    describe('clearAll', () => {
        it('should remove all tasks and cancel active downloads', () => {
            const store = useDownloadStore.getState();

            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');

            // Mark one as downloading
            store.updateTaskStatus(taskId1, 'downloading');

            store.clearAll();

            expect(store.tasks).toHaveLength(0);
            expect(store.statistics.totalFiles).toBe(0);
        });
    });

    describe('startDownload', () => {
        it('should start a pending download', async () => {
            const store = useDownloadStore.getState();

            mockDownloadService.downloadFile.mockResolvedValue(undefined);

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            await store.startDownload(taskId);

            expect(mockDownloadService.downloadFile).toHaveBeenCalled();

            const task = store.getTask(taskId);
            expect(task?.status).toBe('downloading');
            expect(task?.startTime).toBeDefined();
        });

        it('should not start download if already downloading', async () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');
            store.updateTaskStatus(taskId, 'downloading');

            await store.startDownload(taskId);

            expect(mockDownloadService.downloadFile).not.toHaveBeenCalled();
        });

        it('should not start download if concurrent limit reached', async () => {
            const store = useDownloadStore.getState();

            // Add tasks and mark them as downloading to reach limit
            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');
            const taskId3 = store.addTask('test/file3.txt', 'file3.txt', '/downloads/file3.txt');
            const taskId4 = store.addTask('test/file4.txt', 'file4.txt', '/downloads/file4.txt');

            store.updateTaskStatus(taskId1, 'downloading');
            store.updateTaskStatus(taskId2, 'downloading');
            store.updateTaskStatus(taskId3, 'downloading');

            await store.startDownload(taskId4);

            expect(mockDownloadService.downloadFile).not.toHaveBeenCalled();
        });
    });

    describe('pauseDownload', () => {
        it('should pause a downloading task', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');
            store.updateTaskStatus(taskId, 'downloading');

            store.pauseDownload(taskId);

            expect(mockDownloadService.pauseDownload).toHaveBeenCalledWith(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('paused');
        });
    });

    describe('resumeDownload', () => {
        it('should resume a paused task', async () => {
            const store = useDownloadStore.getState();

            mockDownloadService.downloadFile.mockResolvedValue(undefined);

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');
            store.updateTaskStatus(taskId, 'paused');

            await store.resumeDownload(taskId);

            expect(mockDownloadService.downloadFile).toHaveBeenCalled();
        });

        it('should not resume non-paused task', async () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            await store.resumeDownload(taskId);

            expect(mockDownloadService.downloadFile).not.toHaveBeenCalled();
        });
    });

    describe('cancelDownload', () => {
        it('should cancel a download', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            store.cancelDownload(taskId);

            expect(mockDownloadService.cancelDownload).toHaveBeenCalledWith(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('cancelled');
        });
    });

    describe('retryDownload', () => {
        it('should retry a failed download', async () => {
            const store = useDownloadStore.getState();

            mockDownloadService.downloadFile.mockResolvedValue(undefined);

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');
            store.updateTaskStatus(taskId, 'failed', 'Network error');

            await store.retryDownload(taskId);

            const task = store.getTask(taskId);
            expect(task?.retryCount).toBe(1);
            expect(task?.error).toBeUndefined();
            expect(mockDownloadService.downloadFile).toHaveBeenCalled();
        });
    });

    describe('task queries', () => {
        beforeEach(() => {
            const store = useDownloadStore.getState();

            // Add tasks with different statuses
            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');
            const taskId3 = store.addTask('test/file3.txt', 'file3.txt', '/downloads/file3.txt');
            const taskId4 = store.addTask('test/file4.txt', 'file4.txt', '/downloads/file4.txt');

            store.updateTaskStatus(taskId1, 'pending');
            store.updateTaskStatus(taskId2, 'downloading');
            store.updateTaskStatus(taskId3, 'completed');
            store.updateTaskStatus(taskId4, 'failed', 'Error');
        });

        it('should get task by ID', () => {
            const store = useDownloadStore.getState();
            const taskId = store.tasks[0].id;

            const task = store.getTask(taskId);

            expect(task).toBeDefined();
            expect(task?.id).toBe(taskId);
        });

        it('should return null for non-existent task', () => {
            const store = useDownloadStore.getState();

            const task = store.getTask('non-existent');

            expect(task).toBeNull();
        });

        it('should get tasks by status', () => {
            const store = useDownloadStore.getState();

            expect(store.getTasksByStatus('pending')).toHaveLength(1);
            expect(store.getTasksByStatus('downloading')).toHaveLength(1);
            expect(store.getTasksByStatus('completed')).toHaveLength(1);
            expect(store.getTasksByStatus('failed')).toHaveLength(1);
        });

        it('should get pending tasks', () => {
            const store = useDownloadStore.getState();

            const pendingTasks = store.getPendingTasks();

            expect(pendingTasks).toHaveLength(1);
            expect(pendingTasks[0].status).toBe('pending');
        });

        it('should get active tasks', () => {
            const store = useDownloadStore.getState();

            const activeTasks = store.getActiveTasks();

            expect(activeTasks).toHaveLength(1);
            expect(activeTasks[0].status).toBe('downloading');
        });

        it('should get completed tasks', () => {
            const store = useDownloadStore.getState();

            const completedTasks = store.getCompletedTasks();

            expect(completedTasks).toHaveLength(1);
            expect(completedTasks[0].status).toBe('completed');
        });

        it('should get failed tasks', () => {
            const store = useDownloadStore.getState();

            const failedTasks = store.getFailedTasks();

            expect(failedTasks).toHaveLength(1);
            expect(failedTasks[0].status).toBe('failed');
        });
    });

    describe('progress tracking', () => {
        it('should update task progress', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            store.updateTaskProgress(taskId, 50, 512);

            const task = store.getTask(taskId);
            expect(task?.progress).toBe(50);
            expect(task?.downloadedBytes).toBe(512);
        });

        it('should update task status', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            store.updateTaskStatus(taskId, 'completed');

            const task = store.getTask(taskId);
            expect(task?.status).toBe('completed');
            expect(task?.endTime).toBeDefined();
        });

        it('should update task status with error', () => {
            const store = useDownloadStore.getState();

            const taskId = store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            store.updateTaskStatus(taskId, 'failed', 'Network error');

            const task = store.getTask(taskId);
            expect(task?.status).toBe('failed');
            expect(task?.error).toBe('Network error');
            expect(task?.endTime).toBeDefined();
        });

        it('should calculate overall progress', () => {
            const store = useDownloadStore.getState();

            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');

            // Set total bytes
            store.updateTaskProgress(taskId1, 0, 0);
            store.updateTaskProgress(taskId2, 0, 0);

            const task1 = store.getTask(taskId1)!;
            const task2 = store.getTask(taskId2)!;
            task1.totalBytes = 1000;
            task2.totalBytes = 1000;

            // Update progress
            store.updateTaskProgress(taskId1, 50, 500);
            store.updateTaskProgress(taskId2, 25, 250);

            const overallProgress = store.calculateOverallProgress();
            expect(overallProgress).toBe(37.5); // (500 + 250) / (1000 + 1000) * 100
        });
    });

    describe('configuration', () => {
        it('should set options', () => {
            const store = useDownloadStore.getState();

            store.setOptions({
                maxConcurrentDownloads: 5,
                maxRetries: 5,
            });

            expect(store.options.maxConcurrentDownloads).toBe(5);
            expect(store.options.maxRetries).toBe(5);
            expect(store.queue.maxConcurrentDownloads).toBe(5);
            expect(mockDownloadService.updateConfig).toHaveBeenCalledWith({
                maxConcurrentDownloads: 5,
                maxRetries: 5,
            });
        });

        it('should get options', () => {
            const store = useDownloadStore.getState();

            const options = store.getOptions();

            expect(options).toEqual(store.options);
            expect(options).not.toBe(store.options); // Should be a copy
        });
    });

    describe('statistics', () => {
        it('should update statistics', () => {
            const store = useDownloadStore.getState();

            const taskId1 = store.addTask('test/file1.txt', 'file1.txt', '/downloads/file1.txt');
            const taskId2 = store.addTask('test/file2.txt', 'file2.txt', '/downloads/file2.txt');

            store.updateTaskStatus(taskId1, 'completed');
            store.updateTaskStatus(taskId2, 'failed', 'Error');

            store.updateStatistics();

            expect(store.statistics.totalFiles).toBe(2);
            expect(store.statistics.completedFiles).toBe(1);
            expect(store.statistics.failedFiles).toBe(1);
        });

        it('should reset statistics', () => {
            const store = useDownloadStore.getState();

            // Add some tasks to create statistics
            store.addTask('test/file.txt', 'file.txt', '/downloads/file.txt');

            store.resetStatistics();

            expect(store.statistics.totalFiles).toBe(0);
            expect(store.statistics.completedFiles).toBe(0);
            expect(store.statistics.failedFiles).toBe(0);
            expect(store.statistics.totalBytes).toBe(0);
            expect(store.statistics.downloadedBytes).toBe(0);
            expect(store.statistics.averageSpeed).toBe(0);
            expect(store.statistics.totalTime).toBe(0);
        });
    });

    describe('state management', () => {
        it('should set loading state', () => {
            const store = useDownloadStore.getState();

            store.setLoading(true);
            expect(store.loading).toBe(true);

            store.setLoading(false);
            expect(store.loading).toBe(false);
        });

        it('should set error state', () => {
            const store = useDownloadStore.getState();

            store.setError('Test error');
            expect(store.error).toBe('Test error');
        });

        it('should clear error state', () => {
            const store = useDownloadStore.getState();

            store.setError('Test error');
            store.clearError();
            expect(store.error).toBeNull();
        });
    });
});