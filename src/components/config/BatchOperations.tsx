import React, { useState, useCallback } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { Button, LoadingSpinner } from '../common';
import { S3Config } from '../../types/config';

interface BatchOperationsProps {
    selectedConfigs: string[];
    onSelectionChange?: (selectedIds: string[]) => void;
    onOperationComplete?: (operation: string, success: boolean, message?: string) => void;
    className?: string;
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
    selectedConfigs,
    onSelectionChange,
    onOperationComplete,
    className = '',
}) => {
    const {
        configs,
        deleteConfigs,
        exportConfigs,
        testAllConnections,
        selectAllConfigs,
        clearSelection,
        loading,
    } = useConfig();

    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        includeSensitive: false,
        showOptions: false,
    });

    const selectedConfigsData = configs.filter(config => selectedConfigs.includes(config.id));
    const hasSelection = selectedConfigs.length > 0;
    const isAllSelected = configs.length > 0 && selectedConfigs.length === configs.length;

    const handleSelectAll = useCallback(() => {
        if (isAllSelected) {
            clearSelection();
            if (onSelectionChange) {
                onSelectionChange([]);
            }
        } else {
            selectAllConfigs();
            if (onSelectionChange) {
                onSelectionChange(configs.map(c => c.id));
            }
        }
    }, [isAllSelected, clearSelection, selectAllConfigs, onSelectionChange, configs]);

    const handleClearSelection = useCallback(() => {
        clearSelection();
        if (onSelectionChange) {
            onSelectionChange([]);
        }
    }, [clearSelection, onSelectionChange]);

    const handleBatchDelete = useCallback(async () => {
        if (!hasSelection) return;

        setIsDeleting(true);
        try {
            await deleteConfigs(selectedConfigs);
            setShowDeleteConfirm(false);
            handleClearSelection();

            if (onOperationComplete) {
                onOperationComplete('delete', true, `Successfully deleted ${selectedConfigs.length} configurations`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete configurations';
            if (onOperationComplete) {
                onOperationComplete('delete', false, message);
            }
        } finally {
            setIsDeleting(false);
        }
    }, [hasSelection, deleteConfigs, selectedConfigs, handleClearSelection, onOperationComplete]);

    const handleBatchExport = useCallback(async () => {
        if (!hasSelection) return;

        setIsExporting(true);
        try {
            await exportConfigs(selectedConfigs, exportOptions.includeSensitive);
            setExportOptions(prev => ({ ...prev, showOptions: false }));

            if (onOperationComplete) {
                onOperationComplete('export', true, `Successfully exported ${selectedConfigs.length} configurations`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export configurations';
            if (onOperationComplete) {
                onOperationComplete('export', false, message);
            }
        } finally {
            setIsExporting(false);
        }
    }, [hasSelection, exportConfigs, selectedConfigs, exportOptions.includeSensitive, onOperationComplete]);

    const handleBatchTest = useCallback(async () => {
        setIsTesting(true);
        try {
            await testAllConnections();

            if (onOperationComplete) {
                onOperationComplete('test', true, 'Connection tests completed for all configurations');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to test connections';
            if (onOperationComplete) {
                onOperationComplete('test', false, message);
            }
        } finally {
            setIsTesting(false);
        }
    }, [testAllConnections, onOperationComplete]);

    const getSelectionSummary = () => {
        if (selectedConfigs.length === 0) return 'No configurations selected';
        if (selectedConfigs.length === 1) return '1 configuration selected';
        return `${selectedConfigs.length} configurations selected`;
    };

    return (
        <div className={`bg-white border-b border-gray-200 ${className}`}>
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Selection Info and Controls */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Select All
                            </span>
                        </div>

                        <div className="text-sm text-gray-600">
                            {getSelectionSummary()}
                        </div>

                        {hasSelection && (
                            <Button
                                onClick={handleClearSelection}
                                variant="secondary"
                                size="sm"
                            >
                                Clear Selection
                            </Button>
                        )}
                    </div>

                    {/* Batch Operations */}
                    <div className="flex items-center space-x-2">
                        {/* Test All Connections */}
                        <Button
                            onClick={handleBatchTest}
                            disabled={isTesting || loading || configs.length === 0}
                            variant="secondary"
                            size="sm"
                            className="flex items-center"
                        >
                            {isTesting ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-1" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Test All
                                </>
                            )}
                        </Button>

                        {/* Export Selected */}
                        <div className="relative">
                            <Button
                                onClick={() => setExportOptions(prev => ({ ...prev, showOptions: !prev.showOptions }))}
                                disabled={!hasSelection || isExporting || loading}
                                variant="secondary"
                                size="sm"
                                className="flex items-center"
                            >
                                {isExporting ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-1" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export ({selectedConfigs.length})
                                    </>
                                )}
                            </Button>

                            {/* Export Options Dropdown */}
                            {exportOptions.showOptions && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                    <div className="p-4">
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">Export Options</h4>

                                        <div className="space-y-3">
                                            <label className="flex items-start">
                                                <input
                                                    type="checkbox"
                                                    checked={exportOptions.includeSensitive}
                                                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeSensitive: e.target.checked }))}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                                                />
                                                <div className="ml-2">
                                                    <span className="text-sm text-gray-700">Include sensitive data</span>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {exportOptions.includeSensitive
                                                            ? '⚠️ Access keys will be included in export'
                                                            : 'Access keys will be excluded for security'
                                                        }
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="mt-4 flex justify-end space-x-2">
                                            <Button
                                                onClick={() => setExportOptions(prev => ({ ...prev, showOptions: false }))}
                                                variant="secondary"
                                                size="sm"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleBatchExport}
                                                variant="primary"
                                                size="sm"
                                                disabled={isExporting}
                                            >
                                                Export
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delete Selected */}
                        <Button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={!hasSelection || isDeleting || loading}
                            variant="danger"
                            size="sm"
                            className="flex items-center"
                        >
                            {isDeleting ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-1" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete ({selectedConfigs.length})
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Selected Configurations Preview */}
                {hasSelection && selectedConfigs.length <= 5 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            {selectedConfigsData.map((config) => (
                                <div
                                    key={config.id}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    <span className={`w-2 h-2 rounded-full mr-1 ${config.connectionStatus === 'connected' ? 'bg-green-400' :
                                            config.connectionStatus === 'error' ? 'bg-red-400' :
                                                config.connectionStatus === 'testing' ? 'bg-yellow-400' :
                                                    'bg-gray-400'
                                        }`} />
                                    {config.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Many Selected Summary */}
                {hasSelection && selectedConfigs.length > 5 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-600">
                            Selected configurations: {selectedConfigsData.slice(0, 3).map(c => c.name).join(', ')}
                            {selectedConfigs.length > 3 && ` and ${selectedConfigs.length - 3} more...`}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="mt-2 px-7 py-3">
                                <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
                                <div className="mt-2 px-7 py-3">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete {selectedConfigs.length} configuration{selectedConfigs.length > 1 ? 's' : ''}?
                                        This action cannot be undone.
                                    </p>

                                    {selectedConfigsData.length <= 5 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-gray-400 mb-1">Configurations to be deleted:</p>
                                            <ul className="text-xs text-gray-600 space-y-1">
                                                {selectedConfigsData.map((config) => (
                                                    <li key={config.id} className="flex items-center">
                                                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                                                        {config.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 px-4 py-3">
                                <Button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    variant="secondary"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleBatchDelete}
                                    variant="danger"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};