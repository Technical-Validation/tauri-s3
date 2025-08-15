import React from 'react';

interface FileBreadcrumbProps {
    currentPath: string;
    onNavigate: (path: string) => void;
    onNavigateToRoot: () => void;
    className?: string;
}

export const FileBreadcrumb: React.FC<FileBreadcrumbProps> = ({
    currentPath,
    onNavigate,
    onNavigateToRoot,
    className = '',
}) => {
    // Parse path into segments
    const segments = currentPath
        ? currentPath.split('/').filter(Boolean)
        : [];

    // Build breadcrumb items
    const breadcrumbItems = [
        {
            name: '根目录',
            path: '',
            isRoot: true,
        },
        ...segments.map((segment, index) => ({
            name: segment,
            path: segments.slice(0, index + 1).join('/') + '/',
            isRoot: false,
        })),
    ];

    return (
        <nav className={`flex ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
                {breadcrumbItems.map((item, index) => (
                    <li key={item.path} className="flex items-center">
                        {index > 0 && (
                            <svg
                                className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}

                        {index === breadcrumbItems.length - 1 ? (
                            // Current path - not clickable
                            <span className="text-sm font-medium text-gray-900">
                                {item.name}
                            </span>
                        ) : (
                            // Clickable breadcrumb
                            <button
                                type="button"
                                onClick={() => item.isRoot ? onNavigateToRoot() : onNavigate(item.path)}
                                className="text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors"
                            >
                                {item.name}
                            </button>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};