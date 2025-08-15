import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    variant?: 'default' | 'filled';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    helperText,
    variant = 'default',
    leftIcon,
    rightIcon,
    className = '',
    id,
    ...props
}, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = 'block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:opacity-50';

    const variantClasses = {
        default: error
            ? 'ring-red-300 placeholder:text-red-400 focus:ring-red-500 text-red-900'
            : 'ring-gray-300 placeholder:text-gray-400 focus:ring-blue-600 text-gray-900',
        filled: error
            ? 'bg-red-50 ring-red-300 placeholder:text-red-400 focus:ring-red-500 text-red-900'
            : 'bg-gray-50 ring-gray-300 placeholder:text-gray-400 focus:ring-blue-600 text-gray-900'
    };

    const inputClasses = `${baseClasses} ${variantClasses[variant]} ${leftIcon ? 'pl-10' : 'pl-3'} ${rightIcon ? 'pr-10' : 'pr-3'} ${className}`;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <div className="h-5 w-5 text-gray-400">
                            {leftIcon}
                        </div>
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={inputClasses}
                    {...props}
                />
                {rightIcon && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="h-5 w-5 text-gray-400">
                            {rightIcon}
                        </div>
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-600" id={`${inputId}-error`}>
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p className="mt-2 text-sm text-gray-500" id={`${inputId}-description`}>
                    {helperText}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';