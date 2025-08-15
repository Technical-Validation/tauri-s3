import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadQueue } from '../UploadQueue';
import { useUploadStore } from '../../../stores/uploadStore';
import { UploadTask } from '../../../types/upload';

// Mock the upload store
vi.mock('../../../stores/uploadStore');
const mockUseUploadStore = useUploadStore as any;

describe('UploadQueue', () => {
    const mockActions = {
        startAllUploads: vi.fn(),
        pauseAllUploads: vi.fn(),
        cancelAllUploads: vi.fn(),
        retryFailedUploads: vi.fn(),
        clearCompleted: vi.fn(),
        clearFailed: vi.fn(),
        clearAll: vi.fn(),
        startUpload: vi.fn(),
        pauseUpload: vi.fn(),
        resumeUpload: vi.fn(),
        cancelUpload: vi.fn(),
        retryUpload: vi.fn(),
        removeTask: vi.fn(),
    };

    const createMockTask = (overrides: Partial<UploadTask> = {}): UploadTask => ({
        id: 'task-1',
        file: new File(['test'], 'test.txt', { type: 'text/plain' }),
        key: 'test.txt',
        progress: 0,
        status: 'pending',
        uploadedBytes: 0,
        totalBytes: 1024,
        retryCount: 0,
        maxRetries: 3,
        speed: 0,
        estimatedTimeRemaining: 0,
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no tasks', () => {
        mockUseUploadStore.mockReturnValue({
            tasks: [],
            queue: {
                tasks: [],
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 0,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 0,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        expect(screen.getByText('No uploads in queue')).toBeInTheDocument();
    });

    it('renders queue with tasks', () => {
        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'pending' }),
            createMockTask({ id: 'task-2', status: 'uploading', progress: 50 }),
            createMockTask({ id: 'task-3', status: 'completed', progress: 100 }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 1,
                maxConcurrentUploads: 3,
                totalProgress: 50,
                overallSpeed: 1024,
            },
            statistics: {
                totalFiles: 3,
                completedFiles: 1,
                failedFiles: 0,
                totalBytes: 3072,
                uploadedBytes: 1536,
                averageSpeed: 1024,
                totalTime: 10,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        expect(screen.getByText('Upload Queue (3)')).toBeInTheDocument();
        expect(screen.getByText('Active: 1')).toBeInTheDocument();
        expect(screen.getByText('Completed: 1')).toBeInTheDocument();
        expect(screen.getByText('Failed: 0')).toBeInTheDocument();
    });

    it('shows overall progress', () => {
        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'uploading', progress: 50, uploadedBytes: 512 }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 1,
                maxConcurrentUploads: 3,
                totalProgress: 50,
                overallSpeed: 1024,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 1024,
                uploadedBytes: 512,
                averageSpeed: 1024,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        expect(screen.getByText('Overall Progress')).toBeInTheDocument();
        expect(screen.getAllByText(/512 Bytes/)[0]).toBeInTheDocument();
        expect(screen.getByText('Speed: 1 KB/s')).toBeInTheDocument();
    });

    it('handles start all uploads', async () => {
        const user = userEvent.setup();
        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'pending' }),
            createMockTask({ id: 'task-2', status: 'pending' }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 2,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 2048,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        const startAllButton = screen.getByText('Start All');
        await user.click(startAllButton);

        expect(mockActions.startAllUploads).toHaveBeenCalled();
    });

    it('handles pause and resume uploads', async () => {
        const user = userEvent.setup();
        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'uploading', progress: 50 }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 1,
                maxConcurrentUploads: 3,
                totalProgress: 50,
                overallSpeed: 1024,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 1024,
                uploadedBytes: 512,
                averageSpeed: 1024,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        const pauseButton = screen.getByText('Pause');
        await user.click(pauseButton);

        expect(mockActions.pauseUpload).toHaveBeenCalledWith('task-1');
    });

    it('handles retry failed uploads', async () => {
        const user = userEvent.setup();
        const mockTasks = [
            createMockTask({
                id: 'task-1',
                status: 'failed',
                error: 'Network error',
                retryCount: 1,
                maxRetries: 3
            }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 1,
                totalBytes: 1024,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        const retryButton = screen.getByText('Retry (1/3)');
        await user.click(retryButton);

        expect(mockActions.retryUpload).toHaveBeenCalledWith('task-1');
    });

    it('handles clear all uploads', async () => {
        const user = userEvent.setup();
        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'pending' }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 1024,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        const clearAllButton = screen.getByText('Clear All');
        await user.click(clearAllButton);

        expect(mockActions.clearAll).toHaveBeenCalled();
    });

    it('renders individual task items correctly', () => {
        const mockTasks = [
            createMockTask({
                id: 'task-1',
                status: 'pending',
                file: new File(['test'], 'document.pdf', { type: 'application/pdf' }),
                key: 'uploads/document.pdf',
                totalBytes: 2048,
            }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 2048,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        expect(screen.getByText('document.pdf')).toBeInTheDocument();
        expect(screen.getByText(/uploads\/document\.pdf/)).toBeInTheDocument();
        expect(screen.getByText(/4 Bytes/)).toBeInTheDocument(); // File size is based on actual content
        expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('shows error message for failed tasks', () => {
        const mockTasks = [
            createMockTask({
                id: 'task-1',
                status: 'failed',
                error: 'Network connection failed',
                retryCount: 1,
            }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 1,
                totalBytes: 1024,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue />);

        expect(screen.getByText('Network connection failed')).toBeInTheDocument();
        expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
    });

    it('supports real-time updates with auto-refresh', () => {
        vi.useFakeTimers();

        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'uploading', progress: 25 }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 1,
                maxConcurrentUploads: 3,
                totalProgress: 25,
                overallSpeed: 1024,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 1024,
                uploadedBytes: 256,
                averageSpeed: 1024,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue autoRefresh={true} refreshInterval={500} />);

        // Fast-forward time to trigger refresh
        vi.advanceTimersByTime(500);

        expect(screen.getByText('Upload Queue (1)')).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('calls onTaskAction callback when provided', async () => {
        const user = userEvent.setup();
        const onTaskAction = vi.fn();
        const mockTasks = [
            createMockTask({ id: 'task-1', status: 'pending' }),
        ];

        mockUseUploadStore.mockReturnValue({
            tasks: mockTasks,
            queue: {
                tasks: mockTasks,
                activeUploads: 0,
                maxConcurrentUploads: 3,
                totalProgress: 0,
                overallSpeed: 0,
            },
            statistics: {
                totalFiles: 1,
                completedFiles: 0,
                failedFiles: 0,
                totalBytes: 1024,
                uploadedBytes: 0,
                averageSpeed: 0,
                totalTime: 0,
            },
            ...mockActions,
        } as any);

        render(<UploadQueue onTaskAction={onTaskAction} />);

        const startButton = screen.getByText('Start');
        await user.click(startButton);

        expect(onTaskAction).toHaveBeenCalledWith('task-1', 'start');
        expect(mockActions.startUpload).toHaveBeenCalledWith('task-1');
    });
});