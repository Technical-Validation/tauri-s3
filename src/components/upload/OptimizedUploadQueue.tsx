import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { useUploadStore } from '../../stores/uploadStore';
import { UploadTask, UploadStatus } from '../../types/upload';
import { throttle, debounce, batchUpdater } from '../../utils/performance';

export interface OptimizedUploadQueueProps {
    className?: string;
    showCompleted?: boolean;
    maxVisibleTasks?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    onTaskAction?: (taskId: string, action: string) => void;
    enableVirtualization?: boolean;
    itemHeight?: number;
}

interface TaskItemData {
    tasks: UploadTask[];
    onTaskAction?: (taskId: string, action: string) => void;
    lastUpdate: number;
}

// Memoized upload task row component
const UploadTaskRow = React.memo<{
    index: number;
    style: React.CSSProperties;
    data: TaskItemData;
}>(({ index, style, data }) => {
    const { tasks, onTaskAction, lastUpdate } = data;
    const task = tasks[index];

    if (!task) return null;

    return (
        <div style={style}>
            <UploadTaskItem
                task={task}
                onAction={onTaskAction}
                lastUpdate={lastUpdate}
            />
        </div>
    );
});

UploadTaskRow.displayName = 'UploadTaskRow';

export const OptimizedUploadQueue: React.FC<OptimizedUploadQueueProps> = ({
    className = '',
    showCompleted = false,
    maxVisibleTasks = 10,
    autoRefresh = true,
    refreshInterval = 1000,
    onTaskAction,
    enableVirtualization = true,
    itemHeight = 120,
}) => {
    const {
        tasks,
        queue,
        statistics,
        startAllUploads,
        pauseAllUploads,
        cancelAllUploads,
        retryFailedUploads,
        clearCompleted,
        clearFailed,
        clearAll
    } = useUploadStore();

    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const listRef = useRef<List>(null);
    const updateCountRef = useRef(0);

    // Throttled update function with batch processing
    const throttledUpdate = useCallback(
        throttle(() => {
            batchUpdater.add(() => {
                setLastUpdate(Date.now());
                updateCountRef.current++;
            });
        }, refreshInterval / 2), // Update more frequently but batch the changes
        [refreshInterval]
    );

    // Auto-refresh for real-time updates
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(throttledUpdate, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, throttledUpdate, refreshInterval]);

    // Optimized task filtering and sorting
    const visibleTasks = useMemo(() => {
        let filteredTasks = tasks;

        if (!showCompleted) {
            filteredTasks = tasks.filter(task => task.status !== 'completed');
        }

        // Sort by status priority and creation time
        const statusPriority: Record<UploadStatus, number> = {
            uploading: 1,
            pending: 2,
            paused: 3,
            failed: 4,
            cancelled: 5,
            completed: 6
        };

        // Use a more efficient sorting algorithm for large lists
        if (filteredTasks.length > 100) {
            // For large lists, use a stable sort with pre-computed keys
            const tasksWithKeys = filteredTasks.map(task => ({
                task,
                priority: statusPriority[task.status],
                timestamp: task.id
            }));

            tasksWithKeys.sort((a, b) => {
                const priorityDiff = a.priority - b.priority;
                if (priorityDiff !== 0) return priorityDiff;
                return b.timestamp.localeCompare(a.timestamp);
            });

            filteredTasks = tasksWithKeys.map(item => item.task);
        } else {
            filteredTasks.sort((a, b) => {
                const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
                if (priorityDiff !== 0) return priorityDiff;
                return b.id.localeCompare(a.id);
            });
        }

        return enableVirtualization ? filteredTasks : filteredTasks.slice(0, maxVisibleTasks);
    }, [tasks, showCompleted, maxVisibleTasks, enableVirtualization]);

    // Memoized task statistics
    const taskStats = useMemo(() => {
        const stats = {
            pending: 0,
            uploading: 0,
            paused: 0,
            completed: 0,
            failed: 0,
            cancelled: 0
        };

        tasks.forEach(task => {
            stats[task.status]++;
        });

        return stats;
    }, [tasks]);

    // Memoized item data for virtualized list
    const itemData = useMemo<TaskItemData>(() => ({
        tasks: visibleTasks,
        onTaskAction,
        lastUpdate,
    }), [visibleTasks, onTaskAction, lastUpdate]);

    // Reset scroll position when tasks change significantly
    useEffect(() => {
        if (listRef.current && tasks.length === 0) {
            listRef.current.scrollToItem(0);
        }
    }, [tasks.length]);

    if (tasks.length === 0) {
        return (
            <div className={`upload-queue ${className}`}>
                <div className="text-center py-8">
                    <svg
                        className="w-12 h-12 text-gray-400 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4"
                        />
                    </svg>
                    <p className="text-gray-500">No uploads in queue</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`upload-queue ${className}`}>
            {/* Queue header with controls */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">
                        Upload Queue ({tasks.length})
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>Active: {taskStats.uploading}</span>
                        <span>Pending: {taskStats.pending}</span>
                        <span>Completed: {taskStats.completed}</span>
                        <span>Failed: {taskStats.failed}</span>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {taskStats.pending > 0 && taskStats.uploading === 0 && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={startAllUploads}
                        >
                            Start All
                        </Button>
                    )}

                    {taskStats.uploading > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={pauseAllUploads}
                        >
                            Pause All
                        </Button>
                    )}

                    {taskStats.failed > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={retryFailedUploads}
                        >
                            Retry Failed
                        </Button>
                    )}

                    {taskStats.completed > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCompleted}
                        >
                            Clear Completed
                        </Button>
                    )}

                    <Button
                        variant="danger"
                        size="sm"
                        onClick={clearAll}
                    >
                        Clear All
                    </Button>
                </div>
            </div>

            {/* Overall progress */}
            {tasks.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            Overall Progress
                        </span>
                        <span className="text-sm text-gray-500">
                            {formatFileSize(statistics.uploadedBytes)} / {formatFileSize(statistics.totalBytes)}
                        </span>
                    </div>
                    <ProgressBar
                        value={queue.totalProgress}
                        color="primary"
                        size="md"
                        showLabel
                    />
                    {queue.overallSpeed > 0 && (
                        <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                            <span>Speed: {formatFileSize(queue.overallSpeed)}/s</span>
                            <span>
                                ETA: {formatDuration(
                                    (statistics.totalBytes - statistics.uploadedBytes) / queue.overallSpeed
                                )}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Task list - virtualized or regular */}
            <div className="space-y-3">
                {enableVirtualization && visibleTasks.length > 20 ? (
                    <div style={{ height: Math.min(visibleTasks.length * itemHeight, 600) }}>
                        <List
                            ref={listRef}
                            height={Math.min(visibleTasks.length * itemHeight, 600)}
                            itemCount={visibleTasks.length}
                            itemSize={itemHeight}
                            itemData={itemData}
                            overscanCount={2}
                            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                        >
                            {UploadTaskRow}
                        </List>
                    </div>
                ) : (
                    visibleTasks.map((task) => (
                        <UploadTaskItem
                            key={task.id}
                            task={task}
                            onAction={onTaskAction}
                            lastUpdate={lastUpdate}
                        />
                    ))
                )}
            </div>

            {/* Show more indicator */}
            {!enableVirtualization && tasks.length > maxVisibleTasks && (
                <div className="text-center mt-4 py-2 text-sm text-gray-500">
                    Showing {maxVisibleTasks} of {tasks.length} tasks
                </div>
            )}

            {/* Performance stats in development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 p-2 border-t">
                    Updates: {updateCountRef.current} |
                    Virtualized: {enableVirtualization ? 'Yes' : 'No'} |
                    Visible: {visibleTasks.length} / {tasks.length}
                </div>
            )}
        </div>
    );
};

// Individual upload task item component (unchanged from original)
interface UploadTaskItemProps {
    task: UploadTask;
    onAction?: (taskId: string, action: string) => void;
    lastUpdate?: number;
}

const UploadTaskItem: React.FC<UploadTaskItemProps> = ({ task, onAction, lastUpdate }) => {
    const {
        startUpload,
        pauseUpload,
        resumeUpload,
        cancelUpload,
        retryUpload,
        removeTask
    } = useUploadStore();

    const getStatusColor = (status: UploadStatus): 'primary' | 'success' | 'warning' | 'danger' => {
        switch (status) {
            case 'uploading':
                return 'primary';
            case 'completed':
                return 'success';
            case 'paused':
                return 'warning';
            case 'failed':
            case 'cancelled':
                return 'danger';
            default:
                return 'primary';
        }
    };

    const getStatusIcon = (status: UploadStatus) => {
        switch (status) {
            case 'pending':
                return (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'uploading':
                return (
                    <div className="w-4 h-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                );
            case 'paused':
                return (
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'completed':
                return (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'cancelled':
                return (
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const handleAction = useCallback((action: string) => {
        // Call external handler if provided
        if (onAction) {
            onAction(task.id, action);
        }

        // Execute the action
        switch (action) {
            case 'start':
                startUpload(task.id);
                break;
            case 'pause':
                pauseUpload(task.id);
                break;
            case 'resume':
                resumeUpload(task.id);
                break;
            case 'cancel':
                cancelUpload(task.id);
                break;
            case 'retry':
                retryUpload(task.id);
                break;
            case 'remove':
                removeTask(task.id);
                break;
        }
    }, [task.id, onAction, startUpload, pauseUpload, resumeUpload, cancelUpload, retryUpload, removeTask]);

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {task.file.name}
                            </p>
                            {task.isMultipart && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Multipart
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            {task.key} • {formatFileSize(task.file.size)}
                            {task.isMultipart && task.resumeData && (
                                <span className="ml-2 text-blue-600">
                                    • {task.resumeData.completedParts.length}/{task.resumeData.totalParts} parts
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {task.status === 'pending' && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAction('start')}
                        >
                            Start
                        </Button>
                    )}

                    {task.status === 'uploading' && (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAction('pause')}
                            >
                                Pause
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleAction('cancel')}
                            >
                                Cancel
                            </Button>
                        </>
                    )}

                    {task.status === 'paused' && (
                        <>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAction('resume')}
                            >
                                Resume
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleAction('cancel')}
                            >
                                Cancel
                            </Button>
                        </>
                    )}

                    {task.status === 'failed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('retry')}
                        >
                            Retry ({task.retryCount}/{task.maxRetries})
                        </Button>
                    )}

                    {(task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction('remove')}
                        >
                            Remove
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {(task.status === 'uploading' || task.status === 'paused' || task.progress > 0) && (
                <div className="mb-3">
                    <ProgressBar
                        value={task.progress}
                        color={getStatusColor(task.status)}
                        size="sm"
                        showLabel
                    />
                </div>
            )}

            {/* Upload details */}
            <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                    <span className="capitalize">{task.status}</span>
                    {task.status === 'uploading' && task.speed && task.speed > 0 && (
                        <span>{formatFileSize(task.speed)}/s</span>
                    )}
                    {task.status === 'uploading' && task.estimatedTimeRemaining && task.estimatedTimeRemaining > 0 && (
                        <span>ETA: {formatDuration(task.estimatedTimeRemaining)}</span>
                    )}
                </div>

                <div>
                    {task.uploadedBytes > 0 && (
                        <span>
                            {formatFileSize(task.uploadedBytes)} / {formatFileSize(task.totalBytes)}
                        </span>
                    )}
                </div>
            </div>

            {/* Error message */}
            {task.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <svg
                            className="w-4 h-4 text-red-400 mr-2 mt-0.5 flex-shrink-0"
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
                        <p className="text-sm text-red-700">{task.error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Utility functions
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}