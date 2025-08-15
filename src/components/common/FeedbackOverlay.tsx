import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface FeedbackOverlayProps {
    isVisible: boolean;
    type: 'loading' | 'success' | 'error';
    title: string;
    message?: string;
    onClose?: () => void;
    autoClose?: boolean;
    autoCloseDelay?: number;
    showCloseButton?: boolean;
    backdrop?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
    isVisible,
    type,
    title,
    message,
    onClose,
    autoClose = false,
    autoCloseDelay = 3000,
    showCloseButton = true,
    backdrop = true,
    size = 'md'
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);

            if (autoClose && type !== 'loading') {
                const timer = setTimeout(() => {
                    handleClose();
                }, autoCloseDelay);

                return () => clearTimeout(timer);
            }
        }
    }, [isVisible, autoClose, autoCloseDelay, type]);

    const handleClose = () => {
        if (type === 'loading') return; // Don't allow closing loading overlays

        setIsAnimating(false);
        setTimeout(() => {
            onClose?.();
        }, 200); // Match animation duration
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'max-w-sm';
            case 'lg':
                return 'max-w-lg';
            default:
                return 'max-w-md';
        }
    };

    const getIcon = () => {
        const iconClass = 'w-12 h-12 mx-auto mb-4';

        switch (type) {
            case 'loading':
                return (
                    <div className={`${iconClass} relative`}>
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                    </div>
                );
            case 'success':
                return (
                    <div className={`${iconClass} text-green-600`}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case 'error':
                return (
                    <div className={`${iconClass} text-red-600`}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
        }
    };

    if (!isVisible) return null;

    const overlayContent = (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${backdrop ? 'bg-black bg-opacity-50' : ''}`}>
            <div className={`
                bg-white rounded-lg shadow-xl p-6 w-full ${getSizeClasses()}
                transform transition-all duration-200 ease-in-out
                ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            `}>
                {/* Close button */}
                {showCloseButton && type !== 'loading' && onClose && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                {/* Content */}
                <div className="text-center">
                    {getIcon()}

                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {title}
                    </h3>

                    {message && (
                        <p className="text-gray-600 mb-4">
                            {message}
                        </p>
                    )}

                    {/* Loading indicator */}
                    {type === 'loading' && (
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(overlayContent, document.body);
};

// Hook for managing feedback overlays
export const useFeedbackOverlay = () => {
    const [overlay, setOverlay] = useState<{
        isVisible: boolean;
        type: 'loading' | 'success' | 'error';
        title: string;
        message?: string;
    } | null>(null);

    const showLoading = (title: string, message?: string) => {
        setOverlay({
            isVisible: true,
            type: 'loading',
            title,
            message
        });
    };

    const showSuccess = (title: string, message?: string) => {
        setOverlay({
            isVisible: true,
            type: 'success',
            title,
            message
        });
    };

    const showError = (title: string, message?: string) => {
        setOverlay({
            isVisible: true,
            type: 'error',
            title,
            message
        });
    };

    const hide = () => {
        setOverlay(null);
    };

    return {
        overlay,
        showLoading,
        showSuccess,
        showError,
        hide
    };
};