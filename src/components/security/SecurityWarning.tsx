import React, { useState } from 'react';
import { SecurityWarning as SecurityWarningType } from '../../types/security';
import { Button } from '../common/Button';
import { SecurityService } from '../../services/securityService';

interface SecurityWarningProps {
    warning: SecurityWarningType;
    onDismiss: (warningId: string) => void;
    onResolve?: (warningId: string) => void;
    showDetails?: boolean;
    className?: string;
}

const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
};

const severityIcons = {
    low: '💡',
    medium: '⚠️',
    high: '🚨',
    critical: '🔴',
};

const typeDescriptions = {
    network: '网络安全',
    certificate: 'SSL证书',
    configuration: '配置安全',
    environment: '环境安全',
};

const getDetailedDescription = (warning: SecurityWarningType): string => {
    switch (warning.type) {
        case 'network':
            return '网络连接可能存在安全风险，建议检查连接设置和端点配置。';
        case 'certificate':
            return 'SSL证书验证失败或即将过期，这可能导致中间人攻击风险。';
        case 'configuration':
            return '配置中检测到潜在的安全问题，如弱凭据或暴露的敏感信息。';
        case 'environment':
            return '当前运行环境可能不够安全，建议检查调试模式和日志设置。';
        default:
            return '检测到安全问题，请及时处理以确保系统安全。';
    }
};

export const SecurityWarning: React.FC<SecurityWarningProps> = ({
    warning,
    onDismiss,
    onResolve,
    showDetails = false,
    className = '',
}) => {
    const [expanded, setExpanded] = useState(false);
    const [resolving, setResolving] = useState(false);

    const colorClass = severityColors[warning.severity];
    const icon = severityIcons[warning.severity];
    const typeDescription = typeDescriptions[warning.type];

    const handleResolve = async () => {
        if (!onResolve) return;

        setResolving(true);
        try {
            await onResolve(warning.id);
        } catch (error) {
            console.error('Failed to resolve warning:', error);
        } finally {
            setResolving(false);
        }
    };

    return (
        <div className={`border rounded-lg p-4 ${colorClass} ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl flex-shrink-0" role="img" aria-label={warning.severity}>
                        {icon}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-sm">
                                {warning.title}
                            </h4>
                            <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                                {typeDescription}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 uppercase">
                                {warning.severity}
                            </span>
                        </div>

                        <p className="text-sm mb-2 break-words">
                            {warning.message}
                        </p>

                        {warning.recommendation && (
                            <div className="text-xs opacity-80 mb-2 p-2 bg-white bg-opacity-30 rounded">
                                <strong>💡 建议：</strong> {warning.recommendation}
                            </div>
                        )}

                        {showDetails && (
                            <div className="text-xs opacity-70 mb-2 p-2 bg-white bg-opacity-20 rounded">
                                <strong>详细说明：</strong> {getDetailedDescription(warning)}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="text-xs opacity-60">
                                {warning.timestamp.toLocaleString()}
                            </div>

                            {showDetails && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpanded(!expanded)}
                                    className="text-xs opacity-60 hover:opacity-100"
                                >
                                    {expanded ? '收起' : '展开'}
                                </Button>
                            )}
                        </div>

                        {expanded && (
                            <div className="mt-3 p-3 bg-white bg-opacity-30 rounded text-xs">
                                <div className="space-y-2">
                                    <div>
                                        <strong>警告ID:</strong> {warning.id}
                                    </div>
                                    <div>
                                        <strong>类型:</strong> {warning.type}
                                    </div>
                                    <div>
                                        <strong>严重程度:</strong> {warning.severity}
                                    </div>
                                    <div>
                                        <strong>创建时间:</strong> {warning.timestamp.toISOString()}
                                    </div>
                                    {warning.dismissed && (
                                        <div>
                                            <strong>状态:</strong> 已忽略
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col space-y-1 ml-3">
                    {onResolve && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResolve}
                            disabled={resolving}
                            className="text-xs opacity-60 hover:opacity-100 whitespace-nowrap"
                        >
                            {resolving ? '处理中...' : '解决'}
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDismiss(warning.id)}
                        className="text-xs opacity-60 hover:opacity-100 whitespace-nowrap"
                    >
                        忽略
                    </Button>
                </div>
            </div>
        </div>
    );
};