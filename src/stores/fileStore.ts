import { create } from 'zustand';
import {
    S3File,
    FileStore,
    FileOperationResult,
    FileFilter,
    FileSortOptions,
    FileSelection
} from '../types/file';
import { s3Service } from '../services/s3Service';
import { useConfigStore } from './configStore';

// Helper function to normalize path
const normalizePath = (path: string): string => {
    if (!path) return '';
    // Remove leading slash and ensure trailing slash for directories
    const normalized = path.replace(/^\/+/, '');
    return normalized && !normalized.endsWith('/') ? normalized + '/' : normalized;
};

// Helper function to get parent path
const getParentPath = (path: string): string | null => {
    if (!path || path === '/') return null;
    const normalized = normalizePath(path);
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length <= 1) return '';
    return segments.slice(0, -1).join('/') + '/';
};

// Helper function to get path segments
const getPathSegments = (path: string): string[] => {
    if (!path) return [];
    return normalizePath(path).split('/').filter(Boolean);
};

// Helper function to filter files based on criteria
const filterFiles = (files: S3File[], filter: FileFilter): S3File[] => {
    return files.filter(file => {
        // Search term filter
        if (filter.searchTerm) {
            const searchLower = filter.searchTerm.toLowerCase();
            if (!file.name.toLowerCase().includes(searchLower)) {
                return false;
            }
        }

        // File type filter
        if (filter.fileType && filter.fileType !== 'all') {
            if (filter.fileType === 'folder' && !file.isDirectory) return false;
            if (filter.fileType === 'file' && file.isDirectory) return false;

            // Specific file type extensions
            if (!file.isDirectory && filter.fileType !== 'file') {
                const extension = file.name.split('.').pop()?.toLowerCase();
                if (extension !== filter.fileType) return false;
            }
        }

        // Size range filter (only for files)
        if (!file.isDirectory && filter.sizeRange) {
            if (filter.sizeRange.min !== undefined && file.size < filter.sizeRange.min) return false;
            if (filter.sizeRange.max !== undefined && file.size > filter.sizeRange.max) return false;
        }

        // Date range filter
        if (filter.dateRange) {
            const fileDate = new Date(file.lastModified);
            if (filter.dateRange.from && fileDate < filter.dateRange.from) return false;
            if (filter.dateRange.to && fileDate > filter.dateRange.to) return false;
        }

        // Hidden files filter (files starting with .)
        if (!filter.showHidden && file.name.startsWith('.')) return false;

        return true;
    });
};

// Helper function to sort files
const sortFiles = (files: S3File[], sortOptions: FileSortOptions): S3File[] => {
    const sorted = [...files].sort((a, b) => {
        // Always put directories first
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;

        let comparison = 0;

        switch (sortOptions.field) {
            case 'name':
                comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'lastModified':
                comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
                break;
            case 'type':
                const aExt = a.isDirectory ? 'folder' : (a.name.split('.').pop() || '');
                const bExt = b.isDirectory ? 'folder' : (b.name.split('.').pop() || '');
                comparison = aExt.localeCompare(bExt);
                break;
        }

        return sortOptions.direction === 'desc' ? -comparison : comparison;
    });

    return sorted;
};

// Helper function to create file cache key
const createCacheKey = (path: string): string => {
    return `files_${normalizePath(path)}`;
};

// Enhanced file cache implementation with LRU eviction and size limits
class FileCache {
    private cache = new Map<string, { files: S3File[], timestamp: number, accessCount: number, lastAccess: number }>();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached paths
    private readonly MAX_FILES_PER_CACHE = 10000; // Maximum files per cache entry

    set(path: string, files: S3File[]): void {
        // Don't cache if files list is too large
        if (files.length > this.MAX_FILES_PER_CACHE) {
            return;
        }

        const key = createCacheKey(path);
        const now = Date.now();

        // If cache is full, remove least recently used entries
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictLRU();
        }

