import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
    DownloadTask,
    DownloadStore,
    DownloadStatus,
    DownloadOptions,
    DownloadQueue,
    DownloadStatistics,
    DownloadProgressEvent,
    DownloadCompleteEvent,
    DownloadErrorEvent
} from '../types/download';
import { downloadService } from '../services/downloadService';
import { errorHandler } from '../services/errorHandler';

// Default download options
const DEFAULT_OPTIONS: DownloadOptions = {
    overwrite: false,
    resumable: true,
    maxConcurrentDownloads: 3,
    retryOnFailure: true,
    maxRetries: 3,
    checksumValidation: false,
    createDirectories: true,
};

// Helper function to calculate overall progress
const calculateOverallProgress = (tasks: DownloadTask[]): number => {
    if (tasks.length === 0) return 0;

    const totalBytes = tasks.reduce((sum, task) => sum + task.totalBytes, 0);
    const downloadedBytes = tasks.reduce((sum, task) => sum + task.downloadedBytes, 0);

    return totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
};

// Helper function to calculate overall speed
const calculateOverallSpeed = (tasks: DownloadTask[]): number => {
    const activeTasks = tasks.filter(task => task.status === 'downloading' && task.speed);
    return activeTasks.reduce((sum, task) => sum + (task.speed || 0), 0);
};

// Helper function to update statistics
const updateStatistics = (tasks: DownloadTask[]): DownloadStatistics => {
    const totalFiles = tasks.length;
    const completedFiles = tasks.filter(task => task.status === 'completed').length;
    const failedFiles = tasks.filter(task => task.status === 'failed').length;
    const totalBytes = tasks.reduce((sum, task) => sum + task.totalBytes, 0);
    const downloadedBytes = tasks.reduce((sum, task) => sum + task.downloadedBytes, 0);

    // Calculate average speed from completed tasks
    const completedTasks = tasks.filter(task =>
        task.status === 'completed' && task.startTime && task.endTime
    );

    let averageSpeed = 0;
    let totalTime = 0;

    if (completedTasks.length > 0) {
        const totalDownloadTime = completedTasks.reduce((sum, task) => {
            if (task.startTime && task.endTime) {
                return sum + (task.endTime.getTime() - task.startTime.getTime());
            }
            return sum;
        }, 0);

        const totalCompletedBytes = completedTasks.reduce((sum, task) => sum + task.totalBytes, 0);

        if (totalDownloadTime > 0) {
            averageSpeed = (totalCompletedBytes / totalDownloadTime) * 1000; // bytes per second
            totalTime = totalDownloadTime / 1000; // seconds
        }
    }

    return {
        totalFiles,
        completedFiles,
        failedFiles,
        totalBytes,
        downloadedBytes,
        averageSpeed,
        totalTime,
    };
};

