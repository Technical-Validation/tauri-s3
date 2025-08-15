import React from 'react';

export interface ProgressBarProps {
    value: number; // 0-100
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    label?: string;
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    size = 'md',
    color = 'primary',
    showLabel = false,
    label,
    className = ''
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3'
    };

    const colorClasses = {
        primary: 'bg-blue-600',
        success: 'bg-green-600',
        warning: 'bg-yellow-600',
        danger: 'bg-red-600'
    };

    const backgroundClasses = 'bg-gray-200';
    const containerClasses = `w-full ${backgroundClasses} rounded-full overflow-hidden ${className}`;
    const barClasses = `${sizeClasses[size]} ${colorClasses[color]} transition-all duration-300 ease-out`;

    return (
        <div className="w-full">
            {(showLabel || label) && (
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                        {label || 'Progress'}
                    </span>
                    {showLabel && (
                        <span className="text-sm text-gray-500">
                            {Math.round(percentage)}%
                        </span>
                    )}
                </div>
            )}
            <div className={containerClasses}>
                <div
                    className={barClasses}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-label={label || `Progress: ${Math.round(percentage)}%`}
                />
            </div>
        </div>
    );
};