import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    UploadTask,
    UploadStatus,
    UploadQueue,
    UploadStatistics,
    UploadOptions,
    UploadStore,
    UploadProgressEvent,
    MultipartUploadInfo,
    MultipartResumeData,
    MultipartUploadConfig
} from '../types/upload';
import { s3Service } from '../services/s3Service';
import { errorHandler } from '../services/errorHandler';

// Default upload options
const DEFAULT_OPTIONS: UploadOptions = {
    overwrite: false,
    resumable: true,
    chunkSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentUploads: 3,
    retryOnFailure: true,
    maxRetries: 3,
    metadata: {},
    storageClass: 'STANDARD',
};

// Default multipart upload configuration
const DEFAULT_MULTIPART_CONFIG: MultipartUploadConfig = {
    partSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentParts: 3,
    enableResume: true,
    checksumValidation: true,
    retryFailedParts: true,
    maxPartRetries: 3,
};

// Default statistics
const DEFAULT_STATISTICS: UploadStatistics = {
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    averageSpeed: 0,
    totalTime: 0,
};

// Default queue
const DEFAULT_QUEUE: UploadQueue = {
    tasks: [],
    activeUploads: 0,
    maxConcurrentUploads: 3,
    totalProgress: 0,
    overallSpeed: 0,
};

