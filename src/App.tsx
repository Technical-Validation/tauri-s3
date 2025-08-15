import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout'
import { ProtectedRoute, LoadingSpinner } from './components/common'
import { useConfig } from './hooks/useConfig'
import { createLazyComponent, preloadComponents } from './utils/lazyLoading'
import { MemoryMonitor } from './utils/performance'

// Lazy load pages for better performance
const ConfigPage = createLazyComponent(
  () => import('./pages/ConfigPage'),
  { retryCount: 3, retryDelay: 1000 }
)

const FilesPage = createLazyComponent(
  () => import('./pages/FilesPage'),
  { retryCount: 3, retryDelay: 1000 }
)

const UploadPage = createLazyComponent(
  () => import('./pages/UploadPage'),
  { retryCount: 3, retryDelay: 1000 }
)

const DownloadsPage = createLazyComponent(
  () => import('./pages/DownloadsPage'),
  { retryCount: 3, retryDelay: 1000 }
)

// Loading fallback component
const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
    <span className="ml-3 text-gray-600">Loading page...</span>
  </div>
)

function App() {
  const { hasConfigs, activeConfig } = useConfig()
  const hasValidConfig = hasConfigs && activeConfig !== null

  useEffect(() => {
    // Start memory monitoring in development
    if (process.env.NODE_ENV === 'development') {
      const memoryMonitor = MemoryMonitor.getInstance()
      memoryMonitor.startMonitoring(10000) // Monitor every 10 seconds

      memoryMonitor.addObserver((usage) => {
        console.log('Memory usage:', {
          used: Math.round(usage.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(usage.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(usage.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        })
      })

      return () => {
        memoryMonitor.stopMonitoring()
      }
    }
  }, [])

  useEffect(() => {
    // Preload critical pages based on user state
    if (hasValidConfig) {
      // User has config, preload main app pages
      preloadComponents([
        () => import('./pages/FilesPage'),
        () => import('./pages/UploadPage'),
        () => import('./pages/DownloadsPage')
      ])
    } else {
      // User needs config, preload config page
      preloadComponents([
        () => import('./pages/ConfigPage')
      ])
    }
  }, [hasValidConfig])

  return (
    <Router>
      <Layout>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<ConfigPage />} />
            <Route
              path="/files"
              element={
                <ProtectedRoute>
                  <FilesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/downloads"
              element={
                <ProtectedRoute>
                  <DownloadsPage />
                </ProtectedRoute>
              }
            />
            {/* Catch all route - redirect to config */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App