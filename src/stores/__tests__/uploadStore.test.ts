import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useUploadStore } from '../uploadStore';
import { s3Service } from '../../services/s3Service';
import { UploadTask, UploadStatus } from '../../types/upload';

// Mock s3Service
vi.mock('../../services/s3Service', () => ({
    s3Service: {
        shouldUseMultipartUpload: vi.fn(),
        getPartSize: vi.fn(),
        calculatePartCount: vi.fn(),
        createMultipartUpload: vi.fn(),
        uploadPart: vi.fn(),
        completeMultipartUpload: vi.fn(),
        abortMultipartUpload: vi.fn(),
        putObject: vi.fn(),
    },
}));

// Mock errorHandler
vi.mock('../../services/errorHandler', () => ({
    errorHandler: {
        withRetry: vi.fn((fn) => fn()),
        transformError: vi.fn((error) => error),
        logError: vi.fn(),
    },
}));

describe('UploadStore', () => {
    beforeEach(() => {
        // Reset store state
        useUploadStore.getState().clearAll();
        vi.clearAllMocks();
    });

    describe('Task Management', () => {
        it('should add a task', () => {
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const key = 'test.txt';

            const taskId = useUploadStore.getState().addTask(file, key);
            const store = useUploadStore.getState(); // Get fresh state

            expect(taskId).toBeDefined();
            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0]).toMatchObject({
                id: taskId,
                file,
                key,
                progress: 0,
                status: 'pending',
                uploadedBytes: 0,
                totalBytes: file.size,
                retryCount: 0,
                maxRetries: 3,
            });
        });

        it('should add multiple tasks', () => {
            const files = [
                new File(['content1'], 'file1.txt', { type: 'text/plain' }),
                new File(['content2'], 'file2.txt', { type: 'text/plain' }),
            ];

            const taskIds = useUploadStore.getState().addTasks(files, 'uploads');
            const store = useUploadStore.getState(); // Get fresh state

            expect(taskIds).toHaveLength(2);
            expect(store.tasks).toHaveLength(2);
            expect(store.tasks[0].key).toBe('uploads/file1.txt');
            expect(store.tasks[1].key).toBe('uploads/file2.txt');
        });

        it('should remove a task', () => {
            const file = new File(['test'], 'test.txt');
            const taskId = useUploadStore.getState().addTask(file, 'test.txt');

            useUploadStore.getState().removeTask(taskId);
            const store = useUploadStore.getState(); // Get fresh state

            expect(store.tasks).toHaveLength(0);
            expect(store.queue.tasks).toHaveLength(0);
        });

        it('should remove multiple tasks', () => {
            const files = [
                new File(['content1'], 'file1.txt'),
                new File(['content2'], 'file2.txt'),
            ];
            const taskIds = useUploadStore.getState().addTasks(files);

            useUploadStore.getState().removeTasks(taskIds);
            const store = useUploadStore.getState(); // Get fresh state

            expect(store.tasks).toHaveLength(0);
        });

        it('should clear completed tasks', () => {
            const file1 = new File(['content1'], 'file1.txt');
            const file2 = new File(['content2'], 'file2.txt');
            const taskId1 = useUploadStore.getState().addTask(file1, 'file1.txt');
            const taskId2 = useUploadStore.getState().addTask(file2, 'file2.txt');

            useUploadStore.getState().updateTaskStatus(taskId1, 'completed');
            useUploadStore.getState().updateTaskStatus(taskId2, 'failed');

            useUploadStore.getState().clearCompleted();
            const store = useUploadStore.getState(); // Get fresh state

            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0].status).toBe('failed');
        });

        it('should clear failed tasks', () => {
            const file1 = new File(['content1'], 'file1.txt');
            const file2 = new File(['content2'], 'file2.txt');
            const taskId1 = useUploadStore.getState().addTask(file1, 'file1.txt');
            const taskId2 = useUploadStore.getState().addTask(file2, 'file2.txt');

            useUploadStore.getState().updateTaskStatus(taskId1, 'completed');
            useUploadStore.getState().updateTaskStatus(taskId2, 'failed');

            useUploadStore.getState().clearFailed();
            const store = useUploadStore.getState(); // Get fresh state

            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0].status).toBe('completed');
        });

        it('should clear all tasks', () => {
            const files = [
                new File(['content1'], 'file1.txt'),
                new File(['content2'], 'file2.txt'),
            ];
            useUploadStore.getState().addTasks(files);

            useUploadStore.getState().clearAll();
            const store = useUploadStore.getState(); // Get fresh state

            expect(store.tasks).toHaveLength(0);
            expect(store.queue.tasks).toHaveLength(0);
        });
    });

    describe('Task Queries', () => {
        let taskIds: string[];

        beforeEach(() => {
            const store = useUploadStore.getState();
            const files = [
                new File(['content1'], 'file1.txt'),
                new File(['content2'], 'file2.txt'),
                new File(['content3'], 'file3.txt'),
            ];
            taskIds = store.addTasks(files);

            store.updateTaskStatus(taskIds[0], 'completed');
            store.updateTaskStatus(taskIds[1], 'failed');
            // taskIds[2] remains 'pending'
        });

        it('should get task by id', () => {
            const store = useUploadStore.getState();
            const task = store.getTask(taskIds[0]);
            expect(task).toBeDefined();
            expect(task?.id).toBe(taskIds[0]);
        });

        it('should return null for non-existent task', () => {
            const store = useUploadStore.getState();
            const task = store.getTask('non-existent');
            expect(task).toBeNull();
        });

        it('should get tasks by status', () => {
            const store = useUploadStore.getState();
            const completedTasks = store.getTasksByStatus('completed');
            const failedTasks = store.getTasksByStatus('failed');
            const pendingTasks = store.getTasksByStatus('pending');

            expect(completedTasks).toHaveLength(1);
            expect(failedTasks).toHaveLength(1);
            expect(pendingTasks).toHaveLength(1);
        });

        it('should get pending tasks', () => {
            const store = useUploadStore.getState();
            const pendingTasks = store.getPendingTasks();
            expect(pendingTasks).toHaveLength(1);
            expect(pendingTasks[0].status).toBe('pending');
        });

        it('should get active tasks', () => {
            const store = useUploadStore.getState();
            store.updateTaskStatus(taskIds[2], 'uploading');
            const activeTasks = store.getActiveTasks();
            expect(activeTasks).toHaveLength(1);
            expect(activeTasks[0].status).toBe('uploading');
        });

        it('should get completed tasks', () => {
            const store = useUploadStore.getState();
            const completedTasks = store.getCompletedTasks();
            expect(completedTasks).toHaveLength(1);
            expect(completedTasks[0].status).toBe('completed');
        });

        it('should get failed tasks', () => {
            const store = useUploadStore.getState();
            const failedTasks = store.getFailedTasks();
            expect(failedTasks).toHaveLength(1);
            expect(failedTasks[0].status).toBe('failed');
        });
    });

    describe('Progress Tracking', () => {
        let taskId: string;

        beforeEach(() => {
            const store = useUploadStore.getState();
            const file = new File(['test content'], 'test.txt');
            taskId = store.addTask(file, 'test.txt');
        });

        it('should update task progress', () => {
            useUploadStore.getState().updateTaskProgress(taskId, 50, 6); // 6 bytes is half of 12 bytes
            const store = useUploadStore.getState(); // Get fresh state

            const task = store.getTask(taskId);
            expect(task?.progress).toBe(50);
            expect(task?.uploadedBytes).toBe(6);
        });

        it('should clamp progress between 0 and 100', () => {
            useUploadStore.getState().updateTaskProgress(taskId, -10, 0);
            expect(useUploadStore.getState().getTask(taskId)?.progress).toBe(0);

            useUploadStore.getState().updateTaskProgress(taskId, 150, 1000);
            expect(useUploadStore.getState().getTask(taskId)?.progress).toBe(100);
        });

        it('should update task status', () => {
            useUploadStore.getState().updateTaskStatus(taskId, 'uploading');
            expect(useUploadStore.getState().getTask(taskId)?.status).toBe('uploading');

            useUploadStore.getState().updateTaskStatus(taskId, 'failed', 'Network error');
            const task = useUploadStore.getState().getTask(taskId);
            expect(task?.status).toBe('failed');
            expect(task?.error).toBe('Network error');
        });

        it('should calculate overall progress', () => {
            const file1 = new File(['a'.repeat(100)], 'file1.txt');
            const file2 = new File(['b'.repeat(200)], 'file2.txt');
            const taskId1 = useUploadStore.getState().addTask(file1, 'file1.txt');
            const taskId2 = useUploadStore.getState().addTask(file2, 'file2.txt');

            useUploadStore.getState().updateTaskProgress(taskId1, 100, 100); // 100% of 100 bytes
            useUploadStore.getState().updateTaskProgress(taskId2, 50, 100);   // 50% of 200 bytes

            const store = useUploadStore.getState(); // Get fresh state
            const overallProgress = store.calculateOverallProgress();
            // Total: 300 bytes, Uploaded: 200 bytes = 66.67%
            expect(overallProgress).toBeCloseTo(66.67, 1);
        });

        it('should calculate upload speed', () => {
            const store = useUploadStore.getState();
            const task = store.getTask(taskId);
            if (task) {
                task.startTime = new Date(Date.now() - 10000); // 10 seconds ago
                store.updateTaskProgress(taskId, 50, 1000); // 1000 bytes in 10 seconds
            }

            const speed = store.calculateUploadSpeed(taskId);
            expect(speed).toBe(100); // 1000 bytes / 10 seconds = 100 bytes/sec
        });
    });

    describe('Upload Control', () => {
        let taskId: string;

        beforeEach(() => {
            const store = useUploadStore.getState();
            const file = new File(['test content'], 'test.txt');
            taskId = store.addTask(file, 'test.txt');
        });

        it('should start simple upload for small files', async () => {
            const store = useUploadStore.getState();
            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(false);
            (s3Service.putObject as Mock).mockResolvedValue('etag123');

            await store.startUpload(taskId);

            expect(s3Service.putObject).toHaveBeenCalledWith(
                'test.txt',
                expect.any(File),
                expect.objectContaining({
                    contentType: '',
                    onProgress: expect.any(Function),
                })
            );

            const task = store.getTask(taskId);
            expect(task?.status).toBe('completed');
        });

        it('should start multipart upload for large files', async () => {
            const store = useUploadStore.getState();
            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(true);
            (s3Service.getPartSize as Mock).mockReturnValue(1024);
            (s3Service.calculatePartCount as Mock).mockReturnValue(1);
            (s3Service.createMultipartUpload as Mock).mockResolvedValue('upload123');
            (s3Service.uploadPart as Mock).mockResolvedValue({ etag: 'part-etag', partNumber: 1 });
            (s3Service.completeMultipartUpload as Mock).mockResolvedValue('final-etag');

            await store.startUpload(taskId);

            expect(s3Service.createMultipartUpload).toHaveBeenCalled();
            expect(s3Service.uploadPart).toHaveBeenCalled();
            expect(s3Service.completeMultipartUpload).toHaveBeenCalled();

            const task = store.getTask(taskId);
            expect(task?.status).toBe('completed');
        });

        it('should handle upload failure and retry', async () => {
            const store = useUploadStore.getState();
            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(false);
            (s3Service.putObject as Mock).mockRejectedValue(new Error('Network error'));

            await store.startUpload(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('failed');
            expect(task?.error).toBe('Network error');
        });

        it('should pause upload', () => {
            const store = useUploadStore.getState();
            store.updateTaskStatus(taskId, 'uploading');
            store.pauseUpload(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('paused');
        });

        it('should resume upload', async () => {
            const store = useUploadStore.getState();
            store.updateTaskStatus(taskId, 'paused');
            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(false);
            (s3Service.putObject as Mock).mockResolvedValue('etag123');

            await store.resumeUpload(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('completed');
        });

        it('should cancel upload', () => {
            const store = useUploadStore.getState();
            store.updateTaskStatus(taskId, 'uploading');
            store.cancelUpload(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('cancelled');
        });

        it('should retry failed upload', async () => {
            const store = useUploadStore.getState();
            store.updateTaskStatus(taskId, 'failed', 'Network error');
            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(false);
            (s3Service.putObject as Mock).mockResolvedValue('etag123');

            await store.retryUpload(taskId);

            const task = store.getTask(taskId);
            expect(task?.status).toBe('completed');
            expect(task?.retryCount).toBe(1);
        });
    });

    describe('Configuration', () => {
        it('should set options', () => {
            const store = useUploadStore.getState();
            const newOptions = {
                maxConcurrentUploads: 5,
                maxRetries: 5,
                overwrite: true,
            };

            store.setOptions(newOptions);

            const options = store.getOptions();
            expect(options.maxConcurrentUploads).toBe(5);
            expect(options.maxRetries).toBe(5);
            expect(options.overwrite).toBe(true);
        });

        it('should update queue max concurrent uploads', () => {
            useUploadStore.getState().setOptions({ maxConcurrentUploads: 10 });
            const store = useUploadStore.getState(); // Get fresh state

            expect(store.queue.maxConcurrentUploads).toBe(10);
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            const store = useUploadStore.getState();
            const files = [
                new File(['content1'], 'file1.txt'),
                new File(['content2'], 'file2.txt'),
                new File(['content3'], 'file3.txt'),
            ];
            const taskIds = store.addTasks(files);

            store.updateTaskStatus(taskIds[0], 'completed');
            store.updateTaskStatus(taskIds[1], 'failed');
            // taskIds[2] remains 'pending'
        });

        it('should update statistics', () => {
            useUploadStore.getState().updateStatistics();
            const store = useUploadStore.getState(); // Get fresh state

            const stats = store.statistics;
            expect(stats.totalFiles).toBe(3);
            expect(stats.completedFiles).toBe(1);
            expect(stats.failedFiles).toBe(1);
            expect(stats.totalBytes).toBeGreaterThan(0);
        });

        it('should reset statistics', () => {
            useUploadStore.getState().updateStatistics();
            useUploadStore.getState().resetStatistics();
            const store = useUploadStore.getState(); // Get fresh state

            const stats = store.statistics;
            expect(stats.totalFiles).toBe(0);
            expect(stats.completedFiles).toBe(0);
            expect(stats.failedFiles).toBe(0);
            expect(stats.totalBytes).toBe(0);
            expect(stats.uploadedBytes).toBe(0);
        });
    });

    describe('State Management', () => {
        it('should set loading state', () => {
            useUploadStore.getState().setLoading(true);
            expect(useUploadStore.getState().loading).toBe(true);

            useUploadStore.getState().setLoading(false);
            expect(useUploadStore.getState().loading).toBe(false);
        });

        it('should set error state', () => {
            useUploadStore.getState().setError('Test error');
            expect(useUploadStore.getState().error).toBe('Test error');
        });

        it('should clear error state', () => {
            useUploadStore.getState().setError('Test error');
            useUploadStore.getState().clearError();
            expect(useUploadStore.getState().error).toBeNull();
        });
    });

    describe('Queue Management', () => {
        it('should respect max concurrent uploads', async () => {
            const store = useUploadStore.getState();
            store.setOptions({ maxConcurrentUploads: 2 });

            const files = [
                new File(['content1'], 'file1.txt'),
                new File(['content2'], 'file2.txt'),
                new File(['content3'], 'file3.txt'),
            ];
            const taskIds = store.addTasks(files);

            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(false);
            (s3Service.putObject as Mock).mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('etag'), 100))
            );

            // Start all uploads
            await store.startAllUploads();

            // Should only start 2 uploads due to max concurrent limit
            const activeTasks = store.getActiveTasks();
            expect(activeTasks.length).toBeLessThanOrEqual(2);
        });

        it('should process queue when uploads complete', async () => {
            const store = useUploadStore.getState();
            store.setOptions({ maxConcurrentUploads: 1 });

            const files = [
                new File(['content1'], 'file1.txt'),
                new File(['content2'], 'file2.txt'),
            ];
            const taskIds = store.addTasks(files);

            (s3Service.shouldUseMultipartUpload as Mock).mockReturnValue(false);
            (s3Service.putObject as Mock).mockResolvedValue('etag123');

            // Start first upload
            await store.startUpload(taskIds[0]);

            // First should be completed, second should still be pending
            expect(store.getTask(taskIds[0])?.status).toBe('completed');
            expect(store.getTask(taskIds[1])?.status).toBe('pending');
        });
    });
});