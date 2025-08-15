import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Layout from '../Layout'

// Mock the child components
vi.mock('../Header', () => ({
    default: () => <div data-testid="header">Header Component</div>
}))

vi.mock('../Sidebar', () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
        <div data-testid="sidebar" data-open={isOpen}>
            <button onClick={onClose} data-testid="sidebar-close">Close</button>
            Sidebar Component
        </div>
    )
}))

// Mock the config store
vi.mock('../../../stores/configStore', () => ({
    useConfigStore: () => ({
        getActiveConfig: () => null,
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
}))

// Mock window.innerWidth for mobile detection
Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
})

const renderLayout = (children = <div>Test Content</div>) => {
    return render(
        <BrowserRouter>
            <Layout>{children}</Layout>
        </BrowserRouter>
    )
}

describe('Layout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        window.innerWidth = 1024
    })

    it('should render header, sidebar, and children', () => {
        renderLayout(<div>Test Content</div>)

        expect(screen.getByTestId('header')).toBeInTheDocument()
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should show sidebar as open by default on desktop', () => {
        window.innerWidth = 1024
        window.dispatchEvent(new Event('resize'))

        renderLayout()

        const sidebar = screen.getByTestId('sidebar')
        expect(sidebar).toHaveAttribute('data-open', 'true')
    })

    it('should show sidebar as closed by default on mobile', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderLayout()

        const sidebar = screen.getByTestId('sidebar')
        expect(sidebar).toHaveAttribute('data-open', 'false')
    })

    it('should show mobile menu toggle button on mobile', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderLayout()

        expect(screen.getByText('菜单')).toBeInTheDocument()
    })

    it('should not show mobile menu toggle button on desktop', () => {
        window.innerWidth = 1024
        window.dispatchEvent(new Event('resize'))

        renderLayout()

        expect(screen.queryByText('菜单')).not.toBeInTheDocument()
    })

    it('should toggle sidebar when mobile menu button is clicked', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderLayout()

        const sidebar = screen.getByTestId('sidebar')
        expect(sidebar).toHaveAttribute('data-open', 'false')

        const menuButton = screen.getByText('菜单')
        fireEvent.click(menuButton)

        expect(sidebar).toHaveAttribute('data-open', 'true')

        fireEvent.click(menuButton)
        expect(sidebar).toHaveAttribute('data-open', 'false')
    })

    it('should close sidebar when onClose is called', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderLayout()

        // Open sidebar first
        const menuButton = screen.getByText('菜单')
        fireEvent.click(menuButton)

        const sidebar = screen.getByTestId('sidebar')
        expect(sidebar).toHaveAttribute('data-open', 'true')

        // Close sidebar via onClose
        const closeButton = screen.getByTestId('sidebar-close')
        fireEvent.click(closeButton)

        expect(sidebar).toHaveAttribute('data-open', 'false')
    })

    it('should handle window resize from desktop to mobile', async () => {
        // Start with desktop
        window.innerWidth = 1024

        renderLayout()

        let sidebar = screen.getByTestId('sidebar')
        expect(sidebar).toHaveAttribute('data-open', 'true')
        expect(screen.queryByText('菜单')).not.toBeInTheDocument()

        // Resize to mobile
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        // Wait for state update
        await waitFor(() => {
            sidebar = screen.getByTestId('sidebar')
            expect(sidebar).toHaveAttribute('data-open', 'false')
        })
        expect(screen.getByText('菜单')).toBeInTheDocument()
    })

    it('should handle window resize from mobile to desktop', async () => {
        // Start with mobile
        window.innerWidth = 500

        renderLayout()

        let sidebar = screen.getByTestId('sidebar')
        expect(sidebar).toHaveAttribute('data-open', 'false')
        expect(screen.getByText('菜单')).toBeInTheDocument()

        // Resize to desktop
        window.innerWidth = 1024
        window.dispatchEvent(new Event('resize'))

        // Wait for state update
        await waitFor(() => {
            sidebar = screen.getByTestId('sidebar')
            expect(sidebar).toHaveAttribute('data-open', 'true')
        })
        expect(screen.queryByText('菜单')).not.toBeInTheDocument()
    })

    it('should apply correct CSS classes', () => {
        renderLayout()

        const container = document.querySelector('.min-h-screen.bg-gray-50')
        expect(container).toBeInTheDocument()

        const mainContent = document.querySelector('main')
        expect(mainContent).toHaveClass('flex-1', 'overflow-auto')
    })

    it('should render multiple children correctly', () => {
        renderLayout(
            <div>
                <h1>Title</h1>
                <p>Paragraph</p>
                <button>Button</button>
            </div>
        )

        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Paragraph')).toBeInTheDocument()
        expect(screen.getByText('Button')).toBeInTheDocument()
    })
})