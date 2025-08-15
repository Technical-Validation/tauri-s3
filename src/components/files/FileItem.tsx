import React from 'react';
import { S3File } from '../../types/file';
import { useFileStore } from '../../stores/fileStore';

interface FileItemProps {
    file: S3File;
    isSelected: boolean;
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    className?: string;
}

export const FileItem: React.FC<FileItemProps> = ({
    file,
    isSelected,
    onNavigate,
    onContextMenu,
    className = '',
}) => {
    const { toggleSelection } = useFileStore();

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '-';

        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    // Get file type display
    const getFileType = (file: S3File): string => {
        if (file.isDirectory) return '文件夹';

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension) return '文件';

        const typeMap: Record<string, string> = {
            // Images
            'jpg': '图片', 'jpeg': '图片', 'png': '图片', 'gif': '图片', 'webp': '图片', 'svg': '图片',
            // Documents
            'pdf': 'PDF', 'doc': 'Word', 'docx': 'Word', 'xls': 'Excel', 'xlsx': 'Excel', 'ppt': 'PowerPoint', 'pptx': 'PowerPoint',
            // Text
            'txt': '文本', 'md': 'Markdown', 'json': 'JSON', 'xml': 'XML', 'csv': 'CSV',
            // Code
            'js': 'JavaScript', 'ts': 'TypeScript', 'html': 'HTML', 'css': 'CSS', 'py': 'Python', 'java': 'Java',
            // Archives
            'zip': '压缩包', 'rar': '压缩包', '7z': '压缩包', 'tar': '压缩包', 'gz': '压缩包',
            // Media
            'mp4': '视频', 'avi': '视频', 'mov': '视频', 'mp3': '音频', 'wav': '音频', 'flac': '音频',
        };

        return typeMap[extension] || extension.toUpperCase();
    };

    // Get file icon
    const getFileIcon = (file: S3File): JSX.Element => {
        if (file.isDirectory) {
            return (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
            );
        }

        const extension = file.name.split('.').pop()?.toLowerCase();

        // Image files
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
            return (
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
            );
        }

        // Document files
        if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
            return (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
            );
        }

        // Code files
        if (['js', 'ts', 'html', 'css', 'py', 'java', 'json', 'xml'].includes(extension || '')) {
            return (
                <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            );
        }

        // Archive files
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
            return (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            );
        }

        // Default file icon
        return (
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
        );
    };

    // Handle click
    const handleClick = () => {
        onNavigate(file.key, file.isDirectory);
    };

    // Handle selection
    const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        toggleSelection(file.key);
    };

    // Handle context menu
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onContextMenu) {
            onContextMenu(e, file);
        }
    };

    return (
        <div
            className={`grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''
                } ${className}`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {/* Selection checkbox */}
            <div className="col-span-1 flex items-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleSelectionChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* File name with icon */}
            <div className="col-span-5 flex items-center space-x-3 min-w-0">
                <div className="flex-shrink-0">
                    {getFileIcon(file)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${file.isDirectory ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                        {file.name}
                    </p>
                </div>
            </div>

            {/* File size */}
            <div className="col-span-2 flex items-center">
                <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                </p>
            </div>

            {/* File type */}
            <div className="col-span-2 flex items-center">
                <p className="text-sm text-gray-500">
                    {getFileType(file)}
                </p>
            </div>

            {/* Last modified */}
            <div className="col-span-2 flex items-center">
                <p className="text-sm text-gray-500">
                    {formatDate(file.lastModified)}
                </p>
            </div>
        </div>
    );
};