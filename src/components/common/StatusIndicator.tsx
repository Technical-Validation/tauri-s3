import React from 'react';

export type StatusType = 'idle' | 'loading' | 'success' | 'error' | 'warning';

export interface StatusIndicatorProps {
    status: StatusType;
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    showMessage?: boolean;
    className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    status,
    message,
    size = 'md',
    showIcon = true,
    showMessage = true,
    className = ''
}) => {
    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return {
                    container: 'text-xs',
                    icon: 'w-3 h-3',
                    spinner: 'w-3 h-3 border'
                };
            case 'lg':
                return {
                    container: 'text-base',
                    icon: 'w-6 h-6',
                    spinner: 'w-6 h-6 border-2'
                };
            default:
                return {
                    container: 'text-sm',
                    icon: 'w-4 h-4',
                    spinner: 'w-4 h-4 border'
                };
        }
    };

    const getStatusStyles = () => {
        switch (status) {
            case 'loading':
                return 'text-blue-600';
            case 'success':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
            case 'warning':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };

    const getIcon = () => {
        const { icon, spinner } = getSizeClasses();

        switch (status) {
            case 'loading':
                return (
                    <div className={`animate-spin rounded-full ${spinner} border-blue-600 border-t-transparent`}></div>
                );
            case 'success':
                return (
                    <svg className={`${icon} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className={`${icon} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={`${icon} text-yellow-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                );
            case 'idle':
                return (
                    <svg className={`${icon} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getDefaultMessage = () => {
        switch (status) {
            case 'loading':
                return 'Loading...';
            case 'success':
                return 'Success';
            case 'error':
                return 'Error';
            case 'warning':
                return 'Warning';
            case 'idle':
                return 'Ready';
            default:
                return '';
        }
    };

    const { container } = getSizeClasses();
    const statusStyles = getStatusStyles();
    const displayMessage = message || getDefaultMessage();

    return (
        <div className={`flex items-center space-x-2 ${container} ${statusStyles} ${className}`}>
            {showIcon && getIcon()}
            {showMessage && displayMessage && (
                <span>{displayMessage}</span>
            )}
        </div>
    );
};

// Inline status component for forms and inputs
export interface InlineStatusProps {
    status: StatusType;
    message?: string;
    className?: string;
}

export const InlineStatus: React.FC<InlineStatusProps> = ({
    status,
    message,
    className = ''
}) => {
    if (status === 'idle' || !message) return null;

    return (
        <StatusIndicator
            status={status}
            message={message}
            size="sm"
            className={`mt-1 ${className}`}
        />
    );
};

// Status badge component
export interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'solid' | 'outline' | 'soft';
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    size = 'md',
    variant = 'soft',
    className = ''
}) => {
    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'px-2 py-0.5 text-xs';
            case 'lg':
                return 'px-4 py-2 text-base';
            default:
                return 'px-3 py-1 text-sm';
        }
    };

    const getVariantClasses = () => {
        const baseClasses = 'inline-flex items-center font-medium rounded-full';

        switch (variant) {
            case 'solid':
                switch (status) {
                    case 'loading':
                        return `${baseClasses} bg-blue-600 text-white`;
                    case 'success':
                        return `${baseClasses} bg-green-600 text-white`;
                    case 'error':
                        return `${baseClasses} bg-red-600 text-white`;
                    case 'warning':
                        return `${baseClasses} bg-yellow-600 text-white`;
                    default:
                        return `${baseClasses} bg-gray-600 text-white`;
                }
            case 'outline':
                switch (status) {
                    case 'loading':
                        return `${baseClasses} border border-blue-600 text-blue-600`;
                    case 'success':
                        return `${baseClasses} border border-green-600 text-green-600`;
                    case 'error':
                        return `${baseClasses} border border-red-600 text-red-600`;
                    case 'warning':
                        return `${baseClasses} border border-yellow-600 text-yellow-600`;
                    default:
                        return `${baseClasses} border border-gray-600 text-gray-600`;
                }
            default: // soft
                switch (status) {
                    case 'loading':
                        return `${baseClasses} bg-blue-100 text-blue-800`;
                    case 'success':
                        return `${baseClasses} bg-green-100 text-green-800`;
                    case 'error':
                        return `${baseClasses} bg-red-100 text-red-800`;
                    case 'warning':
                        return `${baseClasses} bg-yellow-100 text-yellow-800`;
                    default:
                        return `${baseClasses} bg-gray-100 text-gray-800`;
                }
        }
    };

    const getDefaultLabel = () => {
        switch (status) {
            case 'loading':
                return 'Loading';
            case 'success':
                return 'Success';
            case 'error':
                return 'Error';
            case 'warning':
                return 'Warning';
            case 'idle':
                return 'Ready';
            default:
                return '';
        }
    };

    const displayLabel = label || getDefaultLabel();
    const sizeClasses = getSizeClasses();
    const variantClasses = getVariantClasses();

    return (
        <span className={`${sizeClasses} ${variantClasses} ${className}`}>
            {displayLabel}
        </span>
    );
};