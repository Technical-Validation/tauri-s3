import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { FileContextMenu } from '../FileContextMenu';
import { S3File } from '../../../types/file';

// Mock the file store
const mockUseFileStore = vi.fn();
vi.mock('../../../stores/fileStore', () => ({
    useFileStore: () => mockUseFileStore(),
}));

describe('FileContextMenu', () => {
    const mockFile: S3File = {
        key: 'test-file.txt',
        name: 'test-file.txt',
        size: 1024,
        lastModified: new Date('2023-01-01'),
        etag: 'test-etag',
        isDirectory: false,
    };

    const mockOnClose = vi.fn();
    const mockOnAction = vi.fn();

    const defaultProps = {
        file: mockFile,
        isOpen: true,
        position: { x: 100, y: 100 },
        onClose: mockOnClose,
        onAction: mockOnAction,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseFileStore.mockReturnValue({
            selection: {
                selectedFiles: new Set(),
                selectionCount: 0,
            },
        });
    });

    it('should render context menu when open', () => {
        render(<FileContextMenu {...defaultProps} />);

        expect(screen.getByText('下载')).toBeInTheDocument();
        expect(screen.getByText('复制')).toBeInTheDocument();
        expect(screen.getByText('移动')).toBeInTheDocument();
        expect(screen.getByText('重命名')).toBeInTheDocument();
        expect(screen.getByText('删除')).toBeInTheDocument();
        expect(screen.getByText('属性')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(<FileContextMenu {...defaultProps} isOpen={false} />);

        expect(screen.queryByText('下载')).not.toBeInTheDocument();
    });

    it('should call onAction when menu item is clicked', () => {
        render(<FileContextMenu {...defaultProps} />);

        fireEvent.click(screen.getByText('下载'));

        expect(mockOnAction).toHaveBeenCalledWith('download', mockFile);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show batch actions when multiple files are selected', () => {
        mockUseFileStore.mockReturnValue({
            selection: {
                selectedFiles: new Set([mockFile.key, 'other-file.txt']),
                selectionCount: 2,
            },
        });

        render(<FileContextMenu {...defaultProps} />);

        expect(screen.getByText('下载选中的 2 个文件')).toBeInTheDocument();
        expect(screen.getByText('删除选中的 2 个文件')).toBeInTheDocument();
        expect(screen.queryByText('重命名')).not.toBeInTheDocument();
        expect(screen.queryByText('属性')).not.toBeInTheDocument();
    });

    it('should close menu when clicking outside', () => {
        render(<FileContextMenu {...defaultProps} />);

        fireEvent.mouseDown(document.body);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close menu when pressing Escape', () => {
        render(<FileContextMenu {...defaultProps} />);

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(mockOnClose).toHaveBeenCalled();
    });
});