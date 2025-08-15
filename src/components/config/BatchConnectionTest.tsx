import React, { useState } from 'react';
import { S3Config, ConnectionTestResult } from '../../types/config';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { StatusIndicator } from '../common/StatusIndicator';
import { ProgressBar } from '../common/ProgressBar';

interface BatchConnectionTestProps {
    configs: S3Config[];
    onTestAll: () => Promise<void>;
    onTestConfig: (config: S3Config) => Promise<ConnectionTestResult>;
    className?: string;
    onProgress?: (current: number, total: number) => void;
    showDetailedProgress?: boolean;
    parallelTests?: boolean;
}

export const BatchConnectionTest: React.FC<BatchConnectionTestProps> = ({
    configs,
    onTestAll,
    onTestConfig,
    className = '',
    onProgress,
    showDetailedProgress = false,
    parallelTests = false,
}) => {
    const [testing, setTesting] = useState(false);
    const [currentTestIndex, setCurrentTestIndex] = useState(-1);
    const [testResults, setTestResults] = useState<Map<string, ConnectionTestResult>>(new Map());
    const [testingConfigs, setTestingConfigs] = useState<Set<string>>(new Set());
    const [completedCount, setCompletedCount] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);

    const handleBatchTest = async () => {
        setTesting(true);
        setCurrentTestIndex(0);
        setTestResults(new Map());
        setTestingConfigs(new Set());
        setCompletedCount(0);
        setStartTime(Date.now());

        try {
            if (parallelTests) {
                // Parallel testing with limited concurrency
                const concurrency = Math.min(3, configs.length); // Max 3 concurrent tests
                const chunks = [];
                for (let i = 0; i < configs.length; i += concurrency) {
                    chunks.push(configs.slice(i, i + concurrency));
                }

                for (const chunk of chunks) {
                    const promises = chunk.map(async (config) => {
                        setTestingConfigs(prev => new Set(prev).add(config.id));

                        try {
                            const result = await onTestConfig(config);
                            setTestResults(prev => new Map(prev).set(config.id, result));
                            return result;
                        } catch (error) {
                            const errorResult: ConnectionTestResult = {
                                success: false,
                                duration: 0,
                                details: {
                                    authentication: false,
                                    bucketAccess: false,
                                    permissions: [],
                                },
                                error: {
                                    code: 'TestError',
                                    message: error instanceof Error ? error.message : '测试失败',
                                    suggestions: ['检查网络连接', '验证配置设置'],
                                },
                            };
                            setTestResults(prev => new Map(prev).set(config.id, errorResult));
                            return errorResult;
                        } finally {
                            setTestingConfigs(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(config.id);
                                return newSet;
                            });
                            setCompletedCount(prev => {
                                const newCount = prev + 1;
                                if (onProgress) {
                                    onProgress(newCount, configs.length);
                                }
                                return newCount;
                            });
                        }
                    });

                    await Promise.all(promises);
                }
            } else {
                // Sequential testing
                for (let i = 0; i < configs.length; i++) {
                    setCurrentTestIndex(i);
                    const config = configs[i];
                    setTestingConfigs(new Set([config.id]));

                    try {
                        const result = await onTestConfig(config);
                        setTestResults(prev => new Map(prev).set(config.id, result));
                    } catch (error) {
                        const errorResult: ConnectionTestResult = {
                            success: false,
                            duration: 0,
                            details: {
                                authentication: false,
                                bucketAccess: false,
                                permissions: [],
                            },
                            error: {
                                code: 'TestError',
                                message: error instanceof Error ? error.message : '测试失败',
                                suggestions: ['检查网络连接', '验证配置设置'],
                            },
                        };
                        setTestResults(prev => new Map(prev).set(config.id, errorResult));
                    }

                    setCompletedCount(i + 1);
                    if (onProgress) {
                        onProgress(i + 1, configs.length);
                    }

                    // Small delay between tests to avoid overwhelming the server
                    if (i < configs.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
        } finally {
            setTesting(false);
            setCurrentTestIndex(-1);
            setTestingConfigs(new Set());
        }
    };

    const getTestProgress = () => {
        if (!testing) return 0;
        return (completedCount / configs.length) * 100;
    };

    const getEstimatedTimeRemaining = () => {
        if (!testing || !startTime || completedCount === 0) return null;

        const elapsed = Date.now() - startTime;
        const avgTimePerTest = elapsed / completedCount;
        const remaining = (configs.length - completedCount) * avgTimePerTest;

        return Math.ceil(remaining / 1000); // in seconds
    };

    const getOverallStats = () => {
        const total = testResults.size;
        const successful = Array.from(testResults.values()).filter(result => result.success).length;
        const failed = total - successful;

        return { total, successful, failed };
    };

    const stats = getOverallStats();

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">批量连接测试</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        测试所有配置的连接状态 ({configs.length} 个配置)
                    </p>
                </div>

                <Button
                    onClick={handleBatchTest}
                    disabled={testing || configs.length === 0}
                    variant="primary"
                    size="md"
                >
                    {testing ? (
                        <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            测试中...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            开始批量测试
                        </>
                    )}
                </Button>
            </div>

            {/* Progress */}
            {testing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-sm font-medium text-blue-900">
                                {parallelTests ? '并行测试进行中...' : `正在测试: ${configs[currentTestIndex]?.name}`}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-blue-700">
                                {completedCount} / {configs.length}
                            </div>
                            {getEstimatedTimeRemaining() && (
                                <div className="text-xs text-blue-600">
                                    预计剩余: {getEstimatedTimeRemaining()}秒
                                </div>
                            )}
                        </div>
                    </div>
                    <ProgressBar
                        progress={getTestProgress()}
                        className="h-2"
                        color="blue"
                    />
                    {showDetailedProgress && parallelTests && testingConfigs.size > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="text-xs text-blue-700 mb-2">
                                当前测试中 ({testingConfigs.size}):
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(testingConfigs).map(configId => {
                                    const config = configs.find(c => c.id === configId);
                                    return config ? (
                                        <span key={configId} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                            <LoadingSpinner size="xs" className="mr-1" />
                                            {config.name}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results Summary */}
            {testResults.size > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">测试结果摘要</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            <div className="text-sm text-gray-600">总计</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                            <div className="text-sm text-gray-600">成功</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                            <div className="text-sm text-gray-600">失败</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Results */}
            {testResults.size > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">详细结果</h4>
                    <div className="space-y-2">
                        {configs.map((config) => {
                            const result = testResults.get(config.id);
                            const isTesting = testing && (
                                parallelTests ? testingConfigs.has(config.id) : configs[currentTestIndex]?.id === config.id
                            );

                            return (
                                <BatchTestResultItem
                                    key={config.id}
                                    config={config}
                                    result={result}
                                    isTesting={isTesting}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {configs.length === 0 && (
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">没有配置可测试</h3>
                    <p className="mt-2 text-gray-600">请先添加一些 S3 配置</p>
                </div>
            )}
        </div>
    );
};

interface BatchTestResultItemProps {
    config: S3Config;
    result?: ConnectionTestResult;
    isTesting: boolean;
}

const BatchTestResultItem: React.FC<BatchTestResultItemProps> = ({
    config,
    result,
    isTesting,
}) => {
    const getStatusColor = () => {
        if (isTesting) return 'yellow';
        if (!result) return 'gray';
        return result.success ? 'green' : 'red';
    };

    const getStatusText = () => {
        if (isTesting) return '测试中...';
        if (!result) return '等待测试';
        return result.success ? '连接成功' : '连接失败';
    };

    const formatDuration = (duration: number) => {
        if (duration < 1000) {
            return `${duration}ms`;
        }
        return `${(duration / 1000).toFixed(1)}s`;
    };

    return (
        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
                <StatusIndicator
                    status={getStatusColor()}
                    size="sm"
                />
                <div>
                    <div className="font-medium text-gray-900">{config.name}</div>
                    <div className="text-sm text-gray-600">
                        {config.bucketName} • {config.region}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isTesting && <LoadingSpinner size="sm" />}

                <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                        {getStatusText()}
                    </div>
                    {result && (
                        <div className="text-xs text-gray-500">
                            耗时: {formatDuration(result.duration)}
                        </div>
                    )}
                </div>

                {result && !result.success && result.error && (
                    <div className="max-w-xs">
                        <div className="text-xs text-red-600 truncate" title={result.error.message}>
                            {result.error.message}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatchConnectionTest;