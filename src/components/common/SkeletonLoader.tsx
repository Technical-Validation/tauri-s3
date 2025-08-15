import React from 'react';

export interface SkeletonLoaderProps {
    variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
    width?: string | number;
    height?: string | number;
    className?: string;
    animation?: 'pulse' | 'wave' | 'none';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'text',
    width,
    height,
    className = '',
    animation = 'pulse'
}) => {
    const getVariantClasses = () => {
        switch (variant) {
            case 'circular':
                return 'rounded-full';
            case 'rounded':
                return 'rounded-lg';
            case 'rectangular':
                return 'rounded-none';
            default: // text
                return 'rounded';
        }
    };

    const getAnimationClasses = () => {
        switch (animation) {
            case 'wave':
                return 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[wave_1.5s_ease-in-out_infinite]';
            case 'none':
                return 'bg-gray-200';
            default: // pulse
                return 'animate-pulse bg-gray-200';
        }
    };

    const getDefaultDimensions = () => {
        switch (variant) {
            case 'circular':
                return { width: '2rem', height: '2rem' };
            case 'text':
                return { width: '100%', height: '1rem' };
            default:
                return { width: '100%', height: '2rem' };
        }
    };

    const defaultDimensions = getDefaultDimensions();
    const finalWidth = width || defaultDimensions.width;
    const finalHeight = height || defaultDimensions.height;

    const style: React.CSSProperties = {
        width: finalWidth,
        height: finalHeight
    };

    return (
        <div
            className={`${getVariantClasses()} ${getAnimationClasses()} ${className}`}
            style={style}
        />
    );
};

// Predefined skeleton components for common use cases
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
            <SkeletonLoader
                key={index}
                variant="text"
                width={index === lines - 1 ? '75%' : '100%'}
                className={index === 0 ? 'h-4' : 'h-3'}
            />
        ))}
    </div>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-3 mb-3">
            <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
            <div className="flex-1">
                <SkeletonLoader variant="text" height="1rem" className="mb-2" />
                <SkeletonLoader variant="text" height="0.75rem" width="60%" />
            </div>
        </div>
        <TextSkeleton lines={2} />
    </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number; className?: string }> = ({
    columns = 4,
    className = ''
}) => (
    <tr className={className}>
        {Array.from({ length: columns }).map((_, index) => (
            <td key={index} className="px-4 py-3">
                <SkeletonLoader variant="text" height="1rem" />
            </td>
        ))}
    </tr>
);

export const ListItemSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center space-x-3 p-3 ${className}`}>
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
        <div className="flex-1">
            <SkeletonLoader variant="text" height="1rem" className="mb-1" />
            <SkeletonLoader variant="text" height="0.75rem" width="70%" />
        </div>
        <SkeletonLoader variant="rectangular" width="4rem" height="1.5rem" />
    </div>
);

export const FileListSkeleton: React.FC<{ items?: number; className?: string }> = ({
    items = 5,
    className = ''
}) => (
    <div className={`space-y-1 ${className}`}>
        {Array.from({ length: items }).map((_, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 p-3 border-b border-gray-100">
                <div className="col-span-1">
                    <SkeletonLoader variant="circular" width="1.5rem" height="1.5rem" />
                </div>
                <div className="col-span-5">
                    <SkeletonLoader variant="text" height="1rem" />
                </div>
                <div className="col-span-2">
                    <SkeletonLoader variant="text" height="0.875rem" width="60%" />
                </div>
                <div className="col-span-2">
                    <SkeletonLoader variant="text" height="0.875rem" width="80%" />
                </div>
                <div className="col-span-2">
                    <SkeletonLoader variant="text" height="0.875rem" width="90%" />
                </div>
            </div>
        ))}
    </div>
);

export const UploadQueueSkeleton: React.FC<{ items?: number; className?: string }> = ({
    items = 3,
    className = ''
}) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: items }).map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                        <SkeletonLoader variant="circular" width="1rem" height="1rem" />
                        <div className="flex-1">
                            <SkeletonLoader variant="text" height="0.875rem" className="mb-1" />
                            <SkeletonLoader variant="text" height="0.75rem" width="70%" />
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <SkeletonLoader variant="rounded" width="4rem" height="2rem" />
                        <SkeletonLoader variant="rounded" width="4rem" height="2rem" />
                    </div>
                </div>
                <SkeletonLoader variant="rectangular" height="0.5rem" className="mb-2" />
                <div className="flex justify-between">
                    <SkeletonLoader variant="text" height="0.75rem" width="30%" />
                    <SkeletonLoader variant="text" height="0.75rem" width="25%" />
                </div>
            </div>
        ))}
    </div>
);

// Page-level skeleton components
export const PageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`p-6 ${className}`}>
        {/* Header */}
        <div className="mb-6">
            <SkeletonLoader variant="text" height="2rem" width="30%" className="mb-2" />
            <SkeletonLoader variant="text" height="1rem" width="60%" />
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <CardSkeleton className="mb-4" />
                <CardSkeleton className="mb-4" />
                <CardSkeleton />
            </div>
            <div>
                <CardSkeleton className="mb-4" />
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <ListItemSkeleton key={index} />
                    ))}
                </div>
            </div>
        </div>
    </div>
);