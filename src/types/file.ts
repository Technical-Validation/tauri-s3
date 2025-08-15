// S3 File Interface
export interface S3File {
    key: string;
    name: string;
    size: number;
    lastModified: Date;
    etag: string;
    isDirectory: boolean;
    storageClass?: string;
    contentType?: string;
    metadata?: Record<string, string>;
}

// File operation types
export type FileOperation = 'download' | 'delete' | 'rename' | 'copy' | 'move';

export interface FileOperationResult {
    success: boolean;
    error?: string;
    affectedFiles?: string[];
}

// File navigation and path management
export interface FilePath {
    full: string;
    segments: string[];
    parent: string | null;
    name: string;
}

// File search and filtering
export interface FileFilter {
    searchTerm?: string;
    fileType?: string;
    sizeRange?: {
        min?: number;
        max?: number;
    };
    dateRange?: {
        from?: Date;
        to?: Date;
    };
    showHidden?: boolean;
}

export interface FileSortOptions {
    field: 'name' | 'size' | 'lastModified' | 'type';
    direction: 'asc' | 'desc';
}

// File selection and batch operations
export interface FileSelection {
    selectedFiles: Set<string>;
    selectAll: boolean;
    selectionCount: number;
}

// File Store Interface
export interface FileStore {
    files: S3File[];
    currentPath: string;
    loading: boolean;
    error: string | null;
    filter: FileFilter;
    sortOptions: FileSortOptions;
    selection: FileSelection;

    // File listing and navigation
    loadFiles: (path?: string) => Promise<void>;
    refreshFiles: () => Promise<void>;
    navigateToPath: (path: string) => void;
    navigateUp: () => void;
    navigateToRoot: () => void;

    // File operations
    deleteFile: (key: string) => Promise<FileOperationResult>;
    deleteFiles: (keys: string[]) => Promise<FileOperationResult>;
    renameFile: (oldKey: string, newKey: string) => Promise<FileOperationResult>;
    copyFile: (sourceKey: string, targetKey: string) => Promise<FileOperationResult>;
    moveFile: (sourceKey: string, targetKey: string) => Promise<FileOperationResult>;

    // Download operations
    downloadFile: (key: string, localPath?: string) => Promise<FileOperationResult>;
    downloadFiles: (keys: string[], localPath?: string) => Promise<FileOperationResult>;

    // Search and filtering
    setFilter: (filter: Partial<FileFilter>) => void;
    clearFilter: () => void;
    setSortOptions: (options: FileSortOptions) => void;

    // File selection
    selectFile: (key: string) => void;
    deselectFile: (key: string) => void;
    selectAll: () => void;
    deselectAll: () => void;
    toggleSelection: (key: string) => void;

    // Utility methods
    getFilteredFiles: () => S3File[];
    getSortedFiles: (files: S3File[]) => S3File[];
    getSelectedFiles: () => S3File[];

    // Performance optimization methods
    getCacheStats: () => { size: number; hitRate: number; totalEntries: number };
    clearCache: () => void;
    preloadPaths: (paths: string[]) => Promise<void>;

    // State management
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

// File context menu actions
export interface FileContextAction {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    separator?: boolean;
    action: (file: S3File) => void;
}

// File preview types
export interface FilePreview {
    type: 'image' | 'text' | 'video' | 'audio' | 'document' | 'unknown';
    previewUrl?: string;
    thumbnailUrl?: string;
    canPreview: boolean;
}