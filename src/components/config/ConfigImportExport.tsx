import React, { useState, useRef } from 'react';
import { Button, LoadingSpinner } from '../common';
import { useConfig } from '../../hooks/useConfig';
import { ConfigService } from '../../services/configService';

interface ConfigImportExportProps {
    onImportComplete?: () => void;
    onExportComplete?: () => void;
}

export const ConfigImportExport: React.FC<ConfigImportExportProps> = ({
    onImportComplete,
    onExportComplete,
}) => {
    const { configs, exportConfigs, importConfigs, loading, error, clearError } = useConfig();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [includeSensitiveData, setIncludeSensitiveData] = useState(false);
    const [overwriteExisting, setOverwriteExisting] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [exportStatus, setExportStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        setExportStatus(null);
        clearError();

        try {
            await exportConfigs({ includeSensitiveData });
            setExportStatus('配置导出成功');
            if (onExportComplete) {
                onExportComplete();
            }
        } catch (err) {
            setExportStatus('配置导出失败');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportStatus(null);
        clearError();

        try {
            await importConfigs(file, {
                overwriteExisting,
                validateBeforeImport: true,
            });
            setImportStatus('配置导入成功');
            if (onImportComplete) {
                onImportComplete();
            }
        } catch (err) {
            setImportStatus('配置导入失败');
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleTauriImport = async () => {
        setIsImporting(true);
        setImportStatus(null);
        clearError();

        try {
            // Use Tauri backend to select import file
            const importPath = await ConfigService.selectImportPath();
            if (importPath) {
                await importConfigs(importPath, {
                    overwriteExisting,
                    validateBeforeImport: true,
                });
                setImportStatus('配置导入成功');
                if (onImportComplete) {
                    onImportComplete();
                }
            }
        } catch (err) {
            setImportStatus('配置导入失败');
        } finally {
            setIsImporting(false);
        }
    };

    const clearStatus = () => {
        setImportStatus(null);
        setExportStatus(null);
        clearError();
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">配置导入导出</h2>

            {/* Export Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">导出配置</h3>
                <p className="text-sm text-gray-600 mb-4">
                    将当前的S3配置导出到文件中，可以在其他设备或环境中导入使用。
                </p>

                {/* Export Options */}
                <div className="mb-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={includeSensitiveData}
                            onChange={(e) => setIncludeSensitiveData(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            包含敏感数据 (Access Key 和 Secret Key)
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 ml-6">
                        {includeSensitiveData
                            ? '⚠️ 导出的文件将包含敏感信息，请妥善保管'
                            : '导出的文件不包含敏感信息，导入后需要重新填写密钥'
                        }
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleExport}
                        disabled={isExporting || loading || configs.length === 0}
                        variant="primary"
                        className="flex items-center"
                    >
                        {isExporting ? (
                            <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                导出中...
                            </>
                        ) : (
                            '导出配置'
                        )}
                    </Button>

                    {configs.length === 0 && (
                        <span className="text-sm text-gray-500">没有可导出的配置</span>
                    )}
                </div>

                {exportStatus && (
                    <div className={`mt-3 p-3 rounded-md ${exportStatus.includes('成功')
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {exportStatus.includes('成功') ? (
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{exportStatus}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">导入配置</h3>
                <p className="text-sm text-gray-600 mb-4">
                    从配置文件中导入S3配置。支持导入之前导出的配置文件。
                </p>

                {/* Import Options */}
                <div className="mb-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={overwriteExisting}
                            onChange={(e) => setOverwriteExisting(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            覆盖同名配置
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 ml-6">
                        {overwriteExisting
                            ? '如果存在同名配置，将会被覆盖'
                            : '如果存在同名配置，将跳过导入'
                        }
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Web File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <Button
                        onClick={handleImportClick}
                        disabled={isImporting || loading}
                        variant="secondary"
                        className="flex items-center"
                    >
                        {isImporting ? (
                            <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                导入中...
                            </>
                        ) : (
                            '选择文件导入'
                        )}
                    </Button>

                    {/* Tauri File Dialog */}
                    <Button
                        onClick={handleTauriImport}
                        disabled={isImporting || loading}
                        variant="secondary"
                        className="flex items-center"
                    >
                        {isImporting ? (
                            <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                导入中...
                            </>
                        ) : (
                            '浏览文件导入'
                        )}
                    </Button>
                </div>

                {importStatus && (
                    <div className={`mt-3 p-3 rounded-md ${importStatus.includes('成功')
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {importStatus.includes('成功') ? (
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{importStatus}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* General Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">操作失败</h3>
                            <div className="mt-2 text-sm text-red-700">
                                {error}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Status Button */}
            {(importStatus || exportStatus || error) && (
                <div className="flex justify-center">
                    <Button
                        onClick={clearStatus}
                        variant="secondary"
                        size="sm"
                    >
                        清除状态
                    </Button>
                </div>
            )}

            {/* Usage Instructions */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">使用说明</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 导出的配置文件为JSON格式，包含所有配置信息</li>
                    <li>• 如果选择包含敏感数据，请确保文件安全存储</li>
                    <li>• 导入时会自动验证配置格式和内容</li>
                    <li>• 支持批量导入多个配置</li>
                    <li>• 导入的配置会自动生成新的ID以避免冲突</li>
                </ul>
            </div>
        </div>
    );
};