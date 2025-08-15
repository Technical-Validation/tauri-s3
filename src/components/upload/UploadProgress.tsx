import React, { useEffect, useState, useCallback } from 'react';
import { ProgressBar } from '../common/ProgressBar';
import { MultipartUploadProgress } from './MultipartUploadProgress';
import { useUploadStore } from '../../stores/uploadStore';
import { UploadTask, UploadStatus } from '../../types/upload';

export interface UploadProgressProps {
    taskId?: string; // If provided, shows progress for specific task
    compact?: boolean;
    showDetails?: boolean;
    className?: string;
    realTimeUpdates?: boolean;
    updateInterval?: number;
    onProgressUpdate?: (progress: number, taskId?: string) => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
    taskId,
    compact = false,
    showDetails = true,
    className = '',
    realTimeUpdates = true,
    updateInterval = 500,
    onProgressUpdate
}) => {
    const { tasks, queue, statistics, getTask } = useUploadStore();
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    // Real-time updates
    useEffect(() => {
        if (!realTimeUpdates) return;

        const interval = setInterval(() => {
            setLastUpdate(Date.now());
        }, updateInterval);

        return () => clearInterval(interval);
    }, [realTimeUpdates, updateInterval]);

    // Progress update callback
    const handleProgressUpdate = useCallback((progress: number, currentTaskId?: string) => {
        if (onProgressUpdate) {
            onProgressUpdate(progress, currentTaskId);
        }
    }, [onProgressUpdate]);

    // If taskId is provided, show progress for specific task
    if (taskId) {
        const task = getTask(taskId);
        if (!task) {
            return null;
        }
        return (
            <TaskProgress
                task={task}
                compact={compact}
                showDetails={showDetails}
                className={className}
                onProgressUpdate={handleProgressUpdate}
                lastUpdate={lastUpdate}
            />
        );
    }

    // Otherwise show overall progress
    return (
        <OverallProgress
            compact={compact}
            showDetails={showDetails}
            className={className}
            onProgressUpdate={handleProgressUpdate}
            lastUpdate={lastUpdate}
        />
    );
};

// Overall progress component
interface OverallProgressProps {
    compact: boolean;
    showDetails: boolean;
    className: string;
    onProgressUpdate?: (progress: number) => void;
    lastUpdate?: number;
}

