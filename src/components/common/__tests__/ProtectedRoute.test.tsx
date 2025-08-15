import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { useConfigStore } from '../../../stores/configStore'

// Mock the config store
vi.mock('../../../stores/configStore')

const mockUseConfigStore = vi.mocked(useConfigStore)

const TestComponent = () => <div>Protected Content</div>
const RedirectComponent = () => <div>Redirect Page</div>

const renderProtectedRoute = (redirectTo?: string) => {
    return render(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<RedirectComponent />} />
                <Route path="/custom-redirect" element={<div>Custom Redirect Page</div>} />
                <Route
                    path="/protected"
                    element={
                        <ProtectedRoute redirectTo={redirectTo}>
                            <TestComponent />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    )
}

describe('ProtectedRoute', () => {
    const mockGetActiveConfig = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseConfigStore.mockReturnValue({
            getActiveConfig: mockGetActiveConfig,
            configs: [],
            activeConfigId: null,
            addConfig: vi.fn(),
            updateConfig: vi.fn(),
            deleteConfig: vi.fn(),
            setActiveConfig: vi.fn(),
            exportConfigs: vi.fn(),
            importConfigs: vi.fn(),
            testConnection: vi.fn(),
            loadConfigs: vi.fn(),
            saveConfigs: vi.fn(),
        })
    })

    it('should render children when active config exists', () => {
        const mockConfig = {
            id: '1',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }
        mockGetActiveConfig.mockReturnValue(mockConfig)

        // Navigate to protected route
        window.history.pushState({}, '', '/protected')
        renderProtectedRoute()

        expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should redirect to default route when no active config', () => {
        mockGetActiveConfig.mockReturnValue(null)

        // Navigate to protected route
        window.history.pushState({}, '', '/protected')
        renderProtectedRoute()

        expect(screen.getByText('Redirect Page')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should redirect to custom route when specified and no active config', () => {
        mockGetActiveConfig.mockReturnValue(null)

        // Navigate to protected route
        window.history.pushState({}, '', '/protected')
        renderProtectedRoute('/custom-redirect')

        expect(screen.getByText('Custom Redirect Page')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should call getActiveConfig to check authentication', () => {
        mockGetActiveConfig.mockReturnValue(null)

        window.history.pushState({}, '', '/protected')
        renderProtectedRoute()

        expect(mockGetActiveConfig).toHaveBeenCalled()
    })

    it('should render multiple children when authenticated', () => {
        const mockConfig = {
            id: '1',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }
        mockGetActiveConfig.mockReturnValue(mockConfig)

        render(
            <BrowserRouter>
                <ProtectedRoute>
                    <div>Child 1</div>
                    <div>Child 2</div>
                    <span>Child 3</span>
                </ProtectedRoute>
            </BrowserRouter>
        )

        expect(screen.getByText('Child 1')).toBeInTheDocument()
        expect(screen.getByText('Child 2')).toBeInTheDocument()
        expect(screen.getByText('Child 3')).toBeInTheDocument()
    })

    it('should handle config with minimal required fields', () => {
        const minimalConfig = {
            id: '1',
            name: 'Minimal Config',
            accessKeyId: 'key',
            secretAccessKey: 'secret',
            region: 'us-east-1',
            bucketName: 'bucket'
        }
        mockGetActiveConfig.mockReturnValue(minimalConfig)

        render(
            <BrowserRouter>
                <ProtectedRoute>
                    <TestComponent />
                </ProtectedRoute>
            </BrowserRouter>
        )

        expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should handle undefined config', () => {
        mockGetActiveConfig.mockReturnValue(undefined)

        window.history.pushState({}, '', '/protected')
        renderProtectedRoute()

        expect(screen.getByText('Redirect Page')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
})