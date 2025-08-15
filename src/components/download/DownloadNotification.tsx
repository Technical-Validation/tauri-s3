import React, { useState, useEffect } from 'react';
import { DownloadTask } from '../../types/download';
import { formatBytes } from '../../utils/formatters';

interface DownloadNotificationProps {
    task: DownloadTask;
    onClose: () => void;
    autoClose?: boolean;
    autoCloseDelay?: number;
}

export const DownloadNotification: React.FC<DownloadNotificationProps> = ({
    task,
    onClose,
    autoClose = true,
    autoCloseDelay = 5000
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (autoClose && (task.status === 'completed' || task.status === 'failed')) {
            const timer = setTimeout(() => {
                handleClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [task.status, autoClose, autoCloseDelay]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const getNotificationStyle = () => {
        switch (task.status) {
            case 'completed':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'failed':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'downloading':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            case 'paused':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    const getIcon = () => {
        switch (task.status) {
            case 'completed':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'downloading':
                return (
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                );
            case 'paused':
                return (
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getTitle = () => {
        switch (task.status) {
            case 'completed':
                return '下载完成';
            case 'failed':
                return '下载失败';
            case 'downloading':
                return '正在下载';
            case 'paused':
                return '下载已暂停';
            default:
                return '下载通知';
        }
    };

    const getMessage = () => {
        switch (task.status) {
            case 'completed':
                return `${task.fileName} 已成功下载到 ${task.localPath}`;
            case 'failed':
                return `${task.fileName} 下载失败: ${task.error || '未知错误'}`;
            case 'downloading':
                return `${task.fileName} 正在下载中 (${Math.round(task.progress)}%)`;
            case 'paused':
                return `${task.fileName} 下载已暂停`;
            default:
                return `${task.fileName} 状态更新`;
        }
    };

    const handleOpenFile = () => {
        if (task.status === 'completed' && task.localPath) {
            // In a real Tauri app, you would use the shell API to open the file
            console.log('Opening file:', task.localPath);
        }
    };

    const handleOpenFolder = () => {
        if (task.localPath) {
            // In a real Tauri app, you would use the shell API to open the folder
            const folderPath = task.localPath.substring(0, task.localPath.lastIndexOf('/'));
            console.log('Opening folder:', folderPath);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={`
                fixed top-4 right-4 max-w-sm w-full bg-white rounded-lg border shadow-lg z-50
                transform transition-all duration-300 ease-in-out
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                ${getNotificationStyle()}
            `}
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {getIcon()}
                    </div>
                    <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium">
                            {getTitle()}
                        </h3>
                        <p className="mt-1 text-sm opacity-90">
                            {getMessage()}
                        </p>

                        {task.status === 'downloading' && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs opacity-75 mb-1">
                                    <span>{formatBytes(task.downloadedBytes)}</span>
                                    <span>{formatBytes(task.totalBytes)}</span>
                                </div>
                                <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5">
                                    <div
                                        className="bg-current h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {task.status === 'completed' && (
                            <div className="mt-3 flex space-x-2">
                                <button
                                    onClick={handleOpenFile}
                                    className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                                >
                                    打开文件
                                </button>
                                <button
                                    onClick={handleOpenFolder}
                                    className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                                >
                                    打开文件夹
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                        <button
                            onClick={handleClose}
                            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface DownloadNotificationManagerProps {
    tasks: DownloadTask[];
    maxNotifications?: number;
}

export const DownloadNotificationManager: React.FC<DownloadNotificationManagerProps> = ({
    tasks,
    maxNotifications = 3
}) => {
    const [notifications, setNotifications] = useState<DownloadTask[]>([]);

    useEffect(() => {
        // Show notifications for tasks that just completed or failed
        const newNotifications = tasks.filter(task =>
            (task.status === 'completed' || task.status === 'failed') &&
            !notifications.find(n => n.id === task.id)
        );

        if (newNotifications.length > 0) {
            setNotifications(prev => {
                const updated = [...prev, ...newNotifications];
                // Keep only the most recent notifications
                return updated.slice(-maxNotifications);
            });
        }
    }, [tasks, notifications, maxNotifications]);

    const handleCloseNotification = (taskId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== taskId));
    };

    return (
        <div className="fixed top-4 right-4 space-y-2 z-50">
            {notifications.map((task, index) => (
                <div
                    key={task.id}
                    style={{ transform: `translateY(${index * 10}px)` }}
                >
                    <DownloadNotification
                        task={task}
                        onClose={() => handleCloseNotification(task.id)}
                    />
                </div>
            ))}
        </div>
    );
};