// Upload store implementation
export const useUploadStore = create<UploadStore>()(
    devtools(
        (set, get) => ({
            // State
            tasks: [],
            queue: { ...DEFAULT_QUEUE },
            statistics: { ...DEFAULT_STATISTICS },
            options: { ...DEFAULT_OPTIONS },
            loading: false,
            error: null,
            multipartConfig: { ...DEFAULT_MULTIPART_CONFIG },

            // Task management
            addTask: (file: File, key: string, options?: Partial<UploadOptions>) => {
                const taskId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const mergedOptions = { ...get().options, ...options };

                const isMultipart = s3Service.shouldUseMultipartUpload(file.size);

                const newTask: UploadTask = {
                    id: taskId,
                    file,
                    key,
                    progress: 0,
                    status: 'pending',
                    uploadedBytes: 0,
                    totalBytes: file.size,
                    retryCount: 0,
                    maxRetries: mergedOptions.maxRetries || 3,
                    startTime: undefined,
                    endTime: undefined,
                    speed: 0,
                    estimatedTimeRemaining: 0,
                    isMultipart,
                    uploadedParts: isMultipart ? [] : undefined,
                };

                set((state) => ({
                    tasks: [...state.tasks, newTask],
                    queue: {
                        ...state.queue,
                        tasks: [...state.queue.tasks, newTask],
                    },
                }));

                // Update statistics
                get().updateStatistics();

                return taskId;
            },

            addTasks: (files: FileList | File[], basePath?: string, options?: Partial<UploadOptions>) => {
                const fileArray = Array.from(files);
                const taskIds: string[] = [];

                fileArray.forEach((file) => {
                    const key = basePath ? `${basePath}/${file.name}` : file.name;
                    const taskId = get().addTask(file, key, options);
                    taskIds.push(taskId);
                });

                return taskIds;
            },

            removeTask: (taskId: string) => {
                const task = get().getTask(taskId);
                if (task && task.status === 'uploading') {
                    get().cancelUpload(taskId);
                }

                set((state) => ({
                    tasks: state.tasks.filter(t => t.id !== taskId),
                    queue: {
                        ...state.queue,
                        tasks: state.queue.tasks.filter(t => t.id !== taskId),
                    },
                }));

                get().updateStatistics();
            },

            removeTasks: (taskIds: string[]) => {
                taskIds.forEach(taskId => get().removeTask(taskId));
            },

            clearCompleted: () => {
                set((state) => {
                    const remainingTasks = state.tasks.filter(t => t.status !== 'completed');
                    return {
                        tasks: remainingTasks,
                        queue: {
                            ...state.queue,
                            tasks: remainingTasks,
                        },
                    };
                });
                get().updateStatistics();
            },

            clearFailed: () => {
                set((state) => {
                    const remainingTasks = state.tasks.filter(t => t.status !== 'failed');
                    return {
                        tasks: remainingTasks,
                        queue: {
                            ...state.queue,
                            tasks: remainingTasks,
                        },
                    };
                });
                get().updateStatistics();
            },

            clearAll: () => {
                // Cancel all active uploads first
                get().cancelAllUploads();

                set({
                    tasks: [],
                    queue: { ...DEFAULT_QUEUE },
                    statistics: { ...DEFAULT_STATISTICS },
                });
            },

            // Upload control
            startUpload: async (taskId: string) => {
                const task = get().getTask(taskId);
                if (!task || task.status !== 'pending') {
                    return;
                }

                // Check if we've reached max concurrent uploads
                const activeCount = get().getActiveTasks().length;
                if (activeCount >= get().queue.maxConcurrentUploads) {
                    return;
                }

                try {
                    get().updateTaskStatus(taskId, 'uploading');
                    get().updateTaskProgress(taskId, 0, 0);

                    const updatedTask = get().getTask(taskId);
                    if (!updatedTask) return;

                    updatedTask.startTime = new Date();

                    // Determine upload method based on file size
                    const shouldUseMultipart = s3Service.shouldUseMultipartUpload(updatedTask.file.size);

                    if (shouldUseMultipart) {
                        await get().performMultipartUpload(updatedTask);
                    } else {
                        await get().performSimpleUpload(updatedTask);
                    }

                    get().updateTaskStatus(taskId, 'completed');
                    const completedTask = get().getTask(taskId);
                    if (completedTask) {
                        completedTask.endTime = new Date();
                        completedTask.progress = 100;
                        completedTask.uploadedBytes = completedTask.totalBytes;
                    }

                } catch (error) {
                    console.error('Upload failed:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
                    get().updateTaskStatus(taskId, 'failed', errorMessage);

                    // Retry if enabled and retries remaining
                    const failedTask = get().getTask(taskId);
                    if (failedTask && get().options.retryOnFailure && failedTask.retryCount < failedTask.maxRetries) {
                        setTimeout(() => {
                            get().retryUpload(taskId);
                        }, Math.pow(2, failedTask.retryCount) * 1000); // Exponential backoff
                    }
                }

                get().updateStatistics();
                get().processQueue();
            },

            startAllUploads: async () => {
                const pendingTasks = get().getPendingTasks();
                const maxConcurrent = get().queue.maxConcurrentUploads;
                const activeCount = get().getActiveTasks().length;
                const availableSlots = maxConcurrent - activeCount;

                const tasksToStart = pendingTasks.slice(0, availableSlots);

                for (const task of tasksToStart) {
                    get().startUpload(task.id);
                }
            },

            pauseUpload: (taskId: string) => {
                const task = get().getTask(taskId);
                if (task && task.status === 'uploading') {
                    // Use enhanced pause for multipart uploads
                    if (task.isMultipart) {
                        get().pauseMultipartUpload(taskId);
                        return;
                    }

                    get().updateTaskStatus(taskId, 'paused');

                    // Store pause information for resumable uploads
                    set((state) => ({
                        tasks: state.tasks.map(t =>
                            t.id === taskId
                                ? { ...t, pausedAt: new Date() }
                                : t
                        ),
                    }));
                }
            },

            pauseAllUploads: () => {
                const activeTasks = get().getActiveTasks();
                activeTasks.forEach(task => get().pauseUpload(task.id));
            },

            resumeUpload: async (taskId: string) => {
                const task = get().getTask(taskId);
                if (task && task.status === 'paused') {
                    get().updateTaskStatus(taskId, 'pending');
                    await get().startUpload(taskId);
                }
            },

            resumeAllUploads: async () => {
                const pausedTasks = get().getTasksByStatus('paused');
                for (const task of pausedTasks) {
                    await get().resumeUpload(task.id);
                }
            },

            cancelUpload: (taskId: string) => {
                const task = get().getTask(taskId);
                if (task && (task.status === 'uploading' || task.status === 'paused' || task.status === 'pending')) {
                    get().updateTaskStatus(taskId, 'cancelled');

                    // Mark cancellation time
                    set((state) => ({
                        tasks: state.tasks.map(t =>
                            t.id === taskId
                                ? { ...t, cancelledAt: new Date(), resumeData: undefined }
                                : t
                        ),
                    }));

                    // Abort multipart upload if it exists
                    if (task.isMultipart && task.multipartUploadId) {
                        s3Service.abortMultipartUpload(task.key, task.multipartUploadId)
                            .catch(error => {
                                console.error('Failed to abort multipart upload:', error);
                            });
                    }
                }
            },

            cancelAllUploads: () => {
                const activeTasks = [...get().getActiveTasks(), ...get().getTasksByStatus('paused')];
                activeTasks.forEach(task => get().cancelUpload(task.id));
            },

            retryUpload: async (taskId: string) => {
                const task = get().getTask(taskId);
                if (task && task.status === 'failed' && task.retryCount < task.maxRetries) {
                    // Increment retry count and reset task state
                    const updatedTask = {
                        ...task,
                        retryCount: task.retryCount + 1,
                        error: undefined,
                        progress: 0,
                        uploadedBytes: 0,
                        speed: 0,
                        estimatedTimeRemaining: 0,
                        startTime: undefined,
                        endTime: undefined
                    };

                    set((state) => ({
                        tasks: state.tasks.map(t =>
                            t.id === taskId ? updatedTask : t
                        ),
                    }));

                    get().updateTaskStatus(taskId, 'pending');
                    await get().startUpload(taskId);
                }
            },

            retryFailedUploads: async () => {
                const failedTasks = get().getFailedTasks();
                for (const task of failedTasks) {
                    await get().retryUpload(task.id);
                }
            },

            // Task queries
            getTask: (taskId: string) => {
                return get().tasks.find(task => task.id === taskId) || null;
            },

            getTasksByStatus: (status: UploadStatus) => {
                return get().tasks.filter(task => task.status === status);
            },

            getPendingTasks: () => {
                return get().getTasksByStatus('pending');
            },

            getActiveTasks: () => {
                return get().getTasksByStatus('uploading');
            },

            getCompletedTasks: () => {
                return get().getTasksByStatus('completed');
            },

            getFailedTasks: () => {
                return get().getTasksByStatus('failed');
            },

            // Progress tracking
            updateTaskProgress: (taskId: string, progress: number, uploadedBytes: number) => {
                set((state) => ({
                    tasks: state.tasks.map(task => {
                        if (task.id === taskId) {
                            const clampedProgress = Math.min(100, Math.max(0, progress));
                            const clampedUploadedBytes = Math.min(task.totalBytes, Math.max(0, uploadedBytes));

                            // Calculate speed
                            let speed = 0;
                            if (task.startTime && clampedUploadedBytes > 0) {
                                const elapsedTime = (Date.now() - task.startTime.getTime()) / 1000;
                                speed = elapsedTime > 0 ? clampedUploadedBytes / elapsedTime : 0;
                            }

                            // Calculate estimated time remaining
                            let estimatedTimeRemaining = 0;
                            if (speed > 0) {
                                const remainingBytes = task.totalBytes - clampedUploadedBytes;
                                estimatedTimeRemaining = remainingBytes / speed;
                            }

                            return {
                                ...task,
                                progress: clampedProgress,
                                uploadedBytes: clampedUploadedBytes,
                                speed,
                                estimatedTimeRemaining,
                            };
                        }
                        return task;
                    }),
                }));

                get().updateOverallProgress();
            },

            updateTaskStatus: (taskId: string, status: UploadStatus, error?: string) => {
                set((state) => ({
                    tasks: state.tasks.map(task =>
                        task.id === taskId
                            ? { ...task, status, error }
                            : task
                    ),
                }));

                // Update queue active count
                const activeCount = get().getActiveTasks().length;
                set((state) => ({
                    queue: {
                        ...state.queue,
                        activeUploads: activeCount,
                    },
                }));
            },

            calculateOverallProgress: () => {
                const tasks = get().tasks;
                if (tasks.length === 0) return 0;

                const totalBytes = tasks.reduce((sum, task) => sum + task.totalBytes, 0);
                const uploadedBytes = tasks.reduce((sum, task) => sum + task.uploadedBytes, 0);

                return totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
            },

            calculateUploadSpeed: (taskId: string) => {
                const task = get().getTask(taskId);
                if (!task || !task.startTime || task.uploadedBytes === 0) {
                    return 0;
                }

                const elapsedTime = (Date.now() - task.startTime.getTime()) / 1000; // seconds
                return elapsedTime > 0 ? task.uploadedBytes / elapsedTime : 0;
            },

            // Configuration
            setOptions: (options: Partial<UploadOptions>) => {
                set((state) => ({
                    options: { ...state.options, ...options },
                    queue: {
                        ...state.queue,
                        maxConcurrentUploads: options.maxConcurrentUploads || state.queue.maxConcurrentUploads,
                    },
                }));
            },

            getOptions: () => {
                return get().options;
            },

            // State management
            setLoading: (loading: boolean) => {
                set({ loading });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            clearError: () => {
                set({ error: null });
            },

            // Statistics
            updateStatistics: () => {
                const tasks = get().tasks;
                const completedTasks = get().getCompletedTasks();
                const failedTasks = get().getFailedTasks();

                const totalBytes = tasks.reduce((sum, task) => sum + task.totalBytes, 0);
                const uploadedBytes = tasks.reduce((sum, task) => sum + task.uploadedBytes, 0);

                // Calculate average speed from completed tasks
                const completedTasksWithSpeed = completedTasks.filter(task =>
                    task.startTime && task.endTime && task.totalBytes > 0
                );

                const averageSpeed = completedTasksWithSpeed.length > 0
                    ? completedTasksWithSpeed.reduce((sum, task) => {
                        const duration = (task.endTime!.getTime() - task.startTime!.getTime()) / 1000;
                        return sum + (task.totalBytes / duration);
                    }, 0) / completedTasksWithSpeed.length
                    : 0;

                // Calculate total time
                const totalTime = tasks.reduce((sum, task) => {
                    if (task.startTime && task.endTime) {
                        return sum + (task.endTime.getTime() - task.startTime.getTime()) / 1000;
                    }
                    return sum;
                }, 0);

                set((state) => ({
                    statistics: {
                        totalFiles: tasks.length,
                        completedFiles: completedTasks.length,
                        failedFiles: failedTasks.length,
                        totalBytes,
                        uploadedBytes,
                        averageSpeed,
                        totalTime,
                    },
                }));
            },

            resetStatistics: () => {
                set({ statistics: { ...DEFAULT_STATISTICS } });
            },

            // Private helper methods
            updateOverallProgress: () => {
                const overallProgress = get().calculateOverallProgress();
                const activeTasks = get().getActiveTasks();
                const overallSpeed = activeTasks.reduce((sum, task) => sum + (task.speed || 0), 0);

                set((state) => ({
                    queue: {
                        ...state.queue,
                        totalProgress: overallProgress,
                        overallSpeed,
                    },
                }));
            },

            processQueue: () => {
                // Start pending uploads if there are available slots
                const activeCount = get().getActiveTasks().length;
                const maxConcurrent = get().queue.maxConcurrentUploads;

                if (activeCount < maxConcurrent) {
                    const pendingTasks = get().getPendingTasks();
                    const availableSlots = maxConcurrent - activeCount;
                    const tasksToStart = pendingTasks.slice(0, availableSlots);

                    tasksToStart.forEach(task => {
                        get().startUpload(task.id);
                    });
                }
            },

            calculateEstimatedTime: (taskId: string, uploadedBytes: number) => {
                const task = get().getTask(taskId);
                if (!task || !task.startTime || uploadedBytes === 0) {
                    return 0;
                }

                const elapsedTime = (Date.now() - task.startTime.getTime()) / 1000;
                const speed = uploadedBytes / elapsedTime;
                const remainingBytes = task.totalBytes - uploadedBytes;

                return speed > 0 ? remainingBytes / speed : 0;
            },

            performSimpleUpload: async (task: UploadTask) => {
                const onProgress = (event: UploadProgressEvent) => {
                    const progress = (event.loaded / event.total) * 100;
                    get().updateTaskProgress(task.id, progress, event.loaded);
                };

                await s3Service.putObject(task.key, task.file, {
                    contentType: task.file.type,
                    onProgress,
                });
            },

            performMultipartUpload: async (task: UploadTask) => {
                const partSize = s3Service.getPartSize();
                const totalParts = s3Service.calculatePartCount(task.file.size);
                const multipartConfig = get().multipartConfig;

                let uploadId = task.multipartUploadId;
                let existingParts: Array<{ partNumber: number; etag: string; size: number }> = [];

                try {
                    // Check if we can resume an existing upload
                    if (multipartConfig.enableResume && task.resumeData?.uploadId) {
                        uploadId = task.resumeData.uploadId;
                        try {
                            existingParts = await s3Service.resumeMultipartUpload(task.key, uploadId);
                            console.log(`Resuming multipart upload with ${existingParts.length} existing parts`);
                        } catch (resumeError) {
                            console.warn('Failed to resume multipart upload, starting new one:', resumeError);
                            uploadId = undefined;
                        }
                    }

                    // Create new multipart upload if not resuming
                    if (!uploadId) {
                        uploadId = await s3Service.createMultipartUpload(task.key, {
                            contentType: task.file.type,
                            metadata: task.file.type ? { 'Content-Type': task.file.type } : undefined,
                        });

                        // Update task with upload ID
                        set((state) => ({
                            tasks: state.tasks.map(t =>
                                t.id === task.id
                                    ? { ...t, multipartUploadId: uploadId }
                                    : t
                            ),
                        }));
                    }

                    // Calculate checksum for integrity verification if enabled
                    let fileChecksum: string | undefined;
                    if (multipartConfig.checksumValidation) {
                        fileChecksum = await s3Service.calculateFileChecksum(task.file);
                    }

                    // Determine which parts need to be uploaded
                    const existingPartNumbers = new Set(existingParts.map(p => p.partNumber));
                    const partsToUpload: Array<{ partNumber: number; data: ArrayBuffer }> = [];

                    // Calculate initial uploaded bytes from existing parts
                    let uploadedBytes = existingParts.reduce((sum, part) => sum + part.size, 0);

                    // Prepare parts that need to be uploaded
                    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
                        if (!existingPartNumbers.has(partNumber)) {
                            const start = (partNumber - 1) * partSize;
                            const end = Math.min(start + partSize, task.file.size);
                            const partData = task.file.slice(start, end);

                            // Convert Blob to ArrayBuffer
                            const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as ArrayBuffer);
                                reader.onerror = reject;
                                reader.readAsArrayBuffer(partData);
                            });

                            partsToUpload.push({ partNumber, data: arrayBuffer });
                        }
                    }

                    // Update initial progress based on existing parts
                    const initialProgress = (uploadedBytes / task.file.size) * 100;
                    get().updateTaskProgress(task.id, initialProgress, uploadedBytes);

                    // Upload remaining parts concurrently
                    const partProgressMap = new Map<number, number>();

                    const onPartProgress = (partNumber: number, progress: number) => {
                        partProgressMap.set(partNumber, progress);

                        // Calculate total progress including existing parts
                        const totalPartProgress = Array.from(partProgressMap.values()).reduce((sum, p) => sum + p, 0);
                        const existingPartsProgress = existingParts.length * 100;
                        const overallProgress = ((totalPartProgress + existingPartsProgress) / totalParts);

                        // Calculate uploaded bytes for this batch
                        const currentBatchBytes = partsToUpload.reduce((sum, part, index) => {
                            const partProgress = partProgressMap.get(part.partNumber) || 0;
                            return sum + (part.data.byteLength * partProgress / 100);
                        }, 0);

                        const totalUploadedBytes = uploadedBytes + currentBatchBytes;
                        get().updateTaskProgress(task.id, overallProgress, totalUploadedBytes);
                    };

                    const newParts = await s3Service.uploadPartsConcurrently(
                        task.key,
                        uploadId,
                        partsToUpload,
                        multipartConfig.maxConcurrentParts,
                        multipartConfig.maxPartRetries,
                        onPartProgress
                    );

                    // Combine existing and new parts
                    const allParts = [
                        ...existingParts.map(p => ({ etag: p.etag, partNumber: p.partNumber })),
                        ...newParts
                    ].sort((a, b) => a.partNumber - b.partNumber);

                    // Verify integrity if enabled
                    if (multipartConfig.checksumValidation && fileChecksum) {
                        const isValid = await s3Service.verifyMultipartUploadIntegrity(
                            task.key,
                            uploadId,
                            fileChecksum
                        );
                        if (!isValid) {
                            throw new Error('Multipart upload integrity verification failed');
                        }
                    }

                    // Complete multipart upload
                    await s3Service.completeMultipartUpload(task.key, uploadId, allParts);

                    // Clear resume data on successful completion
                    set((state) => ({
                        tasks: state.tasks.map(t =>
                            t.id === task.id
                                ? {
                                    ...t,
                                    resumeData: undefined,
                                    multipartUploadId: undefined,
                                    uploadedParts: allParts.map(p => ({ ...p, size: 0 }))
                                }
                                : t
                        ),
                    }));

                } catch (error) {
                    console.error('Multipart upload failed:', error);

                    // Save resume data for potential retry
                    if (multipartConfig.enableResume && uploadId) {
                        try {
                            const completedParts = await s3Service.listMultipartUploadParts(task.key, uploadId);
                            const resumeData: MultipartResumeData = {
                                uploadId,
                                partSize,
                                totalParts,
                                completedParts,
                                lastPartNumber: Math.max(...completedParts.map(p => p.partNumber), 0),
                                checksum: multipartConfig.checksumValidation ?
                                    await s3Service.calculateFileChecksum(task.file) : undefined,
                            };

                            set((state) => ({
                                tasks: state.tasks.map(t =>
                                    t.id === task.id
                                        ? { ...t, resumeData }
                                        : t
                                ),
                            }));
                        } catch (resumeError) {
                            console.error('Failed to save resume data:', resumeError);
                        }
                    }

                    // Only abort if it's not a resumable error and we're not retrying
                    const currentTask = get().getTask(task.id);
                    const shouldAbort = !multipartConfig.enableResume ||
                        (currentTask && currentTask.retryCount >= currentTask.maxRetries);

                    if (shouldAbort && uploadId) {
                        try {
                            await s3Service.abortMultipartUpload(task.key, uploadId);
                        } catch (abortError) {
                            console.error('Failed to abort multipart upload:', abortError);
                        }
                    }

                    throw error;
                }
            },

            // Configuration for multipart uploads
            setMultipartConfig: (config: Partial<MultipartUploadConfig>) => {
                set((state) => ({
                    multipartConfig: { ...state.multipartConfig, ...config },
                }));
            },

            getMultipartConfig: () => {
                return get().multipartConfig;
            },

            // Enhanced pause functionality for multipart uploads
            pauseMultipartUpload: async (taskId: string) => {
                const task = get().getTask(taskId);
                if (task && task.status === 'uploading' && task.isMultipart && task.multipartUploadId) {
                    // Save current state for resuming
                    try {
                        const completedParts = await s3Service.listMultipartUploadParts(
                            task.key,
                            task.multipartUploadId
                        );

                        const resumeData: MultipartResumeData = {
                            uploadId: task.multipartUploadId,
                            partSize: s3Service.getPartSize(),
                            totalParts: s3Service.calculatePartCount(task.file.size),
                            completedParts,
                            lastPartNumber: Math.max(...completedParts.map(p => p.partNumber), 0),
                        };

                        set((state) => ({
                            tasks: state.tasks.map(t =>
                                t.id === taskId
                                    ? { ...t, resumeData, pausedAt: new Date() }
                                    : t
                            ),
                        }));
                    } catch (error) {
                        console.error('Failed to save pause state:', error);
                    }
                }

                get().pauseUpload(taskId);
            },
        }),
        {
            name: 'upload-store',
        }
    )
);

export default useUploadStore;