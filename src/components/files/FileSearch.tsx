import React, { useState } from 'react';
import { FileFilter } from '../../types/file';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

interface FileSearchProps {
    filter: FileFilter;
    onFilterChange: (filter: Partial<FileFilter>) => void;
    disabled?: boolean;
    className?: string;
}

export const FileSearch: React.FC<FileSearchProps> = ({
    filter,
    onFilterChange,
    disabled = false,
    className = '',
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Handle search term change
    const handleSearchChange = (value: string) => {
        onFilterChange({ searchTerm: value });
    };

    // Handle file type change
    const handleFileTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ fileType: e.target.value });
    };

    // Handle show hidden files toggle
    const handleShowHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ showHidden: e.target.checked });
    };

    // Handle size range change
    const handleSizeRangeChange = (field: 'min' | 'max', value: string) => {
        const numValue = value ? parseInt(value) * 1024 : undefined; // Convert KB to bytes
        onFilterChange({
            sizeRange: {
                ...filter.sizeRange,
                [field]: numValue,
            },
        });
    };

    // Clear all filters
    const handleClearFilters = () => {
        onFilterChange({
            searchTerm: '',
            fileType: 'all',
            showHidden: false,
            sizeRange: undefined,
            dateRange: undefined,
        });
    };

    // Check if any filters are active
    const hasActiveFilters =
        filter.searchTerm ||
        (filter.fileType && filter.fileType !== 'all') ||
        filter.showHidden ||
        filter.sizeRange ||
        filter.dateRange;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Basic search */}
            <div className="flex items-center space-x-3">
                <div className="flex-1">
                    <Input
                        type="text"
                        placeholder="搜索文件和文件夹..."
                        value={filter.searchTerm || ''}
                        onChange={handleSearchChange}
                        disabled={disabled}
                        className="w-full"
                        leftIcon={
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        }
                    />
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    disabled={disabled}
                    className="flex items-center space-x-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span>高级筛选</span>
                </Button>

                {hasActiveFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        disabled={disabled}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                        清除筛选
                    </Button>
                )}
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* File type filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                文件类型
                            </label>
                            <select
                                value={filter.fileType || 'all'}
                                onChange={handleFileTypeChange}
                                disabled={disabled}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="all">所有类型</option>
                                <option value="folder">文件夹</option>
                                <option value="file">文件</option>
                                <option value="jpg">图片 (JPG)</option>
                                <option value="png">图片 (PNG)</option>
                                <option value="pdf">PDF文档</option>
                                <option value="doc">Word文档</option>
                                <option value="xls">Excel文档</option>
                                <option value="txt">文本文件</option>
                                <option value="zip">压缩文件</option>
                                <option value="mp4">视频文件</option>
                                <option value="mp3">音频文件</option>
                            </select>
                        </div>

                        {/* Size range filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                文件大小 (KB)
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    placeholder="最小"
                                    value={filter.sizeRange?.min ? Math.round(filter.sizeRange.min / 1024) : ''}
                                    onChange={(e) => handleSizeRangeChange('min', e.target.value)}
                                    disabled={disabled}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <span className="text-gray-500">-</span>
                                <input
                                    type="number"
                                    placeholder="最大"
                                    value={filter.sizeRange?.max ? Math.round(filter.sizeRange.max / 1024) : ''}
                                    onChange={(e) => handleSizeRangeChange('max', e.target.value)}
                                    disabled={disabled}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Show hidden files */}
                        <div className="flex items-center">
                            <div className="flex items-center h-5">
                                <input
                                    id="show-hidden"
                                    type="checkbox"
                                    checked={filter.showHidden || false}
                                    onChange={handleShowHiddenChange}
                                    disabled={disabled}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="show-hidden" className="font-medium text-gray-700">
                                    显示隐藏文件
                                </label>
                                <p className="text-gray-500">显示以点开头的文件</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};