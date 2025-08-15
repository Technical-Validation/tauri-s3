import React, { useState, useEffect } from 'react';
import { SecurityService } from '../../services/securityService';
import { SecurityReport, SecurityWarning as SecurityWarningType, NetworkSecurityCheck } from '../../types/security';
import { SecurityWarning } from './SecurityWarning';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useConfigStore } from '../../stores/configStore';
import { S3Config } from '../../types/config';

interface SecurityDashboardProps {
    className?: string;
}

const riskColors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100',
};

const riskLabels = {
    low: '低风险',
    medium: '中等风险',
    high: '高风险',
    critical: '严重风险',
};

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
    className = '',
}) => {
    const [report, setReport] = useState<SecurityReport | null>(null);
    const [warnings, setWarnings] = useState<SecurityWarningType[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [networkChecks, setNetworkChecks] = useState<Map<string, NetworkSecurityCheck>>(new Map());
    const [checkingNetwork, setCheckingNetwork] = useState(false);

    const { configs } = useConfigStore();

    const generateReport = async () => {
        setLoading(true);
        try {
            const newReport = await SecurityService.generateSecurityReport(configs);
            setReport(newReport);
            setWarnings(SecurityService.getActiveWarnings());
        } catch (error) {
            console.error('Failed to generate security report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDismissWarning = (warningId: string) => {
        SecurityService.dismissWarning(warningId);
        setWarnings(SecurityService.getActiveWarnings());
    };

    const handleClearAllWarnings = () => {
        SecurityService.clearAllWarnings();
        setWarnings([]);
    };

    const performNetworkSecurityCheck = async (config: S3Config) => {
        try {
            const networkCheck = await SecurityService.checkNetworkSecurity(config);
            setNetworkChecks(prev => new Map(prev.set(config.id, networkCheck)));
            return networkCheck;
        } catch (error) {
            console.error(`Network security check failed for ${config.name}:`, error);
            return null;
        }
    };

    const performAllNetworkChecks = async () => {
        setCheckingNetwork(true);
        try {
            const checks = await Promise.all(
                configs.map(config => performNetworkSecurityCheck(config))
            );

            // Update warnings after network checks
            setWarnings(SecurityService.getActiveWarnings());
        } catch (error) {
            console.error('Failed to perform network checks:', error);
        } finally {
            setCheckingNetwork(false);
        }
    };

    const handleResolveWarning = async (warningId: string) => {
        const warning = warnings.find(w => w.id === warningId);
        if (!warning) return;

        try {
            switch (warning.type) {
                case 'network':
                    // Re-run network security checks
                    await performAllNetworkChecks();
                    break;
                case 'certificate':
                    // Re-validate certificates
                    await performAllNetworkChecks();
                    break;
                case 'configuration':
                    // Re-generate security report
                    await generateReport();
                    break;
                default:
                    // For other types, just dismiss the warning
                    SecurityService.dismissWarning(warningId);
                    break;
            }

            setWarnings(SecurityService.getActiveWarnings());
        } catch (error) {
            console.error('Failed to resolve warning:', error);
        }
    };

    useEffect(() => {
        generateReport();
        performAllNetworkChecks();
    }, [configs]);

    // Auto-refresh security checks every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            if (SecurityService.getSettings().autoSecurityChecks) {
                generateReport();
                performAllNetworkChecks();
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [configs]);

    if (loading && !report) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <LoadingSpinner size="lg" />
                <span className="ml-2">正在生成安全报告...</span>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Security Overview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">安全概览</h3>
                    <div className="flex space-x-2">
                        <Button
                            onClick={performAllNetworkChecks}
                            disabled={checkingNetwork}
                            size="sm"
                            variant="outline"
                        >
                            {checkingNetwork ? <LoadingSpinner size="sm" /> : '网络检查'}
                        </Button>
                        <Button
                            onClick={generateReport}
                            disabled={loading}
                            size="sm"
                            variant="outline"
                        >
                            {loading ? <LoadingSpinner size="sm" /> : '刷新报告'}
                        </Button>
                    </div>
                </div>

                {report && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${riskColors[report.overallRisk]}`}>
                                {riskLabels[report.overallRisk]}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">整体风险等级</p>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {warnings.length}
                            </div>
                            <p className="text-xs text-gray-500">活跃警告</p>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {report.recommendations.length}
                            </div>
                            <p className="text-xs text-gray-500">安全建议</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Security Warnings */}
            {warnings.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">安全警告</h3>
                        <div className="space-x-2">
                            <Button
                                onClick={() => setExpanded(!expanded)}
                                size="sm"
                                variant="ghost"
                            >
                                {expanded ? '收起' : '展开'}
                            </Button>
                            <Button
                                onClick={handleClearAllWarnings}
                                size="sm"
                                variant="outline"
                            >
                                清除全部
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {(expanded ? warnings : warnings.slice(0, 3)).map((warning) => (
                            <SecurityWarning
                                key={warning.id}
                                warning={warning}
                                onDismiss={handleDismissWarning}
                                onResolve={handleResolveWarning}
                                showDetails={expanded}
                            />
                        ))}

                        {!expanded && warnings.length > 3 && (
                            <div className="text-center py-2">
                                <Button
                                    onClick={() => setExpanded(true)}
                                    size="sm"
                                    variant="ghost"
                                >
                                    显示更多 ({warnings.length - 3} 个警告)
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Network Security Details */}
            {expanded && networkChecks.size > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold mb-4">网络安全详情</h3>

                    <div className="space-y-4">
                        {configs.map(config => {
                            const networkCheck = networkChecks.get(config.id);
                            if (!networkCheck) return null;

                            return (
                                <div key={config.id} className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-3">{config.name}</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>端点:</span>
                                                <span className="font-mono text-xs">
                                                    {config.endpoint || `https://s3.${config.region}.amazonaws.com`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>HTTPS连接:</span>
                                                <span className={networkCheck.isHttps ? 'text-green-600' : 'text-red-600'}>
                                                    {networkCheck.isHttps ? '✓ 已启用' : '✗ 未启用'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>证书验证:</span>
                                                <span className={networkCheck.certificateValid ? 'text-green-600' : 'text-red-600'}>
                                                    {networkCheck.certificateValid ? '✓ 有效' : '✗ 无效'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {networkCheck.certificateExpiry && (
                                                <div className="flex justify-between">
                                                    <span>证书过期:</span>
                                                    <span className="text-xs">
                                                        {networkCheck.certificateExpiry.toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                            {networkCheck.certificateIssuer && (
                                                <div className="flex justify-between">
                                                    <span>证书颁发者:</span>
                                                    <span className="text-xs truncate max-w-32" title={networkCheck.certificateIssuer}>
                                                        {networkCheck.certificateIssuer}
                                                    </span>
                                                </div>
                                            )}
                                            {networkCheck.tlsVersion && (
                                                <div className="flex justify-between">
                                                    <span>TLS版本:</span>
                                                    <span className="text-xs">{networkCheck.tlsVersion}</span>
                                                </div>
                                            )}
                                            {networkCheck.cipherSuite && (
                                                <div className="flex justify-between">
                                                    <span>加密套件:</span>
                                                    <span className="text-xs truncate max-w-32" title={networkCheck.cipherSuite}>
                                                        {networkCheck.cipherSuite}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Security Details */}
            {report && expanded && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold mb-4">详细安全信息</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Network Security Summary */}
                        <div>
                            <h4 className="font-medium mb-2">网络安全</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>HTTPS连接:</span>
                                    <span className={report.networkSecurity.isHttps ? 'text-green-600' : 'text-red-600'}>
                                        {report.networkSecurity.isHttps ? '✓ 已启用' : '✗ 未启用'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>证书验证:</span>
                                    <span className={report.networkSecurity.certificateValid ? 'text-green-600' : 'text-red-600'}>
                                        {report.networkSecurity.certificateValid ? '✓ 有效' : '✗ 无效'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Configuration Security */}
                        <div>
                            <h4 className="font-medium mb-2">配置安全</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>配置加密:</span>
                                    <span className={report.configurationSecurity.configurationEncrypted ? 'text-green-600' : 'text-red-600'}>
                                        {report.configurationSecurity.configurationEncrypted ? '✓ 已加密' : '✗ 未加密'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>弱凭据检测:</span>
                                    <span className={!report.configurationSecurity.hasWeakCredentials ? 'text-green-600' : 'text-red-600'}>
                                        {!report.configurationSecurity.hasWeakCredentials ? '✓ 无发现' : '✗ 发现问题'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>凭据暴露:</span>
                                    <span className={!report.configurationSecurity.credentialsExposed ? 'text-green-600' : 'text-red-600'}>
                                        {!report.configurationSecurity.credentialsExposed ? '✓ 无发现' : '✗ 发现问题'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Environment Security */}
                        <div>
                            <h4 className="font-medium mb-2">环境安全</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>生产环境:</span>
                                    <span className={report.environmentSecurity.isProduction ? 'text-green-600' : 'text-yellow-600'}>
                                        {report.environmentSecurity.isProduction ? '✓ 是' : '⚠ 否'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>调试模式:</span>
                                    <span className={!report.environmentSecurity.debugModeEnabled ? 'text-green-600' : 'text-yellow-600'}>
                                        {!report.environmentSecurity.debugModeEnabled ? '✓ 已禁用' : '⚠ 已启用'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>敏感日志:</span>
                                    <span className={!report.environmentSecurity.sensitiveDataInLogs ? 'text-green-600' : 'text-red-600'}>
                                        {!report.environmentSecurity.sensitiveDataInLogs ? '✓ 无发现' : '✗ 发现问题'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {report.recommendations.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-medium mb-2">安全建议</h4>
                            <ul className="space-y-1 text-sm">
                                {report.recommendations.map((recommendation, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="text-blue-500 mr-2">•</span>
                                        <span>{recommendation}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                        报告生成时间: {report.timestamp.toLocaleString()}
                    </div>
                </div>
            )}

            {/* No warnings state */}
            {warnings.length === 0 && report && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <div className="text-green-600 text-4xl mb-2">🛡️</div>
                    <h3 className="text-lg font-semibold text-green-800 mb-1">安全状态良好</h3>
                    <p className="text-green-600 text-sm">当前没有发现安全问题</p>
                </div>
            )}
        </div>
    );
};