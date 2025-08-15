import React, { useRef, useEffect } from 'react';
import { S3File } from '../../types/file';
import { useFileStore } from '../../stores/fileStore';

interface FileContextMenuProps {
    file: S3File;
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onAction: (action: string, file: S3File) => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
    file,
    isOpen,
    position,
    onClose,
    onAction,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { selection } = useFileStore();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Adjust menu position to stay within viewport
    const getMenuStyle = () => {
        if (!menuRef.current) return { left: position.x, top: position.y };

        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = position.x;
        let top = position.y;

        // Adjust horizontal position
        if (left + menuRect.width > viewportWidth) {
            left = viewportWidth - menuRect.width - 10;
        }

        // Adjust vertical position
        if (top + menuRect.height > viewportHeight) {
            top = viewportHeight - menuRect.height - 10;
        }

        return { left, top };
    };

    const handleAction = (actionId: string) => {
        onAction(actionId, file);
        onClose();
    };

    const isSelected = selection.selectedFiles.has(file.key);
    const hasMultipleSelected = selection.selectionCount > 1;

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-48"
            style={getMenuStyle()}
        >
            {/* Download */}
            <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => handleAction('download')}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{hasMultipleSelected && isSelected ? `下载选中的 ${selection.selectionCount} 个文件` : '下载'}</span>
            </button>

            {/* Separator */}
            <div className="border-t border-gray-100 my-1" />

            {/* Copy */}
            <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => handleAction('copy')}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>复制</span>
            </button>

            {/* Move */}
            <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => handleAction('move')}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span>移动</span>
            </button>

            {/* Rename - only for single files */}
            {!hasMultipleSelected && (
                <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={() => handleAction('rename')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>重命名</span>
                </button>
            )}

            {/* Separator */}
            <div className="border-t border-gray-100 my-1" />

            {/* Delete */}
            <button
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                onClick={() => handleAction('delete')}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{hasMultipleSelected && isSelected ? `删除选中的 ${selection.selectionCount} 个文件` : '删除'}</span>
            </button>

            {/* Properties */}
            {!hasMultipleSelected && (
                <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        onClick={() => handleAction('properties')}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>属性</span>
                    </button>
                </>
            )}
        </div>
    );
};