export const useDownloadStore = create<DownloadStore>()((set, get) => ({
    tasks: [],
    queue: {
        tasks: [],
        activeDownloads: 0,
        maxConcurrentDownloads: DEFAULT_OPTIONS.maxConcurrentDownloads || 3,
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
    options: DEFAULT_OPTIONS,
    loading: false,
    error: null,

    // Task management
    addTask: (key, fileName, localPath, options = {}) => {
        const taskId = uuidv4();
        const mergedOptions = { ...get().options, ...options };

        const newTask: DownloadTask = {
            id: taskId,
            key,
            fileName,
            localPath,
            progress: 0,
            status: 'pending',
            downloadedBytes: 0,
            totalBytes: 0,
            retryCount: 0,
            maxRetries: mergedOptions.maxRetries || 3,
            startTime: undefined,
            endTime: undefined,
        };

        set((state) => ({
            tasks: [...state.tasks, newTask],
            queue: {
                ...state.queue,
                tasks: [...state.queue.tasks, newTask],
            }
        }));

        // Update statistics
        get().updateStatistics();

        return taskId;
    },

    addTasks: (items, options = {}) => {
        const taskIds: string[] = [];
        const newTasks: DownloadTask[] = [];
        const mergedOptions = { ...get().options, ...options };

        for (const item of items) {
            const taskId = uuidv4();
            const newTask: DownloadTask = {
                id: taskId,
                key: item.key,
                fileName: item.fileName,
                localPath: item.localPath,
                progress: 0,
                status: 'pending',
                downloadedBytes: 0,
                totalBytes: 0,
                retryCount: 0,
                maxRetries: mergedOptions.maxRetries || 3,
                startTime: undefined,
                endTime: undefined,
            };

            newTasks.push(newTask);
            taskIds.push(taskId);
        }

        set((state) => ({
            tasks: [...state.tasks, ...newTasks],
            queue: {
                ...state.queue,
                tasks: [...state.queue.tasks, ...newTasks],
            }
        }));

        // Update statistics
        get().updateStatistics();

        return taskIds;
    },

    removeTask: (taskId) => {
        // Cancel download if active
        if (downloadService.isDownloadActive(taskId)) {
            downloadService.cancelDownload(taskId);
        }

        set((state) => ({
            tasks: state.tasks.filter(task => task.id !== taskId),
            queue: {
                ...state.queue,
                tasks: state.queue.tasks.filter(task => task.id !== taskId),
            }
        }));

        get().updateStatistics();
    },

    removeTasks: (taskIds) => {
        // Cancel active downloads
        for (const taskId of taskIds) {
            if (downloadService.isDownloadActive(taskId)) {
                downloadService.cancelDownload(taskId);
            }
        }

        set((state) => ({
            tasks: state.tasks.filter(task => !taskIds.includes(task.id)),
            queue: {
                ...state.queue,
                tasks: state.queue.tasks.filter(task => !taskIds.includes(task.id)),
            }
        }));

        get().updateStatistics();
    },

    clearCompleted: () => {
        set((state) => {
            const remainingTasks = state.tasks.filter(task => task.status !== 'completed');
            return {
                tasks: remainingTasks,
                queue: {
                    ...state.queue,
                    tasks: remainingTasks,
                }
            };
        });

        get().updateStatistics();
    },

    clearFailed: () => {
        set((state) => {
            const remainingTasks = state.tasks.filter(task => task.status !== 'failed');
            return {
                tasks: remainingTasks,
                queue: {
                    ...state.queue,
                    tasks: remainingTasks,
                }
            };
        });

        get().updateStatistics();
    },

    clearAll: () => {
        // Cancel all active downloads
        const activeTasks = get().getActiveTasks();
        for (const task of activeTasks) {
            downloadService.cancelDownload(task.id);
        }

        set({
            tasks: [],
            queue: {
                tasks: [],
                activeDownloads: 0,
                maxConcurrentDownloads: get().queue.maxConcurrentDownloads,
                totalProgress: 0,
                overallSpeed: 0,
            }
        });

        get().resetStatistics();
    },

    // Download control
    startDownload: async (taskId) => {
        const task = get().getTask(taskId);
        if (!task || task.status === 'downloading') return;

        // Check concurrent download limit
        const activeCount = get().getActiveTasks().length;
        if (activeCount >= get().queue.maxConcurrentDownloads) {
            console.warn('Maximum concurrent downloads reached');
            return;
        }

        // Update task status
        get().updateTaskStatus(taskId, 'downloading');

        const updatedTask = get().getTask(taskId);
        if (!updatedTask) return;

        updatedTask.startTime = new Date();

        try {
            // Use enhanced download method if available, fallback to regular method
            const downloadMethod = (downloadService as any).downloadFileEnhanced || downloadService.downloadFile;

            await downloadMethod.call(downloadService,
                updatedTask,
                get().options,
                // Progress callback
                (event: DownloadProgressEvent) => {
                    get().updateTaskProgress(taskId, event.progress, event.loaded);
                },
                // Complete callback
                (event: DownloadCompleteEvent) => {
                    get().updateTaskStatus(taskId, 'completed');
                },
                // Error callback
                (event: DownloadErrorEvent) => {
                    if (event.retryable && updatedTask.retryCount < updatedTask.maxRetries) {
                        // Retry the download with exponential backoff
                        setTimeout(() => {
                            get().retryDownload(taskId);
                        }, Math.pow(2, updatedTask.retryCount) * 1000);
                    } else {
                        get().updateTaskStatus(taskId, 'failed', event.error.message);
                    }
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            get().updateTaskStatus(taskId, 'failed', errorMessage);
        }
    },

    startAllDownloads: async () => {
        const pendingTasks = get().getPendingTasks();
        const maxConcurrent = get().queue.maxConcurrentDownloads;
        const activeCount = get().getActiveTasks().length;
        const availableSlots = maxConcurrent - activeCount;

        const tasksToStart = pendingTasks.slice(0, availableSlots);

        for (const task of tasksToStart) {
            await get().startDownload(task.id);
        }
    },

    pauseDownload: (taskId) => {
        downloadService.pauseDownload(taskId);
        get().updateTaskStatus(taskId, 'paused');
    },

    pauseAllDownloads: () => {
        const activeTasks = get().getActiveTasks();
        for (const task of activeTasks) {
            get().pauseDownload(task.id);
        }
    },

    resumeDownload: async (taskId) => {
        const task = get().getTask(taskId);
        if (!task || task.status !== 'paused') return;

        await get().startDownload(taskId);
    },

    resumeAllDownloads: async () => {
        const pausedTasks = get().getTasksByStatus('paused');
        for (const task of pausedTasks) {
            await get().resumeDownload(task.id);
        }
    },

    cancelDownload: (taskId) => {
        downloadService.cancelDownload(taskId);
        get().updateTaskStatus(taskId, 'cancelled');
    },

    cancelAllDownloads: () => {
        const activeTasks = get().getActiveTasks();
        for (const task of activeTasks) {
            get().cancelDownload(task.id);
        }
    },

    retryDownload: async (taskId) => {
        const task = get().getTask(taskId);
        if (!task) return;

        // Increment retry count
        set((state) => ({
            tasks: state.tasks.map(t =>
                t.id === taskId
                    ? { ...t, retryCount: t.retryCount + 1, error: undefined }
                    : t
            )
        }));

        await get().startDownload(taskId);
    },

    retryFailedDownloads: async () => {
        const failedTasks = get().getFailedTasks();
        for (const task of failedTasks) {
            if (task.retryCount < task.maxRetries) {
                await get().retryDownload(task.id);
            }
        }
    },

    // Task queries
    getTask: (taskId) => {
        return get().tasks.find(task => task.id === taskId) || null;
    },

    getTasksByStatus: (status) => {
        return get().tasks.filter(task => task.status === status);
    },

    getPendingTasks: () => {
        return get().getTasksByStatus('pending');
    },

    getActiveTasks: () => {
        return get().getTasksByStatus('downloading');
    },

    getCompletedTasks: () => {
        return get().getTasksByStatus('completed');
    },

    getFailedTasks: () => {
        return get().getTasksByStatus('failed');
    },

    // Progress tracking
    updateTaskProgress: (taskId, progress, downloadedBytes) => {
        set((state) => ({
            tasks: state.tasks.map(task =>
                task.id === taskId
                    ? { ...task, progress, downloadedBytes }
                    : task
            )
        }));

        // Update queue progress
        const tasks = get().tasks;
        const totalProgress = calculateOverallProgress(tasks);
        const overallSpeed = calculateOverallSpeed(tasks);

        set((state) => ({
            queue: {
                ...state.queue,
                totalProgress,
                overallSpeed,
                activeDownloads: downloadService.getActiveDownloadCount(),
            }
        }));

        get().updateStatistics();
    },

    updateTaskStatus: (taskId, status, error) => {
        set((state) => ({
            tasks: state.tasks.map(task =>
                task.id === taskId
                    ? {
                        ...task,
                        status,
                        error,
                        endTime: status === 'completed' || status === 'failed' || status === 'cancelled'
                            ? new Date()
                            : task.endTime,
                        pausedAt: status === 'paused' ? new Date() : undefined,
                        cancelledAt: status === 'cancelled' ? new Date() : undefined,
                    }
                    : task
            )
        }));

        // Update queue active downloads count
        set((state) => ({
            queue: {
                ...state.queue,
                activeDownloads: downloadService.getActiveDownloadCount(),
            }
        }));

        get().updateStatistics();
    },

    calculateOverallProgress: () => {
        return calculateOverallProgress(get().tasks);
    },

    calculateDownloadSpeed: (taskId) => {
        return downloadService.calculateDownloadSpeed(taskId);
    },

    // Configuration
    setOptions: (options) => {
        set((state) => ({
            options: { ...state.options, ...options },
            queue: {
                ...state.queue,
                maxConcurrentDownloads: options.maxConcurrentDownloads || state.queue.maxConcurrentDownloads,
            }
        }));

        // Update download service config
        downloadService.updateConfig({
            maxConcurrentDownloads: options.maxConcurrentDownloads,
            maxRetries: options.maxRetries,
        });
    },

    getOptions: () => {
        return { ...get().options };
    },

    // State management
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Statistics
    updateStatistics: () => {
        const statistics = updateStatistics(get().tasks);
        set({ statistics });
    },

    resetStatistics: () => {
        set({
            statistics: {
                totalFiles: 0,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 0,
                downloadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            }
        });
    },
}));