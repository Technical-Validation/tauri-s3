import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FileBrowser } from '../FileBrowser';
import { useFileStore } from '../../../stores/fileStore';
import { useConfigStore } from '../../../stores/configStore';

// Mock the stores
vi.mock('../../../stores/fileStore');
vi.mock('../../../stores/configStore');

const mockFileStore = useFileStore as any;
const mockConfigStore = useConfigStore as any;

describe('FileBrowser', () => {
    const mockConfig = {
        id: 'test-config',
        name: 'Test Config',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        region: 'us-east-1',
        bucketName: 'test-bucket',
    };

    const mockFiles = [
        {
            key: 'folder1/',
            name: 'folder1',
            size: 0,
            lastModified: new Date('2023-01-01'),
            etag: '',
            isDirectory: true,
        },
        {
            key: 'file1.txt',
            name: 'file1.txt',
            size: 1024,
            lastModified: new Date('2023-01-02'),
            etag: 'abc123',
            isDirectory: false,
        },
    ];

    const defaultFileStore = {
        files: mockFiles,
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
        loadFiles: vi.fn().mockResolvedValue(undefined),
        refreshFiles: vi.fn().mockResolvedValue(undefined),
        navigateToPath: vi.fn(),
        navigateUp: vi.fn(),
        navigateToRoot: vi.fn(),
        setFilter: vi.fn(),
        setSortOptions: vi.fn(),
        clearError: vi.fn(),
        getFilteredFiles: vi.fn(() => mockFiles),
        getSortedFiles: vi.fn((files) => files),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockFileStore.mockReturnValue(defaultFileStore);
        mockConfigStore.mockReturnValue({
            getActiveConfig: () => mockConfig,
        });
    });

    it('should render file browser with active config', async () => {
        render(<FileBrowser />);

        await waitFor(() => {
            expect(screen.getByText('根目录')).toBeInTheDocument();
        });

        expect(screen.getByText('刷新')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('搜索文件和文件夹...')).toBeInTheDocument();
    });

    it('should show no config message when no active config', () => {
        mockConfigStore.mockReturnValue({
            getActiveConfig: () => null,
        });

        render(<FileBrowser />);

        expect(screen.getByText('没有活跃的S3配置')).toBeInTheDocument();
        expect(screen.getByText('请先配置S3连接信息才能浏览文件')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        mockFileStore.mockReturnValue({
            ...defaultFileStore,
            loading: true,
        });

        render(<FileBrowser />);

        expect(screen.getByText('加载文件列表...')).toBeInTheDocument();
    });

    it('should show error message', () => {
        const errorMessage = 'Failed to load files';
        mockFileStore.mockReturnValue({
            ...defaultFileStore,
            error: errorMessage,
        });

        render(<FileBrowser />);

        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should handle refresh button click', () => {
        const mockRefreshFiles = vi.fn();
        mockFileStore.mockReturnValue({
            ...defaultFileStore,
            refreshFiles: mockRefreshFiles,
        });

        render(<FileBrowser />);

        fireEvent.click(screen.getByText('刷新'));
        expect(mockRefreshFiles).toHaveBeenCalled();
    });

    it('should show navigate up button when not at root', () => {
        mockFileStore.mockReturnValue({
            ...defaultFileStore,
            currentPath: 'folder1/',
        });

        render(<FileBrowser />);

        expect(screen.getByText('返回上级')).toBeInTheDocument();
    });

    it('should handle navigate up button click', () => {
        const mockNavigateUp = vi.fn();
        mockFileStore.mockReturnValue({
            ...defaultFileStore,
            currentPath: 'folder1/',
            navigateUp: mockNavigateUp,
        });

        render(<FileBrowser />);

        fireEvent.click(screen.getByText('返回上级'));
        expect(mockNavigateUp).toHaveBeenCalled();
    });

    it('should handle error dismissal', () => {
        const mockClearError = vi.fn();
        mockFileStore.mockReturnValue({
            ...defaultFileStore,
            error: 'Test error',
            clearError: mockClearError,
        });

        render(<FileBrowser />);

        const dismissButton = screen.getByRole('button', { name: '关闭' });
        fireEvent.click(dismissButton);
        expect(mockClearError).toHaveBeenCalled();
    });
});