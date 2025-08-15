import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RenameModal } from '../RenameModal';
import { S3File } from '../../../types/file';

describe('RenameModal', () => {
    const mockFile: S3File = {
        key: 'folder/test-file.txt',
        name: 'test-file.txt',
        size: 1024,
        lastModified: new Date('2023-01-01'),
        etag: 'test-etag',
        isDirectory: false,
    };

    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    const defaultProps = {
        isOpen: true,
        file: mockFile,
        onClose: mockOnClose,
        onConfirm: mockOnConfirm,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnConfirm.mockResolvedValue(undefined);
    });

    it('should render rename modal when open', () => {
        render(<RenameModal {...defaultProps} />);

        expect(screen.getByText('重命名文件')).toBeInTheDocument();
        expect(screen.getByText('重命名 "test-file.txt"')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test-file.txt')).toBeInTheDocument();
        expect(screen.getByText('取消')).toBeInTheDocument();
        expect(screen.getByText('重命名')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(<RenameModal {...defaultProps} isOpen={false} />);

        expect(screen.queryByText('重命名文件')).not.toBeInTheDocument();
    });

    it('should not render when file is null', () => {
        render(<RenameModal {...defaultProps} file={null} />);

        expect(screen.queryByText('重命名文件')).not.toBeInTheDocument();
    });

    it('should call onConfirm with correct parameters when form is submitted', async () => {
        const user = userEvent.setup();
        render(<RenameModal {...defaultProps} />);

        const input = screen.getByDisplayValue('test-file.txt');
        await user.clear(input);
        await user.type(input, 'new-name.txt');

        const submitButton = screen.getByText('重命名');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledWith('folder/test-file.txt', 'folder/new-name.txt');
        });
    });

    it('should show error for invalid file names', async () => {
        const user = userEvent.setup();
        render(<RenameModal {...defaultProps} />);

        const input = screen.getByDisplayValue('test-file.txt');
        await user.clear(input);
        await user.type(input, 'invalid<name.txt');

        const submitButton = screen.getByText('重命名');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('文件名不能包含以下字符: < > : " / \\ | ? *')).toBeInTheDocument();
        });

        expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should disable submit button for empty file name', async () => {
        const user = userEvent.setup();
        render(<RenameModal {...defaultProps} />);

        const input = screen.getByDisplayValue('test-file.txt');
        await user.clear(input);

        const submitButton = screen.getByText('重命名');
        expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when name is unchanged', async () => {
        render(<RenameModal {...defaultProps} />);

        const submitButton = screen.getByText('重命名');
        expect(submitButton).toBeDisabled();
    });

    it('should handle onConfirm errors', async () => {
        const user = userEvent.setup();
        const error = new Error('Rename failed');
        mockOnConfirm.mockRejectedValue(error);

        render(<RenameModal {...defaultProps} />);

        const input = screen.getByDisplayValue('test-file.txt');
        await user.clear(input);
        await user.type(input, 'new-name.txt');

        const submitButton = screen.getByText('重命名');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Rename failed')).toBeInTheDocument();
        });
    });

    it('should disable form during submission', async () => {
        const user = userEvent.setup();
        let resolvePromise: () => void;
        const promise = new Promise<void>((resolve) => {
            resolvePromise = resolve;
        });
        mockOnConfirm.mockReturnValue(promise);

        render(<RenameModal {...defaultProps} />);

        const input = screen.getByDisplayValue('test-file.txt');
        await user.clear(input);
        await user.type(input, 'new-name.txt');

        const submitButton = screen.getByText('重命名');
        await user.click(submitButton);

        // Form should be disabled during submission
        expect(input).toBeDisabled();
        expect(screen.getByText('取消')).toBeDisabled();

        // Resolve the promise to complete submission
        resolvePromise!();
        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});