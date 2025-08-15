import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileItem } from '../FileItem'
import { S3File } from '../../../types/file'
import { useFileStore } from '../../../stores/fileStore'

// Mock the file store
vi.mock('../../../stores/fileStore')

const mockUseFileStore = vi.mocked(useFileStore)

describe('FileItem', () => {
    const mockOnNavigate = vi.fn()
    const mockOnContextMenu = vi.fn()
    const mockToggleSelection = vi.fn()

    const createMockFile = (overrides: Partial<S3File> = {}): S3File => ({
        key: 'test-file.txt',
        name: 'test-file.txt',
        size: 1024,
        lastModified: new Date('2023-01-01T12:00:00Z'),
        etag: 'test-etag',
        isDirectory: false,
        ...overrides
    })

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseFileStore.mockReturnValue({
            files: [],
            currentPath: '',
            loading: false,
            error: null,
            selectedFiles: [],
            loadFiles: vi.fn(),
            navigateToPath: vi.fn(),
            deleteFile: vi.fn(),
            downloadFile: vi.fn(),
            toggleSelection: mockToggleSelection,
            clearSelection: vi.fn(),
            selectAll: vi.fn(),
            searchQuery: '',
            setSearchQuery: vi.fn(),
            filteredFiles: [],
        })
    })

    it('should render file item with basic information', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        expect(screen.getByText('test-file.txt')).toBeInTheDocument()
        expect(screen.getByText('1 KB')).toBeInTheDocument()
        expect(screen.getByText('TXT')).toBeInTheDocument()
    })

    it('should render directory item', () => {
        const file = createMockFile({
            name: 'test-folder',
            isDirectory: true,
            size: 0
        })

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        expect(screen.getByText('test-folder')).toBeInTheDocument()
        expect(screen.getByText('文件夹')).toBeInTheDocument()
        expect(screen.getByText('-')).toBeInTheDocument() // Size for directory

        // Directory name should have blue color
        const nameElement = screen.getByText('test-folder')
        expect(nameElement).toHaveClass('text-blue-600')
    })

    it('should handle file click navigation', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        const fileItem = screen.getByText('test-file.txt').closest('div')
        fireEvent.click(fileItem!)

        expect(mockOnNavigate).toHaveBeenCalledWith('test-file.txt', false)
    })

    it('should handle directory click navigation', () => {
        const file = createMockFile({
            name: 'test-folder',
            isDirectory: true
        })

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        const fileItem = screen.getByText('test-folder').closest('div')
        fireEvent.click(fileItem!)

        expect(mockOnNavigate).toHaveBeenCalledWith('test-file.txt', true)
    })

    it('should handle checkbox selection', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        const checkbox = screen.getByRole('checkbox')
        fireEvent.click(checkbox)

        expect(mockToggleSelection).toHaveBeenCalledWith('test-file.txt')
        expect(mockOnNavigate).not.toHaveBeenCalled() // Should not navigate when clicking checkbox
    })

    it('should show selected state', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={true}
                onNavigate={mockOnNavigate}
            />
        )

        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeChecked()

        // Should have selected background
        const fileItem = screen.getByText('test-file.txt').closest('div')
        expect(fileItem).toHaveClass('bg-blue-50')
    })

    it('should handle context menu', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
                onContextMenu={mockOnContextMenu}
            />
        )

        const fileItem = screen.getByText('test-file.txt').closest('div')
        fireEvent.contextMenu(fileItem!)

        expect(mockOnContextMenu).toHaveBeenCalledWith(expect.any(Object), file)
    })

    it('should format file sizes correctly', () => {
        const testCases = [
            { size: 0, expected: '-' },
            { size: 512, expected: '512 B' },
            { size: 1024, expected: '1 KB' },
            { size: 1048576, expected: '1 MB' },
            { size: 1073741824, expected: '1 GB' },
            { size: 1536, expected: '1.5 KB' },
        ]

        testCases.forEach(({ size, expected }) => {
            const file = createMockFile({ size })
            const { rerender } = render(
                <FileItem
                    file={file}
                    isSelected={false}
                    onNavigate={mockOnNavigate}
                />
            )

            expect(screen.getByText(expected)).toBeInTheDocument()

            if (size !== testCases[testCases.length - 1].size) {
                rerender(
                    <FileItem
                        file={createMockFile({ size: testCases[testCases.indexOf({ size, expected }) + 1].size })}
                        isSelected={false}
                        onNavigate={mockOnNavigate}
                    />
                )
            }
        })
    })

    it('should display correct file types', () => {
        const testCases = [
            { name: 'image.jpg', expected: '图片' },
            { name: 'document.pdf', expected: 'PDF' },
            { name: 'script.js', expected: 'JavaScript' },
            { name: 'archive.zip', expected: '压缩包' },
            { name: 'video.mp4', expected: '视频' },
            { name: 'unknown.xyz', expected: 'XYZ' },
            { name: 'noextension', expected: '文件' },
        ]

        testCases.forEach(({ name, expected }) => {
            const file = createMockFile({ name })
            const { rerender } = render(
                <FileItem
                    file={file}
                    isSelected={false}
                    onNavigate={mockOnNavigate}
                />
            )

            expect(screen.getByText(expected)).toBeInTheDocument()

            if (name !== testCases[testCases.length - 1].name) {
                rerender(
                    <FileItem
                        file={createMockFile({ name: testCases[testCases.indexOf({ name, expected }) + 1].name })}
                        isSelected={false}
                        onNavigate={mockOnNavigate}
                    />
                )
            }
        })
    })

    it('should format dates correctly', () => {
        const file = createMockFile({
            lastModified: new Date('2023-12-25T15:30:45Z')
        })

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        // Should format date in Chinese locale
        expect(screen.getByText(/2023/)).toBeInTheDocument()
        expect(screen.getByText(/12/)).toBeInTheDocument()
        expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it('should render different icons for different file types', () => {
        const testCases = [
            { name: 'folder', isDirectory: true },
            { name: 'image.jpg', isDirectory: false },
            { name: 'document.pdf', isDirectory: false },
            { name: 'script.js', isDirectory: false },
            { name: 'archive.zip', isDirectory: false },
            { name: 'unknown.txt', isDirectory: false },
        ]

        testCases.forEach(({ name, isDirectory }) => {
            const file = createMockFile({ name, isDirectory })
            const { container, rerender } = render(
                <FileItem
                    file={file}
                    isSelected={false}
                    onNavigate={mockOnNavigate}
                />
            )

            const icon = container.querySelector('svg')
            expect(icon).toBeInTheDocument()

            if (name !== testCases[testCases.length - 1].name) {
                const nextCase = testCases[testCases.indexOf({ name, isDirectory }) + 1]
                rerender(
                    <FileItem
                        file={createMockFile({ name: nextCase.name, isDirectory: nextCase.isDirectory })}
                        isSelected={false}
                        onNavigate={mockOnNavigate}
                    />
                )
            }
        })
    })

    it('should apply custom className', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
                className="custom-class"
            />
        )

        const fileItem = screen.getByText('test-file.txt').closest('div')
        expect(fileItem).toHaveClass('custom-class')
    })

    it('should prevent event propagation when clicking checkbox', () => {
        const file = createMockFile()

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        const checkbox = screen.getByRole('checkbox')
        fireEvent.click(checkbox)

        expect(mockToggleSelection).toHaveBeenCalled()
        expect(mockOnNavigate).not.toHaveBeenCalled()
    })

    it('should handle files with very long names', () => {
        const file = createMockFile({
            name: 'this-is-a-very-long-file-name-that-should-be-truncated-when-displayed.txt'
        })

        render(
            <FileItem
                file={file}
                isSelected={false}
                onNavigate={mockOnNavigate}
            />
        )

        const nameElement = screen.getByText(file.name)
        expect(nameElement).toHaveClass('truncate')
    })
})