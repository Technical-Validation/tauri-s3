import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadProgress } from '../UploadProgress';
import { useUploadStore } from '../../../stores/uploadStore';
import { UploadTask } from '../../../types/upload';

// Mock the upload store
vi.mock('../../../stores/uploadStore');
const mockUseUploadStore = useUploadStore as any;

describe('UploadProgress', () => {
    const createMockTask = (overrides: Partial<UploadTask> = {}): UploadTask => ({
        id: 'task-1',
        file: new File(['test content'], 'test.txt', { type: 'text/plain' }),
        key: 'uploads/test.txt',
        progress: 0,
        status: 'pending',
        uploadedBytes: 0,
        totalBytes: 1024,
        retryCount: 0,
        maxRetries: 3,
        speed: 0,
        estimatedTimeRemaining: 0,
        startTime: new Date('2023-01-01T10:00:00Z'),
        endTime: undefined,
        ...overrides,
    });

    const mockStoreState = {
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
        getTask: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Overall Progress', () => {
        it('renders nothing when no tasks', () => {
            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
            } as any);

            const { container } = render(<UploadProgress />);
            expect(container.firstChild).toBeNull();
        });

        it('renders overall progress with tasks', () => {
            const mockTasks = [
                createMockTask({ id: 'task-1', status: 'uploading', progress: 50, uploadedBytes: 512 }),
                createMockTask({ id: 'task-2', status: 'completed', progress: 100, uploadedBytes: 1024 }),
            ];

            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                tasks: mockTasks,
                queue: {
                    ...mockStoreState.queue,
                    totalProgress: 75,
                    overallSpeed: 2048,
                },
                statistics: {
                    totalFiles: 2,
                    completedFiles: 1,
                    failedFiles: 0,
                    totalBytes: 2048,
                    uploadedBytes: 1536,
                    averageSpeed: 1024,
                    totalTime: 10,
                },
            } as any);

            render(<UploadProgress />);

            expect(screen.getByText('Upload Progress')).toBeInTheDocument();
            expect(screen.getByText('1 / 2 files')).toBeInTheDocument();
            expect(screen.getByText('1.5 KB / 2 KB')).toBeInTheDocument();
            expect(screen.getByText('2 KB/s')).toBeInTheDocument();
        });

        it('renders compact overall progress', () => {
            const mockTasks = [
                createMockTask({ id: 'task-1', status: 'uploading', progress: 25 }),
            ];

            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                tasks: mockTasks,
                queue: {
                    ...mockStoreState.queue,
                    totalProgress: 25,
                },
                statistics: {
                    totalFiles: 1,
                    completedFiles: 0,
                    failedFiles: 0,
                    totalBytes: 1024,
                    uploadedBytes: 256,
                    averageSpeed: 0,
                    totalTime: 0,
                },
            } as any);

            render(<UploadProgress compact />);

            expect(screen.getByText('25%')).toBeInTheDocument();
            expect(screen.queryByText('Upload Progress')).not.toBeInTheDocument();
        });

        it('shows active uploads in overall progress', () => {
            const mockTasks = [
                createMockTask({ id: 'task-1', status: 'uploading', progress: 30, speed: 1024 }),
                createMockTask({ id: 'task-2', status: 'uploading', progress: 60, speed: 2048 }),
                createMockTask({ id: 'task-3', status: 'completed', progress: 100 }),
            ];

            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                tasks: mockTasks,
                queue: {
                    ...mockStoreState.queue,
                    totalProgress: 63,
                    overallSpeed: 3072,
                },
                statistics: {
                    totalFiles: 3,
                    completedFiles: 1,
                    failedFiles: 0,
                    totalBytes: 3072,
                    uploadedBytes: 1945,
                    averageSpeed: 1536,
                    totalTime: 10,
                },
            } as any);

            render(<UploadProgress showDetails={true} />);

            expect(screen.getByText('Active Uploads (2)')).toBeInTheDocument();
            expect(screen.getByText('1 / 3 files')).toBeInTheDocument();
        });
    });

    describe('Individual Task Progress', () => {
        it('renders task progress when taskId is provided', () => {
            const mockTask = createMockTask({
                id: 'task-1',
                status: 'uploading',
                progress: 75,
                uploadedBytes: 768,
                speed: 1024,
                estimatedTimeRemaining: 30,
            });

            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                getTask: vi.fn().mockReturnValue(mockTask),
            } as any);

            render(<UploadProgress taskId="task-1" />);

            expect(screen.getByText('test.txt')).toBeInTheDocument();
            expect(screen.getByText('uploads/test.txt')).toBeInTheDocument();
            expect(screen.getByText('uploading')).toBeInTheDocument(); // Status is lowercase
            expect(screen.getByText('75%')).toBeInTheDocument();
        });

        it('returns null when task not found', () => {
            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                getTask: vi.fn().mockReturnValue(null),
            } as any);

            const { container } = render(<UploadProgress taskId="nonexistent" />);
            expect(container.firstChild).toBeNull();
        });

        it('supports real-time updates', () => {
            vi.useFakeTimers();

            const mockTask = createMockTask({
                id: 'task-1',
                status: 'uploading',
                progress: 50,
                uploadedBytes: 512,
            });

            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                getTask: vi.fn().mockReturnValue(mockTask),
            } as any);

            render(<UploadProgress taskId="task-1" realTimeUpdates={true} updateInterval={200} />);

            // Fast-forward time to trigger updates
            vi.advanceTimersByTime(200);

            expect(screen.getByText('test.txt')).toBeInTheDocument();

            vi.useRealTimers();
        });

        it('calls onProgressUpdate callback', () => {
            const onProgressUpdate = vi.fn();
            const mockTask = createMockTask({
                id: 'task-1',
                status: 'uploading',
                progress: 75,
            });

            mockUseUploadStore.mockReturnValue({
                ...mockStoreState,
                getTask: vi.fn().mockReturnValue(mockTask),
            } as any);

            render(<UploadProgress taskId="task-1" onProgressUpdate={onProgressUpdate} />);

            // The callback should be called with the task progress
            expect(onProgressUpdate).toHaveBeenCalledWith(75, 'task-1');
        });
    });
});