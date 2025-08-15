import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showDetails?: boolean;
    resetOnPropsChange?: boolean;
    resetKeys?: Array<string | number>;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
    private resetTimeoutId: number | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            eventId: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const eventId = this.logErrorToService(error, errorInfo);

        this.setState({
            errorInfo,
            eventId
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    componentDidUpdate(prevProps: Props) {
        const { resetOnPropsChange, resetKeys } = this.props;
        const { hasError } = this.state;

        // Reset error boundary when resetKeys change
        if (hasError && resetOnPropsChange && resetKeys) {
            const hasResetKeyChanged = resetKeys.some(
                (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
            );

            if (hasResetKeyChanged) {
                this.resetErrorBoundary();
            }
        }
    }

    componentWillUnmount() {
        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
        }
    }

    private logErrorToService = (error: Error, errorInfo: ErrorInfo): string => {
        // Generate a unique event ID
        const eventId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.group('🚨 Error Boundary Caught an Error');
            console.error('Error:', error);
            console.error('Error Info:', errorInfo);
            console.error('Component Stack:', errorInfo.componentStack);
            console.error('Event ID:', eventId);
            console.groupEnd();
        }

        // In production, you would send this to your error reporting service
        // Example: Sentry, LogRocket, Bugsnag, etc.
        /*
        if (process.env.NODE_ENV === 'production') {
            // Send to error reporting service
            errorReportingService.captureException(error, {
                contexts: {
                    react: {
                        componentStack: errorInfo.componentStack
                    }
                },
                tags: {
                    section: 'error_boundary'
                },
                extra: errorInfo
            });
        }
        */

        return eventId;
    };

    private resetErrorBoundary = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            eventId: null
        });
    };

    private handleRetry = () => {
        this.resetErrorBoundary();
    };

    private handleReload = () => {
        window.location.reload();
    };

    private handleReportIssue = () => {
        const { error, errorInfo, eventId } = this.state;

        // Create issue report data
        const reportData = {
            eventId,
            error: error?.toString(),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        // In a real app, you might open a modal or redirect to a feedback form
        console.log('Issue report data:', reportData);

        // For now, just copy to clipboard
        navigator.clipboard.writeText(JSON.stringify(reportData, null, 2)).then(() => {
            alert('Error details copied to clipboard. Please paste this information when reporting the issue.');
        });
    };

    render() {
        const { hasError, error, errorInfo, eventId } = this.state;
        const { children, fallback, showDetails = false } = this.props;

        if (hasError) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full space-y-8">
                        <div className="text-center">
                            {/* Error icon */}
                            <div className="mx-auto h-16 w-16 text-red-500 mb-4">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                    />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Oops! Something went wrong
                            </h2>

                            <p className="text-gray-600 mb-6">
                                We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
                            </p>

                            {eventId && (
                                <p className="text-sm text-gray-500 mb-6">
                                    Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{eventId}</code>
                                </p>
                            )}

                            {/* Action buttons */}
                            <div className="space-y-3">
                                <Button
                                    onClick={this.handleRetry}
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                >
                                    Try Again
                                </Button>

                                <div className="flex space-x-3">
                                    <Button
                                        onClick={this.handleReload}
                                        variant="secondary"
                                        size="md"
                                        className="flex-1"
                                    >
                                        Reload Page
                                    </Button>

                                    <Button
                                        onClick={this.handleReportIssue}
                                        variant="outline"
                                        size="md"
                                        className="flex-1"
                                    >
                                        Report Issue
                                    </Button>
                                </div>
                            </div>

                            {/* Error details (development only or when showDetails is true) */}
                            {(process.env.NODE_ENV === 'development' || showDetails) && error && (
                                <details className="mt-8 text-left">
                                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                        Show Error Details
                                    </summary>
                                    <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs">
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-red-600 mb-2">Error:</h4>
                                            <pre className="whitespace-pre-wrap text-red-800">
                                                {error.toString()}
                                            </pre>
                                        </div>

                                        {error.stack && (
                                            <div className="mb-4">
                                                <h4 className="font-semibold text-red-600 mb-2">Stack Trace:</h4>
                                                <pre className="whitespace-pre-wrap text-gray-700 overflow-x-auto">
                                                    {error.stack}
                                                </pre>
                                            </div>
                                        )}

                                        {errorInfo?.componentStack && (
                                            <div>
                                                <h4 className="font-semibold text-red-600 mb-2">Component Stack:</h4>
                                                <pre className="whitespace-pre-wrap text-gray-700 overflow-x-auto">
                                                    {errorInfo.componentStack}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<Props, 'children'>
) {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

    return WrappedComponent;
}

// Hook for error boundary functionality in functional components
export const useErrorHandler = () => {
    return (error: Error, errorInfo?: ErrorInfo) => {
        // This will be caught by the nearest error boundary
        throw error;
    };
};