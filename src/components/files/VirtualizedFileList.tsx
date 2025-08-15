import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { S3File, FileSelection } from '../../types/file';
import { FileItem } from './FileItem';
import { debounce, throttle } from '../../utils/performance';

interface VirtualizedFileListProps {
    files: S3File[];
    loading?: boolean;
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    selection: FileSelection;
    className?: string;
    itemHeight?: number;
    overscan?: number;
}

interface ItemData {
    files: S3File[];
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    selection: FileSelection;
}

// Memoized row component for better performance
const Row = React.memo<{ index: number; style: React.CSSProperties; data: ItemData }>(
    ({ index, style, data }) => {
        const { files, onNavigate, onContextMenu, selection } = data;
        const file = files[index];

        if (!file) return null;

        return (
            <div style={style}>
                <FileItem
                    file={file}
                    isSelected={selection.selectedFiles.has(file.key)}
                    onNavigate={onNavigate}
                    onContextMenu={onContextMenu}
                />
            </div>
        );
    }
);

Row.displayName = 'VirtualizedFileListRow';

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = ({
    files,
    loading = false,
    onNavigate,
    onContextMenu,
    selection,
    className = '',
    itemHeight = 60,
    overscan = 5,
}) => {
    const listRef = useRef<List>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(400);

    // Optimized resize handler with debouncing
    const updateHeight = useCallback(
        debounce(() => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const availableHeight = window.innerHeight - rect.top - 20; // 20px margin
                setContainerHeight(Math.max(200, Math.min(availableHeight, 800)));
            }
        }, 150),
        []
    );

    // Update container height when component mounts or resizes
    useEffect(() => {
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
        };
    }, [updateHeight]);

    // Memoize item data to prevent unnecessary re-renders
    const itemData = useMemo<ItemData>(() => ({
        files,
        onNavigate,
        onContextMenu,
        selection,
    }), [files, onNavigate, onContextMenu, selection]);

    // Scroll to top when files change
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollToItem(0);
        }
    }, [files]);

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
        <div ref={containerRef} className={`h-full ${className}`}>
            {/* Table header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
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

            {/* Virtualized file list */}
            <div className="flex-1">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">加载中...</span>
                    </div>
                ) : (
                    <List
                        ref={listRef}
                        height={containerHeight - 60} // Subtract header height
                        itemCount={files.length}
                        itemSize={itemHeight}
                        itemData={itemData}
                        overscanCount={overscan}
                        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    >
                        {Row}
                    </List>
                )}
            </div>
        </div>
    );
};