import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DownloadProgress } from '../DownloadProgress';
import { DownloadTask } from '../../../types/download';

// Mock formatters
vi.mock('../../../utils/formatters', () => ({
    formatBytes: (bytes: number) => `${bytes} B`,
    formatDuration: (seconds: number) => `${seconds}s`,
}));

describe('DownloadProgress', () => {
    const mockTask: DownloadTask = {
        id: 'test-task-1',
        key: 'test/file.txt',
        fileName: 'file.txt',
        localPath: '/downloads/file.txt',
        progress: 50,
        status: 'downloading',
        downloadedBytes: 512,
        totalBytes: 1024,
        retryCount: 0,
        maxRetries: 3,
        speed: 1024,
        estimatedTimeRemaining: 30,
        startTime: new Date('2023-01-01T10:00:00Z'),
    };

    const mockCallbacks = {
        onPause: vi.fn(),
        onResume: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onRemove: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render download task information', () => {
        render(<DownloadProgress task={mockTask} {...mockCallbacks} />);

        expect(screen.getByText('file.txt')).toBeInTheDocument();
        expect(screen.getByText('test/file.txt')).toBeInTheDocument();
        expect(screen.getByText('下载中')).toBeInTheDocument();
        expect(screen.getByText('512 B / 1024 B')).toBeInTheDocument();
        expect(screen.getByText('1024 B/s')).toBeInTheDocument();
        expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('should render compact view when compact prop is true', () => {
        render(<DownloadProgress task={mockTask} {...mockCallbacks} compact />);

        // In compact view, some details should not be visible
        expect(screen.getByText('file.txt')).toBeInTheDocument();
        expect(screen.queryByText('test/file.txt')).not.toBeInTheDocument();
    });

    it('should show pause and cancel buttons for downloading task', () => {
        render(<DownloadProgress task={mockTask} {...mockCallbacks} />);

        expect(screen.getByText('暂停')).toBeInTheDocument();
        expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('should show resume and cancel buttons for paused task', () => {
        const pausedTask = { ...mockTask, status: 'paused' as const };
        render(<DownloadProgress task={pausedTask} {...mockCallbacks} />);

        expect(screen.getByText('继续')).toBeInTheDocument();
        expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('should show retry and remove buttons for failed task', () => {
        const failedTask = {
            ...mockTask,
            status: 'failed' as const,
            error: 'Network error'
        };
        render(<DownloadProgress task={failedTask} {...mockCallbacks} />);

        expect(screen.getByText('重试')).toBeInTheDocument();
        expect(screen.getByText('移除')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should show only remove button for completed task', () => {
        const completedTask = {
            ...mockTask,
            status: 'completed' as const,
            progress: 100,
            endTime: new Date('2023-01-01T10:01:00Z')
        };
        render(<DownloadProgress task={completedTask} {...mockCallbacks} />);

        expect(screen.getByText('移除')).toBeInTheDocument();
        expect(screen.queryByText('暂停')).not.toBeInTheDocument();
        expect(screen.queryByText('取消')).not.toBeInTheDocument();
    });

    it('should not show retry button when max retries reached', () => {
        const failedTask = {
            ...mockTask,
            status: 'failed' as const,
            retryCount: 3,
            maxRetries: 3,
            error: 'Max retries reached'
        };
        render(<DownloadProgress task={failedTask} {...mockCallbacks} />);

        expect(screen.queryByText('重试')).not.toBeInTheDocument();
        expect(screen.getByText('移除')).toBeInTheDocument();
    });

    it('should call onPause when pause button is clicked', () => {
        render(<DownloadProgress task={mockTask} {...mockCallbacks} />);

        fireEvent.click(screen.getByText('暂停'));
        expect(mockCallbacks.onPause).toHaveBeenCalledWith('test-task-1');
    });

    it('should call onResume when resume button is clicked', () => {
        const pausedTask = { ...mockTask, status: 'paused' as const };
        render(<DownloadProgress task={pausedTask} {...mockCallbacks} />);

        fireEvent.click(screen.getByText('继续'));
        expect(mockCallbacks.onResume).toHaveBeenCalledWith('test-task-1');
    });

    it('should call onCancel when cancel button is clicked', () => {
        render(<DownloadProgress task={mockTask} {...mockCallbacks} />);

        fireEvent.click(screen.getByText('取消'));
        expect(mockCallbacks.onCancel).toHaveBeenCalledWith('test-task-1');
    });

    it('should call onRetry when retry button is clicked', () => {
        const failedTask = {
            ...mockTask,
            status: 'failed' as const,
            error: 'Network error'
        };
        render(<DownloadProgress task={failedTask} {...mockCallbacks} />);

        fireEvent.click(screen.getByText('重试'));
        expect(mockCallbacks.onRetry).toHaveBeenCalledWith('test-task-1');
    });

    it('should call onRemove when remove button is clicked', () => {
        const completedTask = {
            ...mockTask,
            status: 'completed' as const,
            progress: 100
        };
        render(<DownloadProgress task={completedTask} {...mockCallbacks} />);

        fireEvent.click(screen.getByText('移除'));
        expect(mockCallbacks.onRemove).toHaveBeenCalledWith('test-task-1');
    });

    it('should display correct status colors', () => {
        const statuses = [
            { status: 'downloading' as const, expectedClass: 'text-blue-600' },
            { status: 'completed' as const, expectedClass: 'text-green-600' },
            { status: 'failed' as const, expectedClass: 'text-red-600' },
            { status: 'paused' as const, expectedClass: 'text-yellow-600' },
            { status: 'cancelled' as const, expectedClass: 'text-gray-600' },
        ];

        statuses.forEach(({ status, expectedClass }) => {
            const taskWithStatus = { ...mockTask, status };
            const { container } = render(<DownloadProgress task={taskWithStatus} {...mockCallbacks} />);

            const statusElement = container.querySelector(`.${expectedClass.replace(' ', '.')}`);
            expect(statusElement).toBeInTheDocument();
        });
    });

    it('should display local path when provided', () => {
        render(<DownloadProgress task={mockTask} {...mockCallbacks} />);

        expect(screen.getByText('/downloads/file.txt')).toBeInTheDocument();
    });

    it('should handle missing optional data gracefully', () => {
        const minimalTask: DownloadTask = {
            id: 'minimal-task',
            key: 'minimal.txt',
            fileName: 'minimal.txt',
            localPath: '/minimal.txt',
            progress: 0,
            status: 'pending',
            downloadedBytes: 0,
            totalBytes: 0,
            retryCount: 0,
            maxRetries: 3,
        };

        render(<DownloadProgress task={minimalTask} {...mockCallbacks} />);

        expect(screen.getByText('minimal.txt')).toBeInTheDocument();
        expect(screen.getByText('等待中')).toBeInTheDocument();
    });
});