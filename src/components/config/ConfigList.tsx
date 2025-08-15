import React, { useState, useMemo } from 'react';
import { S3Config, ImportResult } from '../../types/config';
import { ConfigCard } from './ConfigCard';
import { BatchOperations } from './BatchOperations';
import { DragDropImport } from './DragDropImport';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ConfigListProps {
    configs: S3Config[];
    activeConfigId: string | null;
    selectedConfigs: string[];
    searchQuery: string;
    sortBy: 'name' | 'lastUsed' | 'createdAt';
    sortOrder: 'asc' | 'desc';
    loading?: boolean;
    onConfigSelect: (configId: string) => void;
    onConfigEdit: (configId: string) => void;
    onConfigDelete: (configId: string) => void;
    onConfigDuplicate: (configId: string) => void;
    onConfigTest: (configId: string) => void;
    onSetActiveConfig: (configId: string) => void;
    onToggleSelection: (configId: string) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onSearchChange: (query: string) => void;
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    onCreateNew: () => void;
    onImportComplete?: (result: ImportResult) => void;
    onBatchOperationComplete?: (operation: string, success: boolean, message?: string) => void;
    className?: string;
}

export const ConfigList: React.FC<ConfigListProps> = ({
    configs,
    activeConfigId,
    selectedConfigs,
    searchQuery,
    sortBy,
    sortOrder,
    loading = false,
    onConfigSelect,
    onConfigEdit,
    onConfigDelete,
    onConfigDuplicate,
    onConfigTest,
    onSetActiveConfig,
    onToggleSelection,
    onSelectAll,
    onClearSelection,
    onSearchChange,
    onSortChange,
    onCreateNew,
    onImportComplete,
    onBatchOperationComplete,
    className = '',
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showImportDialog, setShowImportDialog] = useState(false);

    // Filter and sort configs
    const filteredAndSortedConfigs = useMemo(() => {
        let filtered = configs;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = configs.filter(config =>
                config.name.toLowerCase().includes(query) ||
                config.bucketName.toLowerCase().includes(query) ||
                config.region.toLowerCase().includes(query) ||
                config.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'lastUsed':
                    aValue = a.lastUsed || new Date(0);
                    bValue = b.lastUsed || new Date(0);
                    break;
                case 'createdAt':
                    aValue = a.createdAt;
                    bValue = b.createdAt;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [configs, searchQuery, sortBy, sortOrder]);

    const hasSelection = selectedConfigs.length > 0;
    const isAllSelected = selectedConfigs.length === filteredAndSortedConfigs.length && filteredAndSortedConfigs.length > 0;

    if (loading) {
        return (
            <div className={`flex items-center justify-center py-12 ${className}`}>
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-600">加载配置中...</span>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">配置管理</h2>
                    <p className="text-gray-600 mt-1">
                        管理您的 S3 存储配置 ({filteredAndSortedConfigs.length} 个配置)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setShowImportDialog(true)}
                        variant="secondary"
                        size="md"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        导入配置
                    </Button>
                    <Button onClick={onCreateNew} variant="primary" size="md">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新建配置
                    </Button>
                </div>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 max-w-md">
                    <Input
                        type="text"
                        placeholder="搜索配置名称、存储桶或标签..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full"
                        icon={
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        }
                    />
                </div>

                <div className="flex items-center gap-4">
                    {/* Sort Controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">排序:</span>
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [newSortBy, newSortOrder] = e.target.value.split('-') as [string, 'asc' | 'desc'];
                                onSortChange(newSortBy, newSortOrder);
                            }}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="name-asc">名称 A-Z</option>
                            <option value="name-desc">名称 Z-A</option>
                            <option value="lastUsed-desc">最近使用</option>
                            <option value="createdAt-desc">创建时间 (新到旧)</option>
                            <option value="createdAt-asc">创建时间 (旧到新)</option>
                        </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            title="网格视图"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            title="列表视图"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Batch Operations */}
            <BatchOperations
                selectedConfigs={selectedConfigs}
                onSelectionChange={(selectedIds) => {
                    // Clear current selection and set new selection
                    onClearSelection();
                    selectedIds.forEach(id => onToggleSelection(id));
                }}
                onOperationComplete={onBatchOperationComplete}
            />

            {/* Selection Controls */}
            {filteredAndSortedConfigs.length > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={isAllSelected ? onClearSelection : onSelectAll}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>全选</span>
                        </label>
                    </div>
                    <div>
                        显示 {filteredAndSortedConfigs.length} / {configs.length} 个配置
                    </div>
                </div>
            )}

            {/* Config Grid/List */}
            {filteredAndSortedConfigs.length === 0 ? (
                <EmptyState
                    hasSearch={Boolean(searchQuery.trim())}
                    onCreateNew={onCreateNew}
                    onClearSearch={() => onSearchChange('')}
                />
            ) : (
                <div className={
                    viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                        : 'space-y-4'
                }>
                    {filteredAndSortedConfigs.map((config) => (
                        <ConfigCard
                            key={config.id}
                            config={config}
                            isActive={config.id === activeConfigId}
                            isSelected={selectedConfigs.includes(config.id)}
                            viewMode={viewMode}
                            onSelect={() => onToggleSelection(config.id)}
                            onEdit={() => onConfigEdit(config.id)}
                            onDelete={() => onConfigDelete(config.id)}
                            onDuplicate={() => onConfigDuplicate(config.id)}
                            onTest={() => onConfigTest(config.id)}
                            onSetActive={() => onSetActiveConfig(config.id)}
                        />
                    ))}
                </div>
            )}

            {/* Import Dialog */}
            {showImportDialog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">导入配置</h3>
                            <button
                                onClick={() => setShowImportDialog(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <DragDropImport
                            onImportComplete={(result) => {
                                setShowImportDialog(false);
                                if (onImportComplete) {
                                    onImportComplete(result);
                                }
                            }}
                            onImportStart={() => {
                                // Optional: Show loading state
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

interface EmptyStateProps {
    hasSearch: boolean;
    onCreateNew: () => void;
    onClearSearch: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasSearch, onCreateNew, onClearSearch }) => {
    if (hasSearch) {
        return (
            <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">未找到匹配的配置</h3>
                <p className="mt-2 text-gray-600">尝试调整搜索条件或创建新的配置</p>
                <div className="mt-6 flex justify-center gap-4">
                    <Button variant="outline" onClick={onClearSearch}>
                        清除搜索
                    </Button>
                    <Button variant="primary" onClick={onCreateNew}>
                        创建新配置
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">还没有配置</h3>
            <p className="mt-2 text-gray-600">创建您的第一个 S3 存储配置来开始使用</p>
            <div className="mt-6">
                <Button variant="primary" onClick={onCreateNew}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    创建第一个配置
                </Button>
            </div>
        </div>
    );
};

export default ConfigList;