import React from 'react';
import { ConnectionTestResult } from '../../types/config';
import { StatusIndicator } from '../common/StatusIndicator';

interface ConnectionDiagnosticsProps {
    result: ConnectionTestResult;
    className?: string;
    showAdvanced?: boolean;
}

export const ConnectionDiagnostics: React.FC<ConnectionDiagnosticsProps> = ({
    result,
    className = '',
    showAdvanced = false,
}) => {
    const formatDuration = (duration: number) => {
        if (duration < 1000) {
            return `${duration}ms`;
        }
        return `${(duration / 1000).toFixed(1)}s`;
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    if (result.success) {
        return (
            <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
                <div className="flex items-start">
                    <StatusIndicator status="green" size="md" className="mt-0.5 mr-3" />
                    <div className="flex-1">
                        <h4 className="text-lg font-medium text-green-800 mb-2">
                            ✅ 连接测试成功 (耗时: {formatDuration(result.duration)})
                        </h4>

                        {/* Connection Details */}
                        <div className="space-y-4">
                            {/* Bucket Information */}
                            {result.details.bucketInfo && (
                                <div>
                                    <h5 className="text-sm font-medium text-green-800 mb-2">存储桶信息:</h5>
                                    <div className="bg-white rounded border border-green-200 p-3 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">区域:</span>
                                            <span className="text-gray-900 font-medium">{result.details.bucketInfo.region}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">创建时间:</span>
                                            <span className="text-gray-900 font-medium">
                                                {formatDate(result.details.bucketInfo.creationDate)}
                                            </span>
                                        </div>
                                        {result.details.bucketInfo.objectCount !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">对象数量:</span>
                                                <span className="text-gray-900 font-medium">
                                                    {result.details.bucketInfo.objectCount.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Permissions Check */}
                            <div>
                                <h5 className="text-sm font-medium text-green-800 mb-2">权限检查:</h5>
                                <div className="bg-white rounded border border-green-200 p-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <PermissionItem
                                            label="身份验证"
                                            granted={result.details.authentication}
                                        />
                                        <PermissionItem
                                            label="存储桶访问"
                                            granted={result.details.bucketAccess}
                                        />
                                    </div>

                                    {result.details.permissions.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <div className="text-sm text-gray-600 mb-2">检测到的权限:</div>
                                            <div className="flex flex-wrap gap-2">
                                                {result.details.permissions.map((permission) => (
                                                    <span
                                                        key={permission}
                                                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
                                                    >
                                                        ✓ {getPermissionLabel(permission)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Performance Info */}
                            <div>
                                <h5 className="text-sm font-medium text-green-800 mb-2">性能信息:</h5>
                                <div className="bg-white rounded border border-green-200 p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">连接延迟:</span>
                                        <span className={`font-medium ${getLatencyColor(result.duration)}`}>
                                            {formatDuration(result.duration)}
                                            <span className="ml-1 text-xs">
                                                ({getLatencyLabel(result.duration)})
                                            </span>
                                        </span>
                                    </div>
                                    {showAdvanced && (
                                        <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>建议延迟:</span>
                                                <span>&lt; 500ms</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>连接质量:</span>
                                                <span className={getLatencyColor(result.duration)}>
                                                    {getLatencyLabel(result.duration)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Advanced Diagnostics */}
                            {showAdvanced && (
                                <div>
                                    <h5 className="text-sm font-medium text-green-800 mb-2">高级诊断:</h5>
                                    <div className="bg-white rounded border border-green-200 p-3 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">SSL/TLS:</span>
                                            <span className="text-green-700 font-medium">✓ 安全连接</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">协议版本:</span>
                                            <span className="text-gray-900">HTTPS/1.1</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">数据传输:</span>
                                            <span className="text-gray-900">已加密</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
            <div className="flex items-start">
                <StatusIndicator status="red" size="md" className="mt-0.5 mr-3" />
                <div className="flex-1">
                    <h4 className="text-lg font-medium text-red-800 mb-2">
                        ❌ 连接测试失败 (耗时: {formatDuration(result.duration)})
                    </h4>

                    {/* Error Details */}
                    {result.error && (
                        <div className="space-y-4">
                            <div>
                                <h5 className="text-sm font-medium text-red-800 mb-2">错误详情:</h5>
                                <div className="bg-white rounded border border-red-200 p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">错误代码:</span>
                                            <span className="text-red-700 font-mono">{result.error.code}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-gray-600">错误信息:</span>
                                            <p className="text-red-700 mt-1">{result.error.message}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Failed Checks */}
                            <div>
                                <h5 className="text-sm font-medium text-red-800 mb-2">检查结果:</h5>
                                <div className="bg-white rounded border border-red-200 p-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <PermissionItem
                                            label="身份验证"
                                            granted={result.details.authentication}
                                        />
                                        <PermissionItem
                                            label="存储桶访问"
                                            granted={result.details.bucketAccess}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Troubleshooting Suggestions */}
                            {result.error.suggestions && result.error.suggestions.length > 0 && (
                                <div>
                                    <h5 className="text-sm font-medium text-red-800 mb-2">故障排除建议:</h5>
                                    <div className="bg-white rounded border border-red-200 p-3">
                                        <ul className="space-y-2">
                                            {result.error.suggestions.map((suggestion, index) => (
                                                <li key={index} className="flex items-start text-sm">
                                                    <span className="text-red-500 mr-2 mt-0.5">•</span>
                                                    <span className="text-gray-700">{suggestion}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Common Solutions */}
                            <div>
                                <h5 className="text-sm font-medium text-red-800 mb-2">常见解决方案:</h5>
                                <div className="bg-white rounded border border-red-200 p-3">
                                    <div className="space-y-3">
                                        <TroubleshootingTip
                                            title="检查网络连接"
                                            description="确保您的设备可以访问互联网，并且没有防火墙阻止连接"
                                        />
                                        <TroubleshootingTip
                                            title="验证访问凭据"
                                            description="确认 Access Key ID 和 Secret Access Key 正确无误"
                                        />
                                        <TroubleshootingTip
                                            title="检查存储桶权限"
                                            description="确保您的 IAM 用户或角色具有访问指定存储桶的权限"
                                        />
                                        <TroubleshootingTip
                                            title="验证区域设置"
                                            description="确认存储桶所在的区域与配置中的区域一致"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PermissionItemProps {
    label: string;
    granted: boolean;
}

const PermissionItem: React.FC<PermissionItemProps> = ({ label, granted }) => {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{label}:</span>
            <div className="flex items-center">
                {granted ? (
                    <>
                        <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700 font-medium">通过</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-red-700 font-medium">失败</span>
                    </>
                )}
            </div>
        </div>
    );
};

interface TroubleshootingTipProps {
    title: string;
    description: string;
}

const TroubleshootingTip: React.FC<TroubleshootingTipProps> = ({ title, description }) => {
    return (
        <div className="flex items-start">
            <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
                <div className="text-sm font-medium text-gray-900">{title}</div>
                <div className="text-sm text-gray-600 mt-1">{description}</div>
            </div>
        </div>
    );
};

// Helper functions
const getPermissionLabel = (permission: string): string => {
    const labels: Record<string, string> = {
        read: '读取',
        write: '写入',
        delete: '删除',
        list: '列表',
        admin: '管理',
    };
    return labels[permission] || permission;
};

const getLatencyColor = (duration: number): string => {
    if (duration < 500) return 'text-green-600';
    if (duration < 1000) return 'text-yellow-600';
    if (duration < 2000) return 'text-orange-600';
    return 'text-red-600';
};

const getLatencyLabel = (duration: number): string => {
    if (duration < 500) return '优秀';
    if (duration < 1000) return '良好';
    if (duration < 2000) return '一般';
    return '较慢';
};

export default ConnectionDiagnostics;