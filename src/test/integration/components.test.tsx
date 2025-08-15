import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast, useToast } from '../../components/common/Toast';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { FeedbackOverlay } from '../../components/common/FeedbackOverlay';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

describe('Enhanced UI Components', () => {
    describe('Toast', () => {
        it('should render toast with correct content', () => {
            const mockOnClose = vi.fn();

            render(
                <Toast
                    id="test-toast"
                    type="success"
                    title="Success!"
                    message="Operation completed successfully"
                    onClose={mockOnClose}
                />
            );

            expect(screen.getByText('Success!')).toBeInTheDocument();
            expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
        });

        it('should call onClose when close button is clicked', () => {
            const mockOnClose = vi.fn();

            render(
                <Toast
                    id="test-toast"
                    type="info"
                    title="Info"
                    onClose={mockOnClose}
                />
            );

            const closeButton = screen.getByRole('button');
            fireEvent.click(closeButton);

            expect(mockOnClose).toHaveBeenCalledWith('test-toast');
        });

        it('should auto-close after duration', async () => {
            const mockOnClose = vi.fn();

            render(
                <Toast
                    id="test-toast"
                    type="info"
                    title="Info"
                    duration={100}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalledWith('test-toast');
            }, { timeout: 200 });
        });
    });

    describe('StatusIndicator', () => {
        it('should render loading status', () => {
            render(<StatusIndicator status="loading" message="Loading..." />);

            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        });

        it('should render success status', () => {
            render(<StatusIndicator status="success" message="Success!" />);

            expect(screen.getByText('Success!')).toBeInTheDocument();
        });

        it('should render error status', () => {
            render(<StatusIndicator status="error" message="Error occurred" />);

            expect(screen.getByText('Error occurred')).toBeInTheDocument();
        });

        it('should hide message when showMessage is false', () => {
            render(
                <StatusIndicator
                    status="success"
                    message="Success!"
                    showMessage={false}
                />
            );

            expect(screen.queryByText('Success!')).not.toBeInTheDocument();
        });
    });

    describe('FeedbackOverlay', () => {
        it('should render loading overlay', () => {
            render(
                <FeedbackOverlay
                    isVisible={true}
                    type="loading"
                    title="Loading..."
                    message="Please wait"
                />
            );

            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(screen.getByText('Please wait')).toBeInTheDocument();
            expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        });

        it('should render success overlay', () => {
            render(
                <FeedbackOverlay
                    isVisible={true}
                    type="success"
                    title="Success!"
                    message="Operation completed"
                />
            );

            expect(screen.getByText('Success!')).toBeInTheDocument();
            expect(screen.getByText('Operation completed')).toBeInTheDocument();
        });

        it('should not render when not visible', () => {
            render(
                <FeedbackOverlay
                    isVisible={false}
                    type="loading"
                    title="Loading..."
                />
            );

            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        it('should call onClose when close button is clicked', () => {
            const mockOnClose = vi.fn();

            render(
                <FeedbackOverlay
                    isVisible={true}
                    type="success"
                    title="Success!"
                    onClose={mockOnClose}
                    showCloseButton={true}
                />
            );

            const closeButton = screen.getByRole('button');
            fireEvent.click(closeButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('SkeletonLoader', () => {
        it('should render text skeleton', () => {
            const { container } = render(<SkeletonLoader variant="text" />);

            expect(container.firstChild).toHaveClass('rounded');
            expect(container.firstChild).toHaveClass('animate-pulse');
        });

        it('should render circular skeleton', () => {
            const { container } = render(<SkeletonLoader variant="circular" />);

            expect(container.firstChild).toHaveClass('rounded-full');
        });

        it('should render rectangular skeleton', () => {
            const { container } = render(<SkeletonLoader variant="rectangular" />);

            expect(container.firstChild).toHaveClass('rounded-none');
        });

        it('should apply custom dimensions', () => {
            const { container } = render(
                <SkeletonLoader width="200px" height="100px" />
            );

            const element = container.firstChild as HTMLElement;
            expect(element.style.width).toBe('200px');
            expect(element.style.height).toBe('100px');
        });
    });

    describe('ErrorBoundary', () => {
        // Suppress console.error for these tests
        const originalError = console.error;
        beforeAll(() => {
            console.error = vi.fn();
        });

        afterAll(() => {
            console.error = originalError;
        });

        const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
            if (shouldThrow) {
                throw new Error('Test error');
            }
            return <div>No error</div>;
        };

        it('should render children when no error', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </ErrorBoundary>
            );

            expect(screen.getByText('No error')).toBeInTheDocument();
        });

        it('should render error UI when error occurs', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });

        it('should render custom fallback', () => {
            const customFallback = <div>Custom error message</div>;

            render(
                <ErrorBoundary fallback={customFallback}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Custom error message')).toBeInTheDocument();
        });

        it('should call onError callback', () => {
            const mockOnError = vi.fn();

            render(
                <ErrorBoundary onError={mockOnError}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(mockOnError).toHaveBeenCalled();
        });

        it('should reset error boundary when try again is clicked', () => {
            const { rerender } = render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

            const tryAgainButton = screen.getByText('Try Again');
            fireEvent.click(tryAgainButton);

            // Rerender with no error
            rerender(
                <ErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </ErrorBoundary>
            );

            expect(screen.getByText('No error')).toBeInTheDocument();
        });
    });
});