        this.cache.set(key, {
            files: [...files],
            timestamp: now,
            accessCount: 1,
            lastAccess: now
        });
    }

    get(path: string): S3File[] | null {
        const key = createCacheKey(path);
        const cached = this.cache.get(key);

        if (!cached) return null;

        const now = Date.now();

        // Check if cache is expired
        if (now - cached.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        // Update access statistics
        cached.accessCount++;
        cached.lastAccess = now;

        return [...cached.files];
    }

    invalidate(path?: string): void {
        if (path) {
            const key = createCacheKey(path);
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    clear(): void {
        this.cache.clear();
    }

    // Evict least recently used entries
    private evictLRU(): void {
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        for (const [key, value] of this.cache.entries()) {
            if (value.lastAccess < oldestTime) {
                oldestTime = value.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    // Get cache statistics
    getStats(): { size: number; hitRate: number; totalEntries: number } {
        let totalAccess = 0;
        let totalHits = 0;

        for (const value of this.cache.values()) {
            totalAccess += value.accessCount;
            totalHits += value.accessCount - 1; // First access is not a hit
        }

        return {
            size: this.cache.size,
            hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
            totalEntries: this.cache.size
        };
    }

    // Preload cache for common paths
    preload(paths: string[], files: Record<string, S3File[]>): void {
        for (const path of paths) {
            if (files[path]) {
                this.set(path, files[path]);
            }
        }
    }
}

// Create cache instance
const fileCache = new FileCache();

export const useFileStore = create<FileStore>()((set, get) => ({
    files: [],
    currentPath: '',
    loading: false,
    error: null,
    filter: {
        searchTerm: '',
        fileType: 'all',
        showHidden: false,
    },
    sortOptions: {
        field: 'name',
        direction: 'asc',
    },
    selection: {
        selectedFiles: new Set(),
        selectAll: false,
        selectionCount: 0,
    },

    // File listing and navigation
    loadFiles: async (path = '') => {
        set({ loading: true, error: null });

        try {
            const normalizedPath = normalizePath(path);

            // Check cache first
            const cachedFiles = fileCache.get(normalizedPath);
            if (cachedFiles) {
                set({
                    files: cachedFiles,
                    currentPath: normalizedPath,
                    loading: false
                });
                return;
            }

            // Get active config
            const activeConfig = useConfigStore.getState().getActiveConfig();
            if (!activeConfig) {
                throw new Error('没有活跃的S3配置');
            }

            // Initialize S3 service with active config
            s3Service.initialize(activeConfig);

            // Load files from S3
            const files = await s3Service.listObjects(normalizedPath);

            // Cache the results
            fileCache.set(normalizedPath, files);

            set({
                files,
                currentPath: normalizedPath,
                loading: false
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '加载文件列表失败';
            set({ error: errorMessage, loading: false });
            // Don't re-throw the error to allow the error state to be set
        }
    },

    refreshFiles: async () => {
        const currentPath = get().currentPath;
        // Clear cache for current path
        fileCache.invalidate(currentPath);
        await get().loadFiles(currentPath);
    },

    navigateToPath: (path) => {
        const normalizedPath = normalizePath(path);
        set({ currentPath: normalizedPath });
        get().loadFiles(normalizedPath);
    },

    navigateUp: () => {
        const currentPath = get().currentPath;
        const parentPath = getParentPath(currentPath);
        if (parentPath !== null) {
            get().navigateToPath(parentPath);
        }
    },

    navigateToRoot: () => {
        get().navigateToPath('');
    },

    // File operations
    deleteFile: async (key) => {
        set({ loading: true, error: null });

        try {
            // Get active config
            const activeConfig = useConfigStore.getState().getActiveConfig();
            if (!activeConfig) {
                throw new Error('没有活跃的S3配置');
            }

            // Initialize S3 service
            s3Service.initialize(activeConfig);

            // Delete file
            const result = await s3Service.deleteObject(key);

            if (result.success) {
                // Remove from current files list
                set((state) => ({
                    files: state.files.filter(file => file.key !== key),
                    loading: false
                }));

                // Invalidate cache
                fileCache.invalidate(get().currentPath);
            }

            set({ loading: false });
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除文件失败';
            set({ error: errorMessage, loading: false });
            return {
                success: false,
                error: errorMessage,
                affectedFiles: [key]
            };
        }
    },

    deleteFiles: async (keys) => {
        set({ loading: true, error: null });

        try {
            const results: FileOperationResult[] = [];

            // Delete files one by one
            for (const key of keys) {
                const result = await get().deleteFile(key);
                results.push(result);
            }

            // Check if all operations succeeded
            const allSucceeded = results.every(r => r.success);
            const failedFiles = results.filter(r => !r.success).flatMap(r => r.affectedFiles || []);

            set({ loading: false });

            return {
                success: allSucceeded,
                error: allSucceeded ? undefined : `部分文件删除失败: ${failedFiles.join(', ')}`,
                affectedFiles: keys
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量删除文件失败';
            set({ error: errorMessage, loading: false });
            return {
                success: false,
                error: errorMessage,
                affectedFiles: keys
            };
        }
    },

    renameFile: async (oldKey, newKey) => {
        set({ loading: true, error: null });

        try {
            // Get active config
            const activeConfig = useConfigStore.getState().getActiveConfig();
            if (!activeConfig) {
                throw new Error('没有活跃的S3配置');
            }

            // Initialize S3 service
            s3Service.initialize(activeConfig);

            // Rename is implemented as move operation
            const result = await s3Service.moveObject(oldKey, newKey);

            if (result.success) {
                // Update files list
                set((state) => ({
                    files: state.files.map(file =>
                        file.key === oldKey
                            ? { ...file, key: newKey, name: newKey.split('/').pop() || newKey }
                            : file
                    ),
                    loading: false
                }));

                // Invalidate cache
                fileCache.invalidate(get().currentPath);
            }

            set({ loading: false });
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '重命名文件失败';
            set({ error: errorMessage, loading: false });
            return {
                success: false,
                error: errorMessage,
                affectedFiles: [oldKey, newKey]
            };
        }
    },

    copyFile: async (sourceKey, targetKey) => {
        set({ loading: true, error: null });

        try {
            // Get active config
            const activeConfig = useConfigStore.getState().getActiveConfig();
            if (!activeConfig) {
                throw new Error('没有活跃的S3配置');
            }

            // Initialize S3 service
            s3Service.initialize(activeConfig);

            // Copy file
            const result = await s3Service.copyObject(sourceKey, targetKey);

            if (result.success) {
                // Refresh files to show the new copy
                await get().refreshFiles();
            }

            set({ loading: false });
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '复制文件失败';
            set({ error: errorMessage, loading: false });
            return {
                success: false,
                error: errorMessage,
                affectedFiles: [sourceKey, targetKey]
            };
        }
    },

    moveFile: async (sourceKey, targetKey) => {
        set({ loading: true, error: null });

        try {
            // Get active config
            const activeConfig = useConfigStore.getState().getActiveConfig();
            if (!activeConfig) {
                throw new Error('没有活跃的S3配置');
            }

            // Initialize S3 service
            s3Service.initialize(activeConfig);

            // Move file
            const result = await s3Service.moveObject(sourceKey, targetKey);

            if (result.success) {
                // Update files list
                set((state) => ({
                    files: state.files.filter(file => file.key !== sourceKey),
                    loading: false
                }));

                // Invalidate cache
                fileCache.invalidate(get().currentPath);
            }

            set({ loading: false });
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '移动文件失败';
            set({ error: errorMessage, loading: false });
            return {
                success: false,
                error: errorMessage,
                affectedFiles: [sourceKey, targetKey]
            };
        }
    },

    // Download operations
    downloadFile: async (key, localPath) => {
        try {
            const { downloadService } = await import('../services/downloadService');
            const { useDownloadStore } = await import('./downloadStore');

            // Get file name from key
            const fileName = key.split('/').pop() || key;

            // Determine local path
            let targetPath = localPath;
            if (!targetPath) {
                targetPath = await downloadService.getDefaultDownloadPath(fileName);
            }

            // Add download task
            const downloadStore = useDownloadStore.getState();
            const taskId = downloadStore.addTask(key, fileName, targetPath);

            // Start download
            await downloadStore.startDownload(taskId);

            return {
                success: true,
                affectedFiles: [key]
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '下载文件失败';
            return {
                success: false,
                error: errorMessage,
                affectedFiles: [key]
            };
        }
    },

    downloadFiles: async (keys, localPath) => {
        try {
            const { downloadService } = await import('../services/downloadService');
            const { useDownloadStore } = await import('./downloadStore');

            // Prepare download items
            const downloadItems = await Promise.all(
                keys.map(async (key) => {
                    const fileName = key.split('/').pop() || key;
                    let targetPath = localPath;

                    if (!targetPath) {
                        targetPath = await downloadService.getDefaultDownloadPath(fileName);
                    } else {
                        // If localPath is a directory, append filename
                        targetPath = `${localPath}/${fileName}`;
                    }

                    return { key, fileName, localPath: targetPath };
                })
            );

            // Add download tasks
            const downloadStore = useDownloadStore.getState();
            const taskIds = downloadStore.addTasks(downloadItems);

            // Start all downloads
            await downloadStore.startAllDownloads();

            return {
                success: true,
                affectedFiles: keys
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量下载文件失败';
            return {
                success: false,
                error: errorMessage,
                affectedFiles: keys
            };
        }
    },

    // Search and filtering
    setFilter: (newFilter) => {
        set((state) => ({
            filter: { ...state.filter, ...newFilter }
        }));
    },

    clearFilter: () => {
        set({
            filter: {
                searchTerm: '',
                fileType: 'all',
                showHidden: false,
            }
        });
    },

    setSortOptions: (options) => {
        set({ sortOptions: options });
    },

    // File selection
    selectFile: (key) => {
        set((state) => {
            const newSelectedFiles = new Set(state.selection.selectedFiles);
            newSelectedFiles.add(key);
            return {
                selection: {
                    selectedFiles: newSelectedFiles,
                    selectAll: newSelectedFiles.size === state.files.length,
                    selectionCount: newSelectedFiles.size,
                }
            };
        });
    },

    deselectFile: (key) => {
        set((state) => {
            const newSelectedFiles = new Set(state.selection.selectedFiles);
            newSelectedFiles.delete(key);
            return {
                selection: {
                    selectedFiles: newSelectedFiles,
                    selectAll: false,
                    selectionCount: newSelectedFiles.size,
                }
            };
        });
    },

    selectAll: () => {
        set((state) => {
            const allFileKeys = state.files.map(file => file.key);
            return {
                selection: {
                    selectedFiles: new Set(allFileKeys),
                    selectAll: true,
                    selectionCount: allFileKeys.length,
                }
            };
        });
    },

    deselectAll: () => {
        set({
            selection: {
                selectedFiles: new Set(),
                selectAll: false,
                selectionCount: 0,
            }
        });
    },

    toggleSelection: (key) => {
        const state = get();
        if (state.selection.selectedFiles.has(key)) {
            state.deselectFile(key);
        } else {
            state.selectFile(key);
        }
    },

    // Utility methods
    getFilteredFiles: () => {
        const state = get();
        return filterFiles(state.files, state.filter);
    },

    getSortedFiles: (files) => {
        const state = get();
        return sortFiles(files, state.sortOptions);
    },

    getSelectedFiles: () => {
        const state = get();
        return state.files.filter(file => state.selection.selectedFiles.has(file.key));
    },

    // Performance optimization methods
    getCacheStats: () => {
        return fileCache.getStats();
    },

    clearCache: () => {
        fileCache.clear();
    },

    preloadPaths: async (paths: string[]) => {
        const activeConfig = useConfigStore.getState().getActiveConfig();
        if (!activeConfig) return;

        s3Service.initialize(activeConfig);
        const filesMap: Record<string, S3File[]> = {};

        for (const path of paths) {
            try {
                const files = await s3Service.listObjects(normalizePath(path));
                filesMap[path] = files;
            } catch (error) {
                console.warn(`Failed to preload path ${path}:`, error);
            }
        }

        fileCache.preload(paths, filesMap);
    },

    // State management
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
}));