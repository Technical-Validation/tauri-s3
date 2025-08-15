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

describe('File Browser Integration', () => {
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
            key: 'documents/',
            name: 'documents',
            size: 0,
            lastModified: new Date('2023-01-01'),
            etag: '',
            isDirectory: true,
        },
        {
            key: 'images/',
            name: 'images',
            size: 0,
            lastModified: new Date('2023-01-02'),
            etag: '',
            isDirectory: true,
        },
        {
            key: 'readme.txt',
            name: 'readme.txt',
            size: 1024,
            lastModified: new Date('2023-01-03'),
            etag: 'abc123',
            isDirectory: false,
        },
        {
            key: 'config.json',
            name: 'config.json',
            size: 512,
            lastModified: new Date('2023-01-04'),
            etag: 'def456',
            isDirectory: false,
        },
    ];

    const createMockFileStore = (overrides = {}) => ({
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
        toggleSelection: vi.fn(),
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();

        mockFileStore.mockReturnValue(createMockFileStore());
        mockConfigStore.mockReturnValue({
            getActiveConfig: () => mockConfig,
        });
    });

    it('should render complete file browser with all components', async () => {
        render(<FileBrowser />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('根目录')).toBeInTheDocument();
        });

        // Check breadcrumb
        expect(screen.getByText('根目录')).toBeInTheDocument();

        // Check toolbar buttons
        expect(screen.getByText('刷新')).toBeInTheDocument();

        // Check search input
        expect(screen.getByPlaceholderText('搜索文件和文件夹...')).toBeInTheDocument();

        // Check advanced filter button
        expect(screen.getByText('高级筛选')).toBeInTheDocument();

        // Check sort options
        expect(screen.getByText('排序:')).toBeInTheDocument();
        expect(screen.getByText('名称')).toBeInTheDocument();
        expect(screen.getByText('大小')).toBeInTheDocument();
        expect(screen.getByText('修改时间')).toBeInTheDocument();
        expect(screen.getByText('类型')).toBeInTheDocument();

        // Check file list headers
        expect(screen.getByText('名称')).toBeInTheDocument();
        expect(screen.getByText('大小')).toBeInTheDocument();
        expect(screen.getByText('类型')).toBeInTheDocument();
        expect(screen.getByText('修改时间')).toBeInTheDocument();

        // Check files are displayed
        expect(screen.getByText('documents')).toBeInTheDocument();
        expect(screen.getByText('images')).toBeInTheDocument();
        expect(screen.getByText('readme.txt')).toBeInTheDocument();
        expect(screen.getByText('config.json')).toBeInTheDocument();

        // Check file count
        expect(screen.getByText('4 项')).toBeInTheDocument();
    });

    it('should handle search functionality', async () => {
        const mockSetFilter = vi.fn();
        mockFileStore.mockReturnValue(createMockFileStore({
            setFilter: mockSetFilter,
        }));

        render(<FileBrowser />);

        const searchInput = screen.getByPlaceholderText('搜索文件和文件夹...');

        fireEvent.change(searchInput, { target: { value: 'readme' } });

        expect(mockSetFilter).toHaveBeenCalledWith({ searchTerm: 'readme' });
    });

    it('should handle advanced filters', async () => {
        const mockSetFilter = vi.fn();
        mockFileStore.mockReturnValue(createMockFileStore({
            setFilter: mockSetFilter,
        }));

        render(<FileBrowser />);

        // Open advanced filters
        fireEvent.click(screen.getByText('高级筛选'));

        // Check advanced filter options are visible
        expect(screen.getByText('文件类型')).toBeInTheDocument();
        expect(screen.getByText('文件大小 (KB)')).toBeInTheDocument();
        expect(screen.getByText('显示隐藏文件')).toBeInTheDocument();

        // Change file type filter
        const fileTypeSelect = screen.getByDisplayValue('所有类型');
        fireEvent.change(fileTypeSelect, { target: { value: 'folder' } });

        expect(mockSetFilter).toHaveBeenCalledWith({ fileType: 'folder' });
    });

    it('should handle sorting', async () => {
        const mockSetSortOptions = vi.fn();
        mockFileStore.mockReturnValue(createMockFileStore({
            setSortOptions: mockSetSortOptions,
        }));

        render(<FileBrowser />);

        // Click on size sort button
        const sizeButton = screen.getAllByText('大小')[1]; // Second one is the sort button
        fireEvent.click(sizeButton);

        expect(mockSetSortOptions).toHaveBeenCalledWith({
            field: 'size',
            direction: 'asc',
        });
    });

    it('should handle file selection', async () => {
        const mockToggleSelection = vi.fn();
        mockFileStore.mockReturnValue(createMockFileStore({
            toggleSelection: mockToggleSelection,
        }));

        render(<FileBrowser />);

        // Find and click a checkbox (first file's checkbox)
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        expect(mockToggleSelection).toHaveBeenCalledWith('documents/');
    });

    it('should show filtered file count', async () => {
        const filteredFiles = [mockFiles[0], mockFiles[2]]; // 2 files
        mockFileStore.mockReturnValue(createMockFileStore({
            getFilteredFiles: vi.fn(() => filteredFiles),
        }));

        render(<FileBrowser />);

        expect(screen.getByText('显示 2 / 4 项')).toBeInTheDocument();
    });

    it('should handle navigation to subdirectory', async () => {
        const mockNavigateToPath = vi.fn();
        mockFileStore.mockReturnValue(createMockFileStore({
            navigateToPath: mockNavigateToPath,
            currentPath: 'documents/',
        }));

        render(<FileBrowser />);

        // Should show navigate up button when not at root
        expect(screen.getByText('返回上级')).toBeInTheDocument();
    });

    it('should show empty state when no files', async () => {
        mockFileStore.mockReturnValue(createMockFileStore({
            files: [],
            getFilteredFiles: vi.fn(() => []),
        }));

        render(<FileBrowser />);

        expect(screen.getByText('此文件夹为空')).toBeInTheDocument();
        expect(screen.getByText('此位置没有文件或文件夹')).toBeInTheDocument();
    });
});