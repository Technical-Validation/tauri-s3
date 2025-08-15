import React from 'react';
import { UploadTask } from '../../types/upload';
import { ProgressBar } from '../common/ProgressBar';
import { formatBytes, formatDuration } from '../../utils/formatters';

interface MultipartUploadProgressProps {
    task: UploadTask;
    className?: string;
}

export const MultipartUploadProgress: React.FC<MultipartUploadProgressProps> = ({
    task,
    className = '',
}) => {
    const isMultipart = task.isMultipart;
    const completedParts = task.uploadedParts?.length || 0;
    const totalParts = task.resumeData?.totalParts || 0;

    const formatSpeed = (bytesPerSecond: number): string => {
        if (bytesPerSecond === 0) return '0 B/s';
        return `${formatBytes(bytesPerSecond)}/s`;
    };

    const formatETA = (seconds: number): string => {
        if (seconds === 0 || !isFinite(seconds)) return '--';
        return formatDuration(seconds);
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'uploading':
                return 'text-blue-600';
            case 'completed':
                return 'text-green-600';
            case 'failed':
                return 'text-red-600';
            case 'paused':
                return 'text-yellow-600';
            case 'cancelled':
                return 'text-gray-600';
            default:
                return 'text-gray-500';
        }
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'uploading':
                return '⬆️';
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            case 'paused':
                return '⏸️';
            case 'cancelled':
                return '🚫';
            default:
                return '⏳';
        }
    };

    return (
        <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(task.status)}</span>
                    <h3 className="font-medium text-gray-900 truncate" title={task.file.name}>
                        {task.file.name}
                    </h3>
                    {isMultipart && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Multipart
                        </span>
                    )}
                </div>
                <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <ProgressBar
                    progress={task.progress}
                    className="h-2"
                    showPercentage={false}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{Math.round(task.progress)}%</span>
                    <span>
                        {formatBytes(task.uploadedBytes)} / {formatBytes(task.totalBytes)}
                    </span>
                </div>
            </div>

            {/* Multipart Details */}
            {isMultipart && totalParts > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Parts Progress:</span>
                        <span>{completedParts} / {totalParts} parts</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${totalParts > 0 ? (completedParts / totalParts) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Upload Stats */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                    <span className="font-medium">Speed:</span>
                    <span className="ml-1">{formatSpeed(task.speed || 0)}</span>
                </div>
                <div>
                    <span className="font-medium">ETA:</span>
                    <span className="ml-1">{formatETA(task.estimatedTimeRemaining || 0)}</span>
                </div>
                {task.retryCount > 0 && (
                    <div className="col-span-2">
                        <span className="font-medium">Retries:</span>
                        <span className="ml-1">{task.retryCount} / {task.maxRetries}</span>
                    </div>
                )}
            </div>

            {/* Resume Information */}
            {task.resumeData && task.status === 'paused' && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="flex items-center text-yellow-800">
                        <span className="mr-1">⏸️</span>
                        <span>
                            Upload paused - {task.resumeData.completedParts.length} of {task.resumeData.totalParts} parts completed
                        </span>
                    </div>
                </div>
            )}

            {/* Error Information */}
            {task.error && task.status === 'failed' && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex items-center text-red-800">
                        <span className="mr-1">❌</span>
                        <span className="truncate" title={task.error}>
                            {task.error}
                        </span>
                    </div>
                </div>
            )}

            {/* Upload Duration */}
            {task.startTime && (
                <div className="mt-2 text-xs text-gray-500">
                    {task.endTime ? (
                        <span>
                            Completed in {formatDuration((task.endTime.getTime() - task.startTime.getTime()) / 1000)}
                        </span>
                    ) : (
                        <span>
                            Started {new Date(task.startTime).toLocaleTimeString()}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultipartUploadProgress;