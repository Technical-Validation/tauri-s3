import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { S3File } from '../../../types/file';

describe('DeleteConfirmModal', () => {
    const mockFiles: S3File[] = [
        {
            key: 'test-file.txt',
            name: 'test-file.txt',
            size: 1024,
            lastModified: new Date('2023-01-01'),
            etag: 'test-etag',
            isDirectory: false,
        },
        {
            key: 'folder/',
            name: 'folder',
            size: 0,
            lastModified: new Date('2023-01-01'),
            etag: 'folder-etag',
            isDirectory: true,
        },
    ];

    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    const defaultProps = {
        isOpen: true,
        files: [mockFiles[0]],
        onClose: mockOnClose,
        onConfirm: mockOnConfirm,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnConfirm.mockResolvedValue(undefined);
    });

    it('should render delete confirmation modal for single file', () => {
        render(<DeleteConfirmModal {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('删除文件')).toBeInTheDocument();
        expect(screen.getByText('您确定要删除 "test-file.txt" 吗？此操作无法撤销。')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument();
    });

    it('should render delete confirmation modal for multiple files', () => {
        render(<DeleteConfirmModal {...defaultProps} files={mockFiles} />);

        expect(screen.getByText('删除 2 个项目')).toBeInTheDocument();
        expect(screen.getByText('您确定要删除选中的文件吗？此操作无法撤销。')).toBeInTheDocument();
        expect(screen.getByText('将要删除的文件：')).toBeInTheDocument();
        expect(screen.getByText('test-file.txt')).toBeInTheDocument();
        expect(screen.getByText('folder')).toBeInTheDocument();
    });

    it('should show warning for directories', () => {
        render(<DeleteConfirmModal {...defaultProps} files={[mockFiles[1]]} />);

        expect(screen.getByText('⚠️ 包含文件夹，文件夹内的所有内容也将被删除。')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(<DeleteConfirmModal {...defaultProps} isOpen={false} />);

        expect(screen.queryByText('确认删除')).not.toBeInTheDocument();
    });

    it('should call onConfirm with file keys when confirmed', async () => {
        const user = userEvent.setup();
        render(<DeleteConfirmModal {...defaultProps} files={mockFiles} />);

        const confirmButton = screen.getByRole('button', { name: '确认删除' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledWith(['test-file.txt', 'folder/']);
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel is clicked', async () => {
        const user = userEvent.setup();
        render(<DeleteConfirmModal {...defaultProps} />);

        const cancelButton = screen.getByText('取消');
        await user.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should disable buttons during deletion', async () => {
        const user = userEvent.setup();
        let resolvePromise: () => void;
        const promise = new Promise<void>((resolve) => {
            resolvePromise = resolve;
        });
        mockOnConfirm.mockReturnValue(promise);

        render(<DeleteConfirmModal {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: '确认删除' });
        await user.click(confirmButton);

        // Buttons should be disabled during deletion
        expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
        expect(screen.getByText('删除中...')).toBeInTheDocument();

        // Resolve the promise to complete deletion
        resolvePromise!();
        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should show file count for many files', () => {
        const manyFiles = Array.from({ length: 15 }, (_, i) => ({
            ...mockFiles[0],
            key: `file-${i}.txt`,
            name: `file-${i}.txt`,
        }));

        render(<DeleteConfirmModal {...defaultProps} files={manyFiles} />);

        expect(screen.getByText('包含 15 个文件和文件夹')).toBeInTheDocument();
        expect(screen.queryByText('将要删除的文件：')).not.toBeInTheDocument();
    });

    it('should handle deletion errors gracefully', async () => {
        const user = userEvent.setup();
        const error = new Error('Delete failed');
        mockOnConfirm.mockRejectedValue(error);

        render(<DeleteConfirmModal {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: '确认删除' });
        await user.click(confirmButton);

        // Should reset loading state after error
        await waitFor(() => {
            expect(confirmButton).not.toBeDisabled();
        });

        // Modal should remain open for user to retry or cancel
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});