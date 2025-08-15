import React from 'react';
import { DownloadTask } from '../../types/download';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';
import { formatBytes, formatDuration } from '../../utils/formatters';

interface DownloadProgressProps {
    task: DownloadTask;
    onPause?: (taskId: string) => void;
    onResume?: (taskId: string) => void;
    onCancel?: (taskId: string) => void;
    onRetry?: (taskId: string) => void;
    onRemove?: (taskId: string) => void;
    compact?: boolean;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
    task,
    onPause,
    onResume,
    onCancel,
    onRetry,
    onRemove,
    compact = false
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'downloading':
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

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return '等待中';
            case 'downloading':
                return '下载中';
            case 'completed':
                return '已完成';
            case 'failed':
                return '失败';
            case 'paused':
                return '已暂停';
            case 'cancelled':
                return '已取消';
            default:
                return status;
        }
    };

    const formatSpeed = (bytesPerSecond: number) => {
        if (bytesPerSecond === 0) return '0 B/s';
        return `${formatBytes(bytesPerSecond)}/s`;
    };

    const formatETA = (seconds: number) => {
        if (!seconds || seconds === Infinity) return '--';
        return formatDuration(seconds);
    };

    const renderActions = () => {
        const actions = [];

        switch (task.status) {
            case 'pending':
            case 'downloading':
                if (onPause) {
                    actions.push(
                        <Button
                            key="pause"
                            variant="secondary"
                            size="sm"
                            onClick={() => onPause(task.id)}
                            className="px-2 py-1"
                        >
                            暂停
                        </Button>
                    );
                }
                if (onCancel) {
                    actions.push(
                        <Button
                            key="cancel"
                            variant="danger"
                            size="sm"
                            onClick={() => onCancel(task.id)}
                            className="px-2 py-1"
                        >
                            取消
                        </Button>
                    );
                }
                break;

            case 'paused':
                if (onResume) {
                    actions.push(
                        <Button
                            key="resume"
                            variant="primary"
                            size="sm"
                            onClick={() => onResume(task.id)}
                            className="px-2 py-1"
                        >
                            继续
                        </Button>
                    );
                }
                if (onCancel) {
                    actions.push(
                        <Button
                            key="cancel"
                            variant="danger"
                            size="sm"
                            onClick={() => onCancel(task.id)}
                            className="px-2 py-1"
                        >
                            取消
                        </Button>
                    );
                }
                break;

            case 'failed':
                if (onRetry && task.retryCount < task.maxRetries) {
                    actions.push(
                        <Button
                            key="retry"
                            variant="primary"
                            size="sm"
                            onClick={() => onRetry(task.id)}
                            className="px-2 py-1"
                        >
                            重试
                        </Button>
                    );
                }
                if (onRemove) {
                    actions.push(
                        <Button
                            key="remove"
                            variant="secondary"
                            size="sm"
                            onClick={() => onRemove(task.id)}
                            className="px-2 py-1"
                        >
                            移除
                        </Button>
                    );
                }
                break;

            case 'completed':
            case 'cancelled':
                if (onRemove) {
                    actions.push(
                        <Button
                            key="remove"
                            variant="secondary"
                            size="sm"
                            onClick={() => onRemove(task.id)}
                            className="px-2 py-1"
                        >
                            移除
                        </Button>
                    );
                }
                break;
        }

        return actions;
    };

    if (compact) {
        return (
            <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {task.fileName}
                        </p>
                        <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusText(task.status)}
                        </span>
                    </div>
                    <ProgressBar
                        value={task.progress}
                        className="h-1"
                        showPercentage={false}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>
                            {formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}
                        </span>
                        {task.status === 'downloading' && task.speed && (
                            <span>{formatSpeed(task.speed)}</span>
                        )}
                    </div>
                </div>
                <div className="flex space-x-1">
                    {renderActions()}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                        {task.fileName}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                        {task.key}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                    </span>
                    <div className="flex space-x-1">
                        {renderActions()}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <ProgressBar
                    value={task.progress}
                    className="h-2"
                    showPercentage={true}
                />

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">大小:</span>
                        <span className="ml-2 font-medium">
                            {formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}
                        </span>
                    </div>
                    {task.status === 'downloading' && task.speed && (
                        <div>
                            <span className="text-gray-500">速度:</span>
                            <span className="ml-2 font-medium">
                                {formatSpeed(task.speed)}
                            </span>
                        </div>
                    )}
                    {task.status === 'downloading' && task.estimatedTimeRemaining && (
                        <div>
                            <span className="text-gray-500">剩余时间:</span>
                            <span className="ml-2 font-medium">
                                {formatETA(task.estimatedTimeRemaining)}
                            </span>
                        </div>
                    )}
                    {task.startTime && (
                        <div>
                            <span className="text-gray-500">开始时间:</span>
                            <span className="ml-2 font-medium">
                                {task.startTime.toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                    {task.endTime && (
                        <div>
                            <span className="text-gray-500">完成时间:</span>
                            <span className="ml-2 font-medium">
                                {task.endTime.toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                    {task.error && (
                        <div className="col-span-2">
                            <span className="text-gray-500">错误:</span>
                            <span className="ml-2 text-red-600">
                                {task.error}
                            </span>
                        </div>
                    )}
                </div>

                {task.localPath && (
                    <div className="text-sm">
                        <span className="text-gray-500">保存位置:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {task.localPath}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};