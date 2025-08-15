import React, { useState, useEffect } from 'react';
import { DownloadQueue, DownloadNotificationManager } from '../components/download';
import { useDownloadStore } from '../stores/downloadStore';
import { useConfigStore } from '../stores/configStore';
import { Button } from '../components/common/Button';
import { formatBytes } from '../utils/formatters';
import { MainContent } from '../components/layout';

export const DownloadsPage: React.FC = () => {
    const {
        tasks,
        statistics,
        options,
        setOptions,
        clearAll,
        resetStatistics,
    } = useDownloadStore();

    const { getActiveConfig } = useConfigStore();
    const [showSettings, setShowSettings] = useState(false);

    const activeConfig = getActiveConfig();

    const handleSettingsChange = (newOptions: Partial<typeof options>) => {
        setOptions(newOptions);
    };

    const handleClearAll = () => {
        if (window.confirm('确定要清除所有下载任务吗？这将取消正在进行的下载。')) {
            clearAll();
        }
    };

    const handleResetStatistics = () => {
        if (window.confirm('确定要重置下载统计吗？')) {
            resetStatistics();
        }
    };



    const renderStatistics = () => {
        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">下载统计</h2>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResetStatistics}
                    >
                        重置统计
                    </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {statistics.totalFiles}
                        </div>
                        <div className="text-sm text-gray-500">总文件数</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {statistics.completedFiles}
                        </div>
                        <div className="text-sm text-gray-500">已完成</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {statistics.failedFiles}
                        </div>
                        <div className="text-sm text-gray-500">失败</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {formatBytes(statistics.downloadedBytes)}
                        </div>
                        <div className="text-sm text-gray-500">已下载</div>
                    </div>
                </div>
                {statistics.averageSpeed > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">平均速度:</span>
                            <span className="font-medium">{formatBytes(statistics.averageSpeed)}/s</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">总用时:</span>
                            <span className="font-medium">{Math.round(statistics.totalTime)}秒</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSettings = () => {
        if (!showSettings) return null;

        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">下载设置</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            最大并发下载数
                        </label>
                        <select
                            value={options.maxConcurrentDownloads}
                            onChange={(e) => handleSettingsChange({
                                maxConcurrentDownloads: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            最大重试次数
                        </label>
                        <select
                            value={options.maxRetries}
                            onChange={(e) => handleSettingsChange({
                                maxRetries: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="overwrite"
                            checked={options.overwrite}
                            onChange={(e) => handleSettingsChange({
                                overwrite: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="overwrite" className="ml-2 text-sm text-gray-700">
                            覆盖已存在的文件
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="resumable"
                            checked={options.resumable}
                            onChange={(e) => handleSettingsChange({
                                resumable: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="resumable" className="ml-2 text-sm text-gray-700">
                            启用断点续传
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="retryOnFailure"
                            checked={options.retryOnFailure}
                            onChange={(e) => handleSettingsChange({
                                retryOnFailure: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="retryOnFailure" className="ml-2 text-sm text-gray-700">
                            失败时自动重试
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="createDirectories"
                            checked={options.createDirectories}
                            onChange={(e) => handleSettingsChange({
                                createDirectories: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="createDirectories" className="ml-2 text-sm text-gray-700">
                            自动创建目录
                        </label>
                    </div>
                </div>
            </div>
        );
    };

    const renderConfigWarning = () => {
        if (activeConfig) return null;

        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                            未配置S3连接
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                            <p>
                                请先在配置页面设置S3连接信息，然后才能开始下载文件。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const actions = (
        <div className="flex items-center space-x-3">
            <Button
                variant="secondary"
                onClick={() => setShowSettings(!showSettings)}
            >
                设置
            </Button>
            {tasks.length > 0 && (
                <Button
                    variant="danger"
                    onClick={handleClearAll}
                >
                    清除全部
                </Button>
            )}
        </div>
    );

    return (
        <>
            <MainContent
                title="下载管理"
                subtitle="管理您的文件下载任务"
                actions={actions}
            >
                {renderConfigWarning()}
                {renderStatistics()}
                {renderSettings()}

                <DownloadQueue />
            </MainContent>

            <DownloadNotificationManager tasks={tasks} />
        </>
    );
};