import React, { useMemo, useState, useEffect } from 'react';
import { S3File, FileSelection } from '../../types/file';
import { FileItem } from './FileItem';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../common/Button';

interface PaginatedFileListProps {
    files: S3File[];
    loading?: boolean;
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    selection: FileSelection;
    className?: string;
    pageSize?: number;
}

export const PaginatedFileList: React.FC<PaginatedFileListProps> = ({
    files,
    loading = false,
    onNavigate,
    onContextMenu,
    selection,
    className = '',
    pageSize = 50,
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to first page when files change
    useEffect(() => {
        setCurrentPage(1);
    }, [files]);

    // Calculate pagination
    const totalPages = Math.ceil(files.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, files.length);
    const currentFiles = useMemo(() =>
        files.slice(startIndex, endIndex),
        [files, startIndex, endIndex]
    );

    // Pagination handlers
    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const goToFirstPage = () => goToPage(1);
    const goToLastPage = () => goToPage(totalPages);
    const goToPreviousPage = () => goToPage(currentPage - 1);
    const goToNextPage = () => goToPage(currentPage + 1);

    // Generate page numbers for pagination controls
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first page
            pages.push(1);

            if (currentPage > 4) {
                pages.push('...');
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 2);
            const end = Math.min(totalPages - 1, currentPage + 2);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 3) {
                pages.push('...');
            }

            // Show last page
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }

        return pages;
    };

    // Show empty state if no files
    if (!loading && files.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${className}`}>
                <div className="text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">此文件夹为空</h3>
                    <p className="text-gray-500">此位置没有文件或文件夹</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Table header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex-shrink-0">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1 flex items-center">
                        {/* Selection checkbox placeholder */}
                    </div>
                    <div className="col-span-5">名称</div>
                    <div className="col-span-2">大小</div>
                    <div className="col-span-2">类型</div>
                    <div className="col-span-2">修改时间</div>
                </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-gray-600">加载中...</span>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {currentFiles.map((file) => (
                            <FileItem
                                key={file.key}
                                file={file}
                                isSelected={selection.selectedFiles.has(file.key)}
                                onNavigate={onNavigate}
                                onContextMenu={onContextMenu}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination controls */}
            {!loading && totalPages > 1 && (
                <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Page info */}
                        <div className="text-sm text-gray-700">
                            显示第 <span className="font-medium">{startIndex + 1}</span> 到{' '}
                            <span className="font-medium">{endIndex}</span> 项，共{' '}
                            <span className="font-medium">{files.length}</span> 项
                        </div>

                        {/* Pagination buttons */}
                        <div className="flex items-center space-x-2">
                            {/* First page */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToFirstPage}
                                disabled={currentPage === 1}
                                className="px-2 py-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </Button>

                            {/* Previous page */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                                className="px-2 py-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Button>

                            {/* Page numbers */}
                            <div className="flex items-center space-x-1">
                                {getPageNumbers().map((page, index) => (
                                    <React.Fragment key={index}>
                                        {page === '...' ? (
                                            <span className="px-2 py-1 text-gray-500">...</span>
                                        ) : (
                                            <Button
                                                variant={currentPage === page ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => goToPage(page as number)}
                                                className="px-3 py-1 min-w-[2rem]"
                                            >
                                                {page}
                                            </Button>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Next page */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Button>

                            {/* Last page */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToLastPage}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};