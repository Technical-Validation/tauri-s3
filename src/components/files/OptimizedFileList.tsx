import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import { S3File, FileSelection } from '../../types/file';
import { FileItem } from './FileItem';
import { debounce, LazyLoadObserver, calculateVirtualScrollRange } from '../../utils/performance';

interface OptimizedFileListProps {
    files: S3File[];
    loading?: boolean;
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    selection: FileSelection;
    className?: string;
    baseItemHeight?: number;
    overscan?: number;
    enableLazyLoading?: boolean;
    chunkSize?: number;
}

interface ItemData {
    files: S3File[];
    onNavigate: (path: string, isDirectory: boolean) => void;
    onContextMenu?: (event: React.MouseEvent, file: S3File) => void;
    selection: FileSelection;
    loadedChunks: Set<number>;
    onLoadChunk: (chunkIndex: number) => void;
}

// Memoized row component with lazy loading support
const OptimizedRow = React.memo<{
    index: number;
    style: React.CSSProperties;
    data: ItemData;
    setSize: (index: number, size: number) => void;
}>(({ index, style, data, setSize }) => {
    const { files, onNavigate, onContextMenu, selection, loadedChunks, onLoadChunk } = data;
    const file = files[index];
    const rowRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Calculate which chunk this item belongs to
    const chunkIndex = Math.floor(index / 50); // 50 items per chunk
    const isChunkLoaded = loadedChunks.has(chunkIndex);

    // Lazy loading observer
    useEffect(() => {
        if (!rowRef.current || isChunkLoaded) return;

        const observer = new LazyLoadObserver({
            rootMargin: '100px',
            threshold: 0.1
        });

        observer.observe(rowRef.current, () => {
            setIsVisible(true);
            onLoadChunk(chunkIndex);
        });

        return () => observer.disconnect();
    }, [chunkIndex, isChunkLoaded, onLoadChunk]);

    // Dynamic height calculation
    useEffect(() => {
        if (rowRef.current) {
            const height = rowRef.current.getBoundingClientRect().height;
            setSize(index, height);
        }
    }, [index, setSize, file]);

    if (!file || (!isChunkLoaded && !isVisible)) {
        return (
            <div ref={rowRef} style={style} className="flex items-center justify-center py-4">
                <div className="animate-pulse bg-gray-200 h-12 w-full rounded"></div>
            </div>
        );
    }

    return (
        <div ref={rowRef} style={style}>
            <FileItem
                file={file}
                isSelected={selection.selectedFiles.has(file.key)}
                onNavigate={onNavigate}
                onContextMenu={onContextMenu}
            />
        </div>
    );
});

OptimizedRow.displayName = 'OptimizedFileListRow';

export const OptimizedFileList: React.FC<OptimizedFileListProps> = ({
    files,
    loading = false,
    onNavigate,
    onContextMenu,
    selection,
    className = '',
    baseItemHeight = 60,
    overscan = 5,
    enableLazyLoading = true,
    chunkSize = 50,
}) => {
    const listRef = useRef<List>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(400);
    const [loadedChunks, setLoadedChunks] = useState<Set<number>>(new Set([0])); // Load first chunk by default
    const sizeMap = useRef<Map<number, number>>(new Map());

    // Optimized resize handler
    const updateHeight = useCallback(
        debounce(() => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const availableHeight = window.innerHeight - rect.top - 20;
                setContainerHeight(Math.max(200, Math.min(availableHeight, 800)));
            }
        }, 150),
        []
    );

    useEffect(() => {
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, [updateHeight]);

    // Handle chunk loading
    const handleLoadChunk = useCallback((chunkIndex: number) => {
        setLoadedChunks(prev => new Set([...prev, chunkIndex]));
    }, []);

    // Get item size with caching
    const getItemSize = useCallback((index: number) => {
        return sizeMap.current.get(index) || baseItemHeight;
    }, [baseItemHeight]);

    // Set item size with caching
    const setItemSize = useCallback((index: number, size: number) => {
        sizeMap.current.set(index, size);
        if (listRef.current) {
            listRef.current.resetAfterIndex(index);
        }
    }, []);

    // Memoize item data to prevent unnecessary re-renders
    const itemData = useMemo<ItemData>(() => ({
        files,
        onNavigate,
        onContextMenu,
        selection,
        loadedChunks,
        onLoadChunk: handleLoadChunk,
    }), [files, onNavigate, onContextMenu, selection, loadedChunks, handleLoadChunk]);

    // Reset loaded chunks when files change
    useEffect(() => {
        setLoadedChunks(new Set([0]));
        sizeMap.current.clear();
        if (listRef.current) {
            listRef.current.scrollToItem(0);
        }
    }, [files]);

    // Preload visible chunks
    useEffect(() => {
        if (!enableLazyLoading || files.length === 0) return;

        const visibleRange = calculateVirtualScrollRange(0, files.length, {
            itemHeight: baseItemHeight,
            containerHeight,
            overscan
        });

        const startChunk = Math.floor(visibleRange.startIndex / chunkSize);
        const endChunk = Math.floor(visibleRange.endIndex / chunkSize);

        const chunksToLoad = new Set(loadedChunks);
        for (let i = startChunk; i <= endChunk; i++) {
            chunksToLoad.add(i);
        }

        if (chunksToLoad.size !== loadedChunks.size) {
            setLoadedChunks(chunksToLoad);
        }
    }, [files.length, containerHeight, baseItemHeight, overscan, chunkSize, loadedChunks, enableLazyLoading]);

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

            {/* Optimized file list */}
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
                        itemSize={getItemSize}
                        itemData={itemData}
                        overscanCount={overscan}
                        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    >
                        {({ index, style, data }) => (
                            <OptimizedRow
                                index={index}
                                style={style}
                                data={data}
                                setSize={setItemSize}
                            />
                        )}
                    </List>
                )}
            </div>

            {/* Performance stats in development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 p-2 border-t">
                    Loaded chunks: {loadedChunks.size} / {Math.ceil(files.length / chunkSize)}
                    ({Math.round((loadedChunks.size / Math.ceil(files.length / chunkSize)) * 100)}%)
                </div>
            )}
        </div>
    );
};