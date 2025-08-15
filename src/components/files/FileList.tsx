import React from 'react';
import { S3File, FileSelection } from '../../types/file';
import { FileItem } from './FileItem';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface FileListProps {
    files: S3File[];
    loading?: boolean;
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    selection: FileSelection;
    className?: string;
}

export const FileList: React.FC<FileListProps> = ({
    files,
    loading = false,
    onNavigate,
    onContextMenu,
    selection,
    className = '',
}) => {
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
        <div className={`h-full ${className}`}>
            {/* Table header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
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
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-gray-600">加载中...</span>
                    </div>
                )}

                <div className="divide-y divide-gray-200">
                    {files.map((file) => (
                        <FileItem
                            key={file.key}
                            file={file}
                            isSelected={selection.selectedFiles.has(file.key)}
                            onNavigate={onNavigate}
                            onContextMenu={onContextMenu}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};