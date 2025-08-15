import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Header from '../Header'
import { useConfigStore } from '../../../stores/configStore'

// Mock the config store
vi.mock('../../../stores/configStore')

const mockUseConfigStore = vi.mocked(useConfigStore)

describe('Header', () => {
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

    it('should render the header with title', () => {
        mockGetActiveConfig.mockReturnValue(null)

        render(<Header />)

        expect(screen.getByText('S3 Upload Tool')).toBeInTheDocument()
        expect(screen.getByText('☁️')).toBeInTheDocument()
    })

    it('should show disconnected status when no active config', () => {
        mockGetActiveConfig.mockReturnValue(null)

        render(<Header />)

        expect(screen.getByText('未连接')).toBeInTheDocument()
        const statusIndicator = document.querySelector('.bg-red-500')
        expect(statusIndicator).toBeInTheDocument()
    })

    it('should show connected status when active config exists', () => {
        const mockConfig = {
            id: '1',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }
        mockGetActiveConfig.mockReturnValue(mockConfig)

        render(<Header />)

        expect(screen.getByText('已连接: Test Config')).toBeInTheDocument()
        const statusIndicator = document.querySelector('.bg-green-500')
        expect(statusIndicator).toBeInTheDocument()
    })

    it('should toggle mobile menu when button is clicked', () => {
        mockGetActiveConfig.mockReturnValue(null)

        render(<Header />)

        const mobileMenuButton = screen.getByRole('button', { name: '打开菜单' })
        expect(mobileMenuButton).toBeInTheDocument()

        // Mobile menu should not be visible initially
        expect(screen.queryByText('未连接')).toBeInTheDocument()

        // Click to open mobile menu
        fireEvent.click(mobileMenuButton)

        // Mobile menu content should be visible
        const mobileMenus = screen.getAllByText('未连接')
        expect(mobileMenus).toHaveLength(2) // One in desktop, one in mobile menu
    })

    it('should render notification and settings buttons', () => {
        mockGetActiveConfig.mockReturnValue(null)

        render(<Header />)

        expect(screen.getByRole('button', { name: '通知' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '设置' })).toBeInTheDocument()
    })

    it('should show mobile menu with connection status', () => {
        const mockConfig = {
            id: '1',
            name: 'Mobile Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }
        mockGetActiveConfig.mockReturnValue(mockConfig)

        render(<Header />)

        const mobileMenuButton = screen.getByRole('button', { name: '打开菜单' })
        fireEvent.click(mobileMenuButton)

        const connectedTexts = screen.getAllByText('已连接: Mobile Test Config')
        expect(connectedTexts).toHaveLength(2) // One in desktop, one in mobile menu
    })
})