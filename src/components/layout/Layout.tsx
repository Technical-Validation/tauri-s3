import { ReactNode, useState, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { ToastContainer, useToast } from '../common/Toast'
import { FeedbackOverlay, useFeedbackOverlay } from '../common/FeedbackOverlay'
import { useResponsive, useReducedMotion } from '../../utils/responsive'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { isMobile, isTablet } = useResponsive()
  const prefersReducedMotion = useReducedMotion()
  const { toasts } = useToast()
  const { overlay, hide: hideFeedback } = useFeedbackOverlay()

  useEffect(() => {
    // Auto-close sidebar on mobile
    if (isMobile) {
      setIsSidebarOpen(false)
    } else {
      setIsSidebarOpen(true)
    }
  }, [isMobile])

  // Auto-close sidebar on mobile after navigation
  useEffect(() => {
    const handleRouteChange = () => {
      if (isMobile && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    // Listen for route changes (simplified - in real app you'd use router events)
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [isMobile, isSidebarOpen])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Layout Error:', error, errorInfo)
      }}
      resetKeys={[children]}
    >
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <div className="flex flex-1 h-[calc(100vh-73px)] relative">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            isMobile={isMobile}
            isTablet={isTablet}
            prefersReducedMotion={prefersReducedMotion}
          />

          {/* Mobile sidebar overlay */}
          {isMobile && isSidebarOpen && (
            <div
              className={`fixed inset-0 bg-black bg-opacity-50 z-20 ${prefersReducedMotion ? '' : 'transition-opacity duration-300'
                }`}
              onClick={closeSidebar}
            />
          )}

          <main className={`
            flex-1 overflow-auto
            ${isMobile ? 'w-full' : isSidebarOpen ? 'ml-0' : 'ml-0'}
          `}>
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Mobile sidebar toggle */}
              {isMobile && (
                <div className="mb-4">
                  <button
                    onClick={toggleSidebar}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    菜单
                  </button>
                </div>
              )}

              <ErrorBoundary
                fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Content Error
                      </h3>
                      <p className="text-gray-600">
                        There was an error loading this page content.
                      </p>
                    </div>
                  </div>
                }
              >
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Toast notifications */}
        <ToastContainer
          toasts={toasts}
          position={isMobile ? 'top-center' : 'top-right'}
        />

        {/* Feedback overlay */}
        {overlay && (
          <FeedbackOverlay
            {...overlay}
            onClose={hideFeedback}
            autoClose={overlay.type !== 'loading'}
            size={isMobile ? 'sm' : 'md'}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default Layout