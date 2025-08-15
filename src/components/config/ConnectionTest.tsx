import React, { useState, useEffect, useCallback } from 'react';
import { S3Config, ConnectionTestResult } from '../../types/config';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { StatusIndicator } from '../common/StatusIndicator';
import { ConnectionDiagnostics } from './ConnectionDiagnostics';

interface ConnectionTestProps {
    config: S3Config;
    onTest: (config: S3Config) => Promise<ConnectionTestResult>;
    className?: string;
    showDiagnostics?: boolean;
    autoTest?: boolean;
    realTimeUpdates?: boolean;
    onStatusChange?: (status: 'testing' | 'success' | 'error' | 'unknown') => void;
    showAdvancedDiagnostics?: boolean;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({
    config,
    onTest,
    className = '',
    showDiagnostics = true,
    autoTest = false,
    realTimeUpdates = false,
    onStatusChange,
    showAdvancedDiagnostics = false,
}) => {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
    const [testProgress, setTestProgress] = useState<TestStep[]>([]);
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [testHistory, setTestHistory] = useState<ConnectionTestResult[]>([]);

    const testSteps: TestStep[] = [
        { id: 'network', label: '检查网络连接', status: 'pending', description: '验证网络连通性和DNS解析' },
        { id: 'auth', label: '验证访问密钥', status: 'pending', description: '验证AWS凭据有效性' },
        { id: 'bucket', label: '验证存储桶访问', status: 'pending', description: '检查存储桶是否存在且可访问' },
        { id: 'permissions', label: '检查权限', status: 'pending', description: '测试读写权限' },
        { id: 'info', label: '获取存储桶信息', status: 'pending', description: '收集存储桶详细信息' },
    ];

    // Auto test effect
    useEffect(() => {
        if (autoTest && !testing && !testResult) {
            handleTest();
        }
    }, [autoTest, testing, testResult]);

    // Real-time status updates
    useEffect(() => {
        if (realTimeUpdates && onStatusChange) {
            const status = getOverallStatus();
            onStatusChange(status);
        }
    }, [testing, testResult, realTimeUpdates, onStatusChange]);

    // Periodic connection health check
    useEffect(() => {
        if (realTimeUpdates && testResult?.success && !testing) {
            const interval = setInterval(async () => {
                try {
                    const quickResult = await onTest(config);
                    if (quickResult.success !== testResult.success) {
                        setTestResult(quickResult);
                    }
                } catch (error) {
                    // Ignore errors in background checks
                }
            }, 30000); // Check every 30 seconds

            return () => clearInterval(interval);
        }
    }, [realTimeUpdates, testResult, testing, config, onTest]);

    const handleTest = useCallback(async () => {
        setTesting(true);
        setTestResult(null);
        setCurrentStep(null);
        setTestProgress(testSteps.map(step => ({ ...step, status: 'pending' })));

        const startTime = Date.now();

        try {
            // Step 1: Network connectivity
            setCurrentStep('network');
            setTestProgress(prev => updateStepStatus(prev, 'network', 'running'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Step 2: Authentication
            setCurrentStep('auth');
            setTestProgress(prev => updateStepStatus(prev, 'auth', 'running'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Step 3: Bucket access
            setCurrentStep('bucket');
            setTestProgress(prev => updateStepStatus(prev, 'bucket', 'running'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Step 4: Permissions check
            setCurrentStep('permissions');
            setTestProgress(prev => updateStepStatus(prev, 'permissions', 'running'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Step 5: Bucket info
            setCurrentStep('info');
            setTestProgress(prev => updateStepStatus(prev, 'info', 'running'));

            // Perform actual test
            const result = await onTest(config);

            // Update steps based on result
            if (result.success) {
                setTestProgress(prev => prev.map(step => ({ ...step, status: 'success' })));
            } else {
                // Determine which steps failed based on error
                const errorCode = result.error?.code || '';
                const failedSteps = getFailedSteps(errorCode);

                setTestProgress(prev => prev.map(step => ({
                    ...step,
                    status: failedSteps.includes(step.id) ? 'error' :
                        step.status === 'running' ? 'error' : 'success'
                })));
            }

            // Add to test history
            setTestHistory(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
            setTestResult(result);
        } catch (error) {
            // Mark all steps as failed
            setTestProgress(prev => prev.map(step => ({ ...step, status: 'error' })));

            const errorResult: ConnectionTestResult = {
                success: false,
                duration: Date.now() - startTime,
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
            setTestHistory(prev => [errorResult, ...prev.slice(0, 4)]);
            setTestResult(errorResult);
        } finally {
            setTesting(false);
            setCurrentStep(null);
        }
    }, [config, onTest]);

    const updateStepStatus = (steps: TestStep[], stepId: string, status: TestStepStatus): TestStep[] => {
        return steps.map(step =>
            step.id === stepId ? { ...step, status } : step
        );
    };

    const getFailedSteps = (errorCode: string): string[] => {
        switch (errorCode) {
            case 'NetworkError':
            case 'ENOTFOUND':
            case 'ECONNREFUSED':
                return ['network'];
            case 'InvalidAccessKeyId':
            case 'SignatureDoesNotMatch':
                return ['network', 'auth'];
            case 'NoSuchBucket':
                return ['network', 'auth', 'bucket'];
            case 'AccessDenied':
                return ['network', 'auth', 'bucket', 'permissions'];
            default:
                return ['network', 'auth', 'bucket', 'permissions', 'info'];
        }
    };

    const getOverallStatus = (): 'success' | 'error' | 'testing' | 'unknown' => {
        if (testing) return 'testing';
        if (!testResult) return 'unknown';
        return testResult.success ? 'success' : 'error';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'green';
            case 'error': return 'red';
            case 'testing': return 'yellow';
            default: return 'gray';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'success': return '连接成功';
            case 'error': return '连接失败';
            case 'testing': return '测试中';
            default: return '未测试';
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Test Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <StatusIndicator
                        status={getStatusColor(getOverallStatus())}
                        size="md"
                    />
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">连接测试</h3>
                        <p className="text-sm text-gray-600">
                            {getStatusText(getOverallStatus())}
                            {testResult && ` (耗时: ${testResult.duration}ms)`}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleTest}
                    disabled={testing}
                    variant={testResult?.success ? 'outline' : 'primary'}
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
                            {testResult ? '重新测试' : '开始测试'}
                        </>
                    )}
                </Button>
            </div>

            {/* Test Progress */}
            {(testing || testProgress.length > 0) && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">测试进度</h4>
                        {testing && currentStep && (
                            <div className="flex items-center text-sm text-blue-600">
                                <LoadingSpinner size="sm" className="mr-2" />
                                正在执行: {testSteps.find(s => s.id === currentStep)?.label}
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        {testProgress.map((step) => (
                            <TestStepItem
                                key={step.id}
                                step={step}
                                isActive={currentStep === step.id}
                                showDescription={showAdvancedDiagnostics}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Test Results */}
            {testResult && showDiagnostics && (
                <ConnectionDiagnostics
                    result={testResult}
                    showAdvanced={showAdvancedDiagnostics}
                />
            )}

            {/* Test History */}
            {showAdvancedDiagnostics && testHistory.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">测试历史</h4>
                    <div className="space-y-2">
                        {testHistory.map((result, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <StatusIndicator
                                        status={result.success ? 'green' : 'red'}
                                        size="sm"
                                    />
                                    <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                                        {result.success ? '成功' : '失败'}
                                    </span>
                                </div>
                                <div className="text-gray-600">
                                    {formatDuration(result.duration)} • {getRelativeTime(index)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            {testResult && !testResult.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-800 mb-1">连接失败</h4>
                            <p className="text-sm text-red-700 mb-3">
                                {testResult.error?.message || '无法连接到 S3 服务'}
                            </p>
                            {testResult.error?.suggestions && testResult.error.suggestions.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-red-800 mb-1">建议解决方案:</p>
                                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                                        {testResult.error.suggestions.map((suggestion, index) => (
                                            <li key={index}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface TestStep {
    id: string;
    label: string;
    status: TestStepStatus;
    description?: string;
}

type TestStepStatus = 'pending' | 'running' | 'success' | 'error';

interface TestStepItemProps {
    step: TestStep;
    isActive?: boolean;
    showDescription?: boolean;
}

const TestStepItem: React.FC<TestStepItemProps> = ({ step, isActive = false, showDescription = false }) => {
    const getStepIcon = (status: TestStepStatus) => {
        switch (status) {
            case 'running':
                return <LoadingSpinner size="sm" />;
            case 'success':
                return (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                );
        }
    };

    const getStepTextColor = (status: TestStepStatus) => {
        switch (status) {
            case 'running': return 'text-blue-600';
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className={`flex items-start gap-3 p-2 rounded ${isActive ? 'bg-blue-50 border border-blue-200' : ''}`}>
            <div className="mt-0.5">
                {getStepIcon(step.status)}
            </div>
            <div className="flex-1">
                <div className={`text-sm font-medium ${getStepTextColor(step.status)}`}>
                    {step.label}
                    {isActive && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">
                            (进行中...)
                        </span>
                    )}
                </div>
                {showDescription && step.description && (
                    <div className="text-xs text-gray-500 mt-1">
                        {step.description}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper functions
const formatDuration = (duration: number): string => {
    if (duration < 1000) {
        return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(1)}s`;
};

const getRelativeTime = (index: number): string => {
    if (index === 0) return '刚刚';
    if (index === 1) return '上次';
    return `${index + 1}次前`;
};

export default ConnectionTest;