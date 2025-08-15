import React, { useEffect, useState } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { useConfigStore } from '../../stores/configStore';
import { FileList } from './FileList';
import { VirtualizedFileList } from './VirtualizedFileList';
import { PaginatedFileList } from './PaginatedFileList';
import { FileSearch } from './FileSearch';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileToolbar } from './FileToolbar';
import { FileContextMenu } from './FileContextMenu';
import { RenameModal } from './RenameModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { FileListPerformanceSettings } from './FileListPerformanceSettings';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../common/Button';
import { S3File } from '../../types/file';

type ListRenderMode = 'standard' | 'virtualized' | 'paginated';

interface FileBrowserProps {
    className?: string;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({ className = '' }) => {
    const {
        files,
        currentPath,
        loading,
        error,
        filter,
        sortOptions,
        selection,
        loadFiles,
        refreshFiles,
        navigateToPath,
        navigateUp,
        navigateToRoot,
        setFilter,
        setSortOptions,
        clearError,
        getFilteredFiles,
        getSortedFiles,
        deleteFile,
        deleteFiles,
        renameFile,
        getSelectedFiles,
    } = useFileStore();

    const { getActiveConfig } = useConfigStore();
    const [isInitialized, setIsInitialized] = useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        file: S3File | null;
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        file: null,
    });

    // Modal states
    const [renameModal, setRenameModal] = useState<{
        isOpen: boolean;
        file: S3File | null;
    }>({
        isOpen: false,
        file: null,
    });

    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        files: S3File[];
    }>({
        isOpen: false,
        files: [],
    });

    // Performance settings modal state
    const [performanceSettingsOpen, setPerformanceSettingsOpen] = useState(false);

    // Initialize file browser when component mounts or active config changes
    useEffect(() => {
        const activeConfig = getActiveConfig();
        if (activeConfig && !isInitialized) {
            loadFiles('').then(() => {
                setIsInitialized(true);
            }).catch((error) => {
                console.error('Failed to initialize file browser:', error);
            });
        }
    }, [getActiveConfig, loadFiles, isInitialized]);

    // Get filtered and sorted files
    const filteredFiles = getFilteredFiles();
    const displayFiles = getSortedFiles(filteredFiles);

    // List render mode state
    const [renderMode, setRenderMode] = useState<ListRenderMode>(() => {
        // Auto-select render mode based on file count
        const savedMode = localStorage.getItem('fileListRenderMode') as ListRenderMode;
        return savedMode || 'standard';
    });

    // Auto-adjust render mode based on file count
    useEffect(() => {
        if (displayFiles.length > 1000) {
            setRenderMode('virtualized');
        } else if (displayFiles.length > 200) {
            setRenderMode('paginated');
        }
    }, [displayFiles.length]);

    // Save render mode preference
    useEffect(() => {
        localStorage.setItem('fileListRenderMode', renderMode);
    }, [renderMode]);

    // Handle file/folder navigation
    const handleNavigate = (path: string, isDirectory: boolean) => {
        if (isDirectory) {
            navigateToPath(path);
        }
        // For files, we might want to show a preview or download dialog in the future
    };

    // Handle refresh
    const handleRefresh = () => {
        refreshFiles();
    };

    // Handle error dismissal
    const handleDismissError = () => {
        clearError();
    };

    // Handle context menu
    const handleContextMenu = (event: React.MouseEvent, file: S3File) => {
        event.preventDefault();
        setContextMenu({
            isOpen: true,
            position: { x: event.clientX, y: event.clientY },
            file,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({
            isOpen: false,
            position: { x: 0, y: 0 },
            file: null,
        });
    };

    // Handle context menu actions
    const handleContextAction = async (action: string, file: S3File) => {
        switch (action) {
            case 'download':
                // TODO: Implement download functionality
                console.log('Download:', file.key);
                break;

            case 'rename':
                setRenameModal({
                    isOpen: true,
                    file,
                });
                break;

            case 'delete':
                const filesToDelete = selection.selectedFiles.has(file.key) && selection.selectionCount > 1
                    ? getSelectedFiles()
                    : [file];
                setDeleteModal({
                    isOpen: true,
                    files: filesToDelete,
                });
                break;

            case 'copy':
                // TODO: Implement copy functionality
                console.log('Copy:', file.key);
                break;

            case 'move':
                // TODO: Implement move functionality
                console.log('Move:', file.key);
                break;

            case 'properties':
                // TODO: Implement properties dialog
                console.log('Properties:', file.key);
                break;

            default:
                console.log('Unknown action:', action);
        }
    };

    // Handle rename
    const handleRename = async (oldKey: string, newKey: string) => {
        await renameFile(oldKey, newKey);
    };

    // Handle delete
    const handleDelete = async (fileKeys: string[]) => {
        if (fileKeys.length === 1) {
            await deleteFile(fileKeys[0]);
        } else {
            await deleteFiles(fileKeys);
        }
    };

    // Handle batch actions from toolbar
    const handleBatchAction = (action: string) => {
        const selectedFiles = getSelectedFiles();

        switch (action) {
            case 'download':
                // TODO: Implement batch download functionality
                console.log('Batch download:', selectedFiles.map(f => f.key));
                break;

            case 'delete':
                setDeleteModal({
                    isOpen: true,
                    files: selectedFiles,
                });
                break;

            default:
                console.log('Unknown batch action:', action);
        }
    };

    // Check if we have an active config
    const activeConfig = getActiveConfig();
    if (!activeConfig) {
        return (
            <div className={`flex flex-col items-center justify-center h-64 ${className}`}>
                <div className="text-center">
                    <div className="text-gray-500 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">没有活跃的S3配置</h3>
                    <p className="text-gray-500 mb-4">请先配置S3连接信息才能浏览文件</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header with breadcrumb and toolbar */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <FileBreadcrumb
                            currentPath={currentPath}
                            onNavigate={navigateToPath}
                            onNavigateToRoot={navigateToRoot}
                        />
                        <div className="flex items-center space-x-2">
                            {/* Render mode selector */}
                            <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
                                <Button
                                    variant={renderMode === 'standard' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setRenderMode('standard')}
                                    disabled={loading}
                                    className="px-2 py-1 text-xs rounded-none border-0"
                                    title="标准列表"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </Button>
                                <Button
                                    variant={renderMode === 'virtualized' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setRenderMode('virtualized')}
                                    disabled={loading}
                                    className="px-2 py-1 text-xs rounded-none border-0"
                                    title="虚拟滚动"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </Button>
                                <Button
                                    variant={renderMode === 'paginated' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setRenderMode('paginated')}
                                    disabled={loading}
                                    className="px-2 py-1 text-xs rounded-none border-0"
                                    title="分页显示"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </Button>
                            </div>

                            {/* Performance settings */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPerformanceSettingsOpen(true)}
                                disabled={loading}
                                className="flex items-center space-x-1"
                                title="性能设置"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={loading}
                                className="flex items-center space-x-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>刷新</span>
                            </Button>
                            {currentPath && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={navigateUp}
                                    disabled={loading}
                                    className="flex items-center space-x-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                    </svg>
                                    <span>返回上级</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search and filters */}
                    <FileSearch
                        filter={filter}
                        onFilterChange={setFilter}
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Toolbar */}
            <FileToolbar
                sortOptions={sortOptions}
                onSortChange={setSortOptions}
                selection={selection}
                totalFiles={files.length}
                filteredFiles={filteredFiles.length}
                disabled={loading}
                onBatchAction={handleBatchAction}
            />

            {/* Error display */}
            {error && (
                <div className="flex-shrink-0 bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-2">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <div className="-mx-1.5 -my-1.5">
                                <button
                                    type="button"
                                    onClick={handleDismissError}
                                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                                >
                                    <span className="sr-only">关闭</span>
                                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content area */}
            <div className="flex-1 overflow-hidden">
                {loading && !isInitialized ? (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner size="lg" />
                        <span className="ml-3 text-gray-600">加载文件列表...</span>
                    </div>
                ) : (
                    <>
                        {renderMode === 'standard' && (
                            <FileList
                                files={displayFiles}
                                loading={loading}
                                onNavigate={handleNavigate}
                                onContextMenu={handleContextMenu}
                                selection={selection}
                            />
                        )}
                        {renderMode === 'virtualized' && (
                            <VirtualizedFileList
                                files={displayFiles}
                                loading={loading}
                                onNavigate={handleNavigate}
                                onContextMenu={handleContextMenu}
                                selection={selection}
                            />
                        )}
                        {renderMode === 'paginated' && (
                            <PaginatedFileList
                                files={displayFiles}
                                loading={loading}
                                onNavigate={handleNavigate}
                                onContextMenu={handleContextMenu}
                                selection={selection}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.file && (
                <FileContextMenu
                    file={contextMenu.file}
                    isOpen={contextMenu.isOpen}
                    position={contextMenu.position}
                    onClose={handleCloseContextMenu}
                    onAction={handleContextAction}
                />
            )}

            {/* Rename Modal */}
            <RenameModal
                isOpen={renameModal.isOpen}
                file={renameModal.file}
                onClose={() => setRenameModal({ isOpen: false, file: null })}
                onConfirm={handleRename}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                files={deleteModal.files}
                onClose={() => setDeleteModal({ isOpen: false, files: [] })}
                onConfirm={handleDelete}
            />

            {/* Performance Settings Modal */}
            <FileListPerformanceSettings
                isOpen={performanceSettingsOpen}
                onClose={() => setPerformanceSettingsOpen(false)}
            />
        </div>
    );
};