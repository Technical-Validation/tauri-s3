import { ReactNode } from 'react'

interface MainContentProps {
    children: ReactNode
    title?: string
    subtitle?: string
    actions?: ReactNode
    className?: string
}

const MainContent = ({
    children,
    title,
    subtitle,
    actions,
    className = ''
}: MainContentProps) => {
    return (
        <div className={`max-w-7xl mx-auto ${className}`}>
            {/* Page Header */}
            {(title || subtitle || actions) && (
                <div className="mb-6 sm:mb-8">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="mt-1 text-sm sm:text-base text-gray-600">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div className="mt-4 flex md:mt-0 md:ml-4">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Page Content */}
            <div className="space-y-6">
                {children}
            </div>
        </div>
    )
}

export default MainContent