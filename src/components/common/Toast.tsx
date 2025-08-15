import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    onClose: (id: string) => void;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const Toast: React.FC<ToastProps> = ({
    id,
    type,
    title,
    message,
    duration = 5000,
    onClose,
    action
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onClose(id);
        }, 300); // Match animation duration
    };

    const getToastStyles = () => {
        const baseStyles = 'flex items-start p-4 rounded-lg shadow-lg border max-w-md w-full';
        const typeStyles = {
            success: 'bg-green-50 border-green-200 text-green-800',
            error: 'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800'
        };

        const animationStyles = isLeaving
            ? 'transform translate-x-full opacity-0 transition-all duration-300 ease-in-out'
            : isVisible
                ? 'transform translate-x-0 opacity-100 transition-all duration-300 ease-in-out'
                : 'transform translate-x-full opacity-0';

        return `${baseStyles} ${typeStyles[type]} ${animationStyles}`;
    };

    const getIcon = () => {
        const iconClass = 'w-5 h-5 flex-shrink-0 mt-0.5';

        switch (type) {
            case 'success':
                return (
                    <svg className={`${iconClass} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className={`${iconClass} text-red-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={`${iconClass} text-yellow-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className={`${iconClass} text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    return (
        <div className={getToastStyles()}>
            {getIcon()}
            <div className="ml-3 flex-1">
                <div className="font-medium text-sm">
                    {title}
                </div>
                {message && (
                    <div className="mt-1 text-sm opacity-90">
                        {message}
                    </div>
                )}
                {action && (
                    <div className="mt-2">
                        <button
                            onClick={action.onClick}
                            className="text-sm font-medium underline hover:no-underline focus:outline-none"
                        >
                            {action.label}
                        </button>
                    </div>
                )}
            </div>
            <button
                onClick={handleClose}
                className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

// Toast container component
export interface ToastContainerProps {
    toasts: ToastProps[];
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    position = 'top-right'
}) => {
    const getPositionStyles = () => {
        const baseStyles = 'fixed z-50 flex flex-col space-y-2 pointer-events-none';

        switch (position) {
            case 'top-right':
                return `${baseStyles} top-4 right-4`;
            case 'top-left':
                return `${baseStyles} top-4 left-4`;
            case 'bottom-right':
                return `${baseStyles} bottom-4 right-4`;
            case 'bottom-left':
                return `${baseStyles} bottom-4 left-4`;
            case 'top-center':
                return `${baseStyles} top-4 left-1/2 transform -translate-x-1/2`;
            case 'bottom-center':
                return `${baseStyles} bottom-4 left-1/2 transform -translate-x-1/2`;
            default:
                return `${baseStyles} top-4 right-4`;
        }
    };

    if (toasts.length === 0) return null;

    return createPortal(
        <div className={getPositionStyles()}>
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast {...toast} />
                </div>
            ))}
        </div>,
        document.body
    );
};

// Toast manager hook
export interface ToastOptions {
    type?: ToastType;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const addToast = (title: string, message?: string, options: ToastOptions = {}) => {
        const id = Date.now().toString();
        const toast: ToastProps = {
            id,
            type: options.type || 'info',
            title,
            message,
            duration: options.duration,
            action: options.action,
            onClose: removeToast
        };

        setToasts(prev => [...prev, toast]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const clearAllToasts = () => {
        setToasts([]);
    };

    // Convenience methods
    const success = (title: string, message?: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(title, message, { ...options, type: 'success' });

    const error = (title: string, message?: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(title, message, { ...options, type: 'error' });

    const warning = (title: string, message?: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(title, message, { ...options, type: 'warning' });

    const info = (title: string, message?: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(title, message, { ...options, type: 'info' });

    return {
        toasts,
        addToast,
        removeToast,
        clearAllToasts,
        success,
        error,
        warning,
        info
    };
};