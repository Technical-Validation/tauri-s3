import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MultipartUploadProgress } from '../MultipartUploadProgress';
import { UploadTask } from '../../../types/upload';

// Mock the formatters
vi.mock('../../../utils/formatters', () => ({
    formatBytes: (bytes: number) => `${bytes} B`,
    formatDuration: (seconds: number) => `${seconds}s`,
}));

describe('MultipartUploadProgress', () => {
    const createMockTask = (overrides: Partial<UploadTask> = {}): UploadTask => ({
        id: 'test-task-1',
        file: new File(['test content'], 'test-file.txt', { type: 'text/plain' }),
        key: 'uploads/test-file.txt',
        progress: 50,
        status: 'uploading',
        uploadedBytes: 5000000,
        totalBytes: 10000000,
        retryCount: 0,
        maxRetries: 3,
        speed: 1000000,
        estimatedTimeRemaining: 5,
        isMultipart: true,
        resumeData: {
            uploadId: 'test-upload-id',
            partSize: 10485760,
            totalParts: 10,
            completedParts: [
                { partNumber: 1, etag: 'etag1', size: 1048576 },
                { partNumber: 2, etag: 'etag2', size: 1048576 },
            ],
            lastPartNumber: 2,
        },
        uploadedParts: [
            { partNumber: 1, etag: 'etag1', size: 1048576 },
            { partNumber: 2, etag: 'etag2', size: 1048576 },
        ],
        ...overrides,
    });

    it('renders multipart upload progress correctly', () => {
        const task = createMockTask();
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('test-file.txt')).toBeInTheDocument();
        expect(screen.getByText('Multipart')).toBeInTheDocument();
        expect(screen.getByText('Uploading')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('displays parts progress for multipart uploads', () => {
        const task = createMockTask();
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('Parts Progress:')).toBeInTheDocument();
        expect(screen.getByText('2 / 10 parts')).toBeInTheDocument();
    });

    it('shows upload speed and ETA', () => {
        const task = createMockTask();
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('Speed:')).toBeInTheDocument();
        expect(screen.getByText('1000000 B/s')).toBeInTheDocument();
        expect(screen.getByText('ETA:')).toBeInTheDocument();
        expect(screen.getByText('5s')).toBeInTheDocument();
    });

    it('displays retry count when retries have occurred', () => {
        const task = createMockTask({ retryCount: 2 });
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('Retries:')).toBeInTheDocument();
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('shows pause information for paused uploads', () => {
        const task = createMockTask({
            status: 'paused',
            resumeData: {
                uploadId: 'test-upload-id',
                partSize: 10485760,
                totalParts: 10,
                completedParts: [
                    { partNumber: 1, etag: 'etag1', size: 1048576 },
                    { partNumber: 2, etag: 'etag2', size: 1048576 },
                ],
                lastPartNumber: 2,
            },
        });
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText(/Upload paused/)).toBeInTheDocument();
        expect(screen.getByText(/2 of 10 parts completed/)).toBeInTheDocument();
    });

    it('displays error information for failed uploads', () => {
        const task = createMockTask({
            status: 'failed',
            error: 'Network connection failed',
        });
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });

    it('shows completion time for completed uploads', () => {
        const startTime = new Date('2023-01-01T10:00:00Z');
        const endTime = new Date('2023-01-01T10:05:00Z');
        const task = createMockTask({
            status: 'completed',
            startTime,
            endTime,
        });
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText(/Completed in/)).toBeInTheDocument();
    });

    it('handles non-multipart uploads gracefully', () => {
        const task = createMockTask({
            isMultipart: false,
            resumeData: undefined,
            uploadedParts: undefined,
        });
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('test-file.txt')).toBeInTheDocument();
        expect(screen.queryByText('Multipart')).not.toBeInTheDocument();
        expect(screen.queryByText('Parts Progress:')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        const task = createMockTask();
        const { container } = render(
            <MultipartUploadProgress task={task} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('handles missing resume data gracefully', () => {
        const task = createMockTask({
            resumeData: undefined,
            uploadedParts: [],
        });
        render(<MultipartUploadProgress task={task} />);

        expect(screen.getByText('test-file.txt')).toBeInTheDocument();
        expect(screen.queryByText('Parts Progress:')).not.toBeInTheDocument();
    });

    it('displays correct status colors and icons', () => {
        const statuses: Array<{ status: any; expectedText: string }> = [
            { status: 'uploading', expectedText: 'Uploading' },
            { status: 'completed', expectedText: 'Completed' },
            { status: 'failed', expectedText: 'Failed' },
            { status: 'paused', expectedText: 'Paused' },
            { status: 'cancelled', expectedText: 'Cancelled' },
        ];

        statuses.forEach(({ status, expectedText }) => {
            const task = createMockTask({ status });
            const { rerender } = render(<MultipartUploadProgress task={task} />);

            expect(screen.getByText(expectedText)).toBeInTheDocument();

            // Clean up for next iteration
            rerender(<div />);
        });
    });
});