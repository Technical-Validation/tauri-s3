import React, { useState, useMemo } from 'react';
import { useDownloadStore } from '../../stores/downloadStore';
import { DownloadProgress } from './DownloadProgress';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { formatBytes } from '../../utils/formatters';
import { DownloadStatus } from '../../types/download';

interface DownloadQueueProps {
    className?: string;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({ className = '' }) => {
    const {
        tasks,
        queue,
        statistics,
        startDownload,
        startAllDownloads,
        pauseDownload,
        pauseAllDownloads,
        resumeDownload,
        resumeAllDownloads,
        cancelDownload,
        cancelAllDownloads,
        retryDownload,
        retryFailedDownloads,
        removeTask,
        clearCompleted,
        clearFailed,
        clearAll,
        getTasksByStatus,
    } = useDownloadStore();

    const [filter, setFilter] = useState<DownloadStatus | 'all'>('all');
    const [isCompact, setIsCompact] = useState(false);

    // Filter tasks based on selected filter
    const filteredTasks = useMemo(() => {
        if (filter === 'all') {
            return tasks;
        }
        return getTasksByStatus(filter);
    }, [tasks, filter, getTasksByStatus]);

    // Calculate filter counts
    const filterCounts = useMemo(() => {
        return {
            all: tasks.length,
            pending: getTasksByStatus('pending').length,
            downloading: getTasksByStatus('downloading').length,
            completed: getTasksByStatus('completed').length,
            failed: getTasksByStatus('failed').length,
            paused: getTasksByStatus('paused').length,
            cancelled: getTasksByStatus('cancelled').length,
        };
    }, [tasks, getTasksByStatus]);

    const hasActiveTasks = filterCounts.downloading > 0;
    const hasPendingTasks = filterCounts.pending > 0;
    const hasPausedTasks = filterCounts.paused > 0;
    const hasFailedTasks = filterCounts.failed > 0;
    const hasCompletedTasks = filterCounts.completed > 0;

    const handleStartAll = async () => {
        await startAllDownloads();
    };

    const handlePauseAll = () => {
        pauseAllDownloads();
    };

    const handleResumeAll = async () => {
        await resumeAllDownloads();
    };

    const handleCancelAll = () => {
        cancelAllDownloads();
    };

    const handleRetryFailed = async () => {
        await retryFailedDownloads();
    };

    const handleClearCompleted = () => {
        clearCompleted();
    };

    const handleClearFailed = () => {
        clearFailed();
    };

    const handleClearAll = () => {
        if (window.confirm('确定要清除所有下载任务吗？这将取消正在进行的下载。')) {
            clearAll();
        }
    };

    const renderFilterTabs = () => {
        const filters: Array<{ key: DownloadStatus | 'all'; label: string; count: number }> = [
            { key: 'all', label: '全部', count: filterCounts.all },
            { key: 'downloading', label: '下载中', count: filterCounts.downloading },
            { key: 'pending', label: '等待中', count: filterCounts.pending },
            { key: 'paused', label: '已暂停', count: filterCounts.paused },
            { key: 'completed', label: '已完成', count: filterCounts.completed },
            { key: 'failed', label: '失败', count: filterCounts.failed },
            { key: 'cancelled', label: '已取消', count: filterCounts.cancelled },
        ];

        return (
            <div className="flex space-x-1 mb-4">
                {filters.map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === key
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const renderToolbar = () => {
        return (
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                    {hasPendingTasks && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleStartAll}
                            disabled={hasActiveTasks && queue.activeDownloads >= queue.maxConcurrentDownloads}
                        >
                            开始全部
                        </Button>
                    )}
                    {hasActiveTasks && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handlePauseAll}
                        >
                            暂停全部
                        </Button>
                    )}
                    {hasPausedTasks && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleResumeAll}
                        >
                            继续全部
                        </Button>
                    )}
                    {(hasActiveTasks || hasPendingTasks || hasPausedTasks) && (
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleCancelAll}
                        >
                            取消全部
                        </Button>
                    )}
                    {hasFailedTasks && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleRetryFailed}
                        >
                            重试失败
                        </Button>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {hasCompletedTasks && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleClearCompleted}
                        >
                            清除已完成
                        </Button>
                    )}
                    {hasFailedTasks && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleClearFailed}
                        >
                            清除失败
                        </Button>
                    )}
                    {tasks.length > 0 && (
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleClearAll}
                        >
                            清除全部
                        </Button>
                    )}
                    <button
                        onClick={() => setIsCompact(!isCompact)}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded"
                        title={isCompact ? '详细视图' : '紧凑视图'}
                    >
                        {isCompact ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    const renderOverallProgress = () => {
        if (tasks.length === 0) return null;

        return (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-blue-900">总体进度</h3>
                    <span className="text-sm text-blue-700">
                        {Math.round(queue.totalProgress)}%
                    </span>
                </div>
                <ProgressBar
                    value={queue.totalProgress}
                    className="h-2 mb-2"
                    showPercentage={false}
                />
                <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                    <div>
                        <span>已下载: </span>
                        <span className="font-medium">
                            {formatBytes(statistics.downloadedBytes)} / {formatBytes(statistics.totalBytes)}
                        </span>
                    </div>
                    <div>
                        <span>活跃下载: </span>
                        <span className="font-medium">
                            {queue.activeDownloads} / {queue.maxConcurrentDownloads}
                        </span>
                    </div>
                    <div>
                        <span>完成: </span>
                        <span className="font-medium">
                            {statistics.completedFiles} / {statistics.totalFiles}
                        </span>
                    </div>
                    {queue.overallSpeed > 0 && (
                        <div>
                            <span>总速度: </span>
                            <span className="font-medium">
                                {formatBytes(queue.overallSpeed)}/s
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTaskList = () => {
        if (filteredTasks.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    {filter === 'all' ? '暂无下载任务' : `暂无${filter}状态的任务`}
                </div>
            );
        }

        return (
            <div className={`space-y-${isCompact ? '2' : '4'}`}>
                {filteredTasks.map((task) => (
                    <DownloadProgress
                        key={task.id}
                        task={task}
                        compact={isCompact}
                        onPause={pauseDownload}
                        onResume={resumeDownload}
                        onCancel={cancelDownload}
                        onRetry={retryDownload}
                        onRemove={removeTask}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">下载队列</h2>
            </div>

            <div className="p-4">
                {renderFilterTabs()}
                {renderToolbar()}
                {renderOverallProgress()}
                {renderTaskList()}
            </div>
        </div>
    );
};