const OverallProgress: React.FC<OverallProgressProps> = ({
    compact,
    showDetails,
    className,
    onProgressUpdate,
    lastUpdate
}) => {
    const { tasks, queue, statistics } = useUploadStore();

    if (tasks.length === 0) {
        return null;
    }

    const activeTasks = tasks.filter(task => task.status === 'uploading');
    const hasActiveTasks = activeTasks.length > 0;

    // Trigger progress update callback
    useEffect(() => {
        if (onProgressUpdate) {
            onProgressUpdate(queue.totalProgress);
        }
    }, [queue.totalProgress, onProgressUpdate]);

    if (compact) {
        return (
            <div className={`upload-progress-compact ${className}`}>
                <div className="flex items-center space-x-3">
                    <div className="flex-1">
                        <ProgressBar
                            value={queue.totalProgress}
                            color={hasActiveTasks ? 'primary' : 'success'}
                            size="sm"
                        />
                    </div>
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                        {Math.round(queue.totalProgress)}%
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`upload-progress ${className}`}>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                        Upload Progress
                    </h4>
                    <span className="text-sm text-gray-500">
                        {statistics.completedFiles} / {statistics.totalFiles} files
                    </span>
                </div>

                <ProgressBar
                    value={queue.totalProgress}
                    color={hasActiveTasks ? 'primary' : 'success'}
                    size="md"
                    showLabel
                />

                {showDetails && (
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Data transferred:</span>
                                <span className="font-medium">
                                    {formatFileSize(statistics.uploadedBytes)} / {formatFileSize(statistics.totalBytes)}
                                </span>
                            </div>
                            {queue.overallSpeed > 0 && (
                                <div className="flex justify-between mt-1">
                                    <span className="text-gray-600">Speed:</span>
                                    <span className="font-medium">{formatFileSize(queue.overallSpeed)}/s</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Active uploads:</span>
                                <span className="font-medium">{queue.activeUploads}</span>
                            </div>
                            {statistics.failedFiles > 0 && (
                                <div className="flex justify-between mt-1">
                                    <span className="text-gray-600">Failed:</span>
                                    <span className="font-medium text-red-600">{statistics.failedFiles}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {hasActiveTasks && showDetails && (
                    <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Active Uploads ({activeTasks.length})
                        </h5>
                        <div className="space-y-2">
                            {activeTasks.slice(0, 3).map((task) => (
                                <ActiveTaskItem key={task.id} task={task} />
                            ))}
                            {activeTasks.length > 3 && (
                                <div className="text-xs text-gray-500 text-center">
                                    +{activeTasks.length - 3} more uploads
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {queue.overallSpeed > 0 && statistics.totalBytes > statistics.uploadedBytes && (
                    <div className="mt-3 text-sm text-gray-600 text-center">
                        Estimated time remaining: {formatDuration(
                            (statistics.totalBytes - statistics.uploadedBytes) / queue.overallSpeed
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Individual task progress component
interface TaskProgressProps {
    task: UploadTask;
    compact: boolean;
    showDetails: boolean;
    className: string;
    onProgressUpdate?: (progress: number, taskId: string) => void;
    lastUpdate?: number;
}

const TaskProgress: React.FC<TaskProgressProps> = ({
    task,
    compact,
    showDetails,
    className,
    onProgressUpdate,
    lastUpdate
}) => {
    // Use specialized multipart progress component for multipart uploads
    if (task.isMultipart && !compact) {
        return (
            <MultipartUploadProgress
                task={task}
                className={className}
            />
        );
    }
    const getProgressColor = (status: UploadStatus): 'primary' | 'success' | 'warning' | 'danger' => {
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

    // Trigger progress update callback
    useEffect(() => {
        if (onProgressUpdate) {
            onProgressUpdate(task.progress, task.id);
        }
    }, [task.progress, task.id, onProgressUpdate]);

    if (compact) {
        return (
            <div className={`task-progress-compact ${className}`}>
                <div className="flex items-center space-x-3">
                    <div className="flex-1">
                        <ProgressBar
                            value={task.progress}
                            color={getProgressColor(task.status)}
                            size="sm"
                        />
                    </div>
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                        {Math.round(task.progress)}%
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`task-progress ${className}`}>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                            {task.file.name}
                        </h4>
                        <p className="text-sm text-gray-500">{task.key}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                            {task.status}
                        </div>
                        <div className="text-sm text-gray-500">
                            {formatFileSize(task.file.size)}
                        </div>
                    </div>
                </div>

                <ProgressBar
                    value={task.progress}
                    color={getProgressColor(task.status)}
                    size="md"
                    showLabel
                />

                {showDetails && (
                    <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Uploaded:</span>
                            <span className="font-medium">
                                {formatFileSize(task.uploadedBytes)} / {formatFileSize(task.totalBytes)}
                            </span>
                        </div>

                        {task.status === 'uploading' && (
                            <>
                                {task.speed && task.speed > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Speed:</span>
                                        <span className="font-medium">{formatFileSize(task.speed)}/s</span>
                                    </div>
                                )}

                                {task.estimatedTimeRemaining && task.estimatedTimeRemaining > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Time remaining:</span>
                                        <span className="font-medium">{formatDuration(task.estimatedTimeRemaining)}</span>
                                    </div>
                                )}
                            </>
                        )}

                        {task.startTime && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Started:</span>
                                <span className="font-medium">{formatTime(task.startTime)}</span>
                            </div>
                        )}

                        {task.endTime && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Completed:</span>
                                <span className="font-medium">{formatTime(task.endTime)}</span>
                            </div>
                        )}

                        {task.status === 'failed' && task.retryCount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Retry attempts:</span>
                                <span className="font-medium">{task.retryCount} / {task.maxRetries}</span>
                            </div>
                        )}
                    </div>
                )}

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
                            <div>
                                <p className="text-sm font-medium text-red-800">Upload failed</p>
                                <p className="text-sm text-red-700 mt-1">{task.error}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Active task item for overall progress view
interface ActiveTaskItemProps {
    task: UploadTask;
}

const ActiveTaskItem: React.FC<ActiveTaskItemProps> = ({ task }) => {
    return (
        <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                    {task.file.name}
                </p>
            </div>
            <div className="text-xs text-gray-500">
                {Math.round(task.progress)}%
            </div>
            {task.speed && task.speed > 0 && (
                <div className="text-xs text-gray-500">
                    {formatFileSize(task.speed)}/s
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

function formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}