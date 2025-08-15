import React from 'react';
import { FileSortOptions, FileSelection } from '../../types/file';
import { Button } from '../common/Button';

interface FileToolbarProps {
    sortOptions: FileSortOptions;
    onSortChange: (options: FileSortOptions) => void;
    selection: FileSelection;
    totalFiles: number;
    filteredFiles: number;
    disabled?: boolean;
    onBatchAction?: (action: string) => void;
    className?: string;
}

export const FileToolbar: React.FC<FileToolbarProps> = ({
    sortOptions,
    onSortChange,
    selection,
    totalFiles,
    filteredFiles,
    disabled = false,
    onBatchAction,
    className = '',
}) => {
    // Handle sort field change
    const handleSortFieldChange = (field: FileSortOptions['field']) => {
        // If clicking the same field, toggle direction
        if (sortOptions.field === field) {
            onSortChange({
                ...sortOptions,
                direction: sortOptions.direction === 'asc' ? 'desc' : 'asc',
            });
        } else {
            // New field, default to ascending
            onSortChange({
                field,
                direction: 'asc',
            });
        }
    };

    // Get sort button class
    const getSortButtonClass = (field: FileSortOptions['field']) => {
        const isActive = sortOptions.field === field;
        return `flex items-center space-x-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${isActive
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`;
    };

    // Get sort icon
    const getSortIcon = (field: FileSortOptions['field']) => {
        if (sortOptions.field !== field) {
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }

        return sortOptions.direction === 'asc' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
        ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
        );
    };

    return (
        <div className={`flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 ${className}`}>
            {/* Left side - Sort options */}
            <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-500 mr-3">排序:</span>

                <button
                    type="button"
                    onClick={() => handleSortFieldChange('name')}
                    disabled={disabled}
                    className={getSortButtonClass('name')}
                >
                    <span>名称</span>
                    {getSortIcon('name')}
                </button>

                <button
                    type="button"
                    onClick={() => handleSortFieldChange('size')}
                    disabled={disabled}
                    className={getSortButtonClass('size')}
                >
                    <span>大小</span>
                    {getSortIcon('size')}
                </button>

                <button
                    type="button"
                    onClick={() => handleSortFieldChange('lastModified')}
                    disabled={disabled}
                    className={getSortButtonClass('lastModified')}
                >
                    <span>修改时间</span>
                    {getSortIcon('lastModified')}
                </button>

                <button
                    type="button"
                    onClick={() => handleSortFieldChange('type')}
                    disabled={disabled}
                    className={getSortButtonClass('type')}
                >
                    <span>类型</span>
                    {getSortIcon('type')}
                </button>
            </div>

            {/* Right side - File count and selection info */}
            <div className="flex items-center space-x-4">
                {/* Batch operations */}
                {selection.selectionCount > 0 && onBatchAction && (
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onBatchAction('download')}
                            disabled={disabled}
                            className="flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>下载</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onBatchAction('delete')}
                            disabled={disabled}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>删除</span>
                        </Button>

                        <div className="h-4 border-l border-gray-300" />
                    </div>
                )}

                {/* Selection info */}
                {selection.selectionCount > 0 && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-blue-600 font-medium">
                            已选择 {selection.selectionCount} 项
                        </span>
                        <div className="h-4 border-l border-gray-300" />
                    </div>
                )}

                {/* File count */}
                <div className="text-sm text-gray-500">
                    {filteredFiles !== totalFiles ? (
                        <span>显示 {filteredFiles} / {totalFiles} 项</span>
                    ) : (
                        <span>{totalFiles} 项</span>
                    )}
                </div>

                {/* View options (placeholder for future grid/list view toggle) */}
                <div className="flex items-center space-x-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        className="p-1"
                        title="列表视图"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        className="p-1 opacity-50"
                        title="网格视图 (即将推出)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </Button>
                </div>
            </div>
        </div>
    );
};