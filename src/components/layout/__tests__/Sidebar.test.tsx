import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Sidebar from '../Sidebar'

// Mock react-router-dom
const mockUseLocation = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useLocation: () => mockUseLocation(),
    }
})

// Mock window.innerWidth for mobile detection
Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
})

const renderSidebar = (props = {}) => {
    return render(
        <BrowserRouter>
            <Sidebar {...props} />
        </BrowserRouter>
    )
}

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseLocation.mockReturnValue({ pathname: '/' })
        window.innerWidth = 1024
    })

    it('should render all navigation items', () => {
        renderSidebar()

        expect(screen.getByText('配置管理')).toBeInTheDocument()
        expect(screen.getByText('文件浏览')).toBeInTheDocument()
        expect(screen.getByText('文件上传')).toBeInTheDocument()
        expect(screen.getByText('下载管理')).toBeInTheDocument()
    })

    it('should highlight active navigation item', () => {
        mockUseLocation.mockReturnValue({ pathname: '/files' })
        renderSidebar()

        const activeLink = screen.getByText('文件浏览').closest('a')
        expect(activeLink).toHaveClass('bg-blue-100', 'text-blue-700')
    })

    it('should render version in footer', () => {
        renderSidebar()

        expect(screen.getByText('S3 Upload Tool v1.0')).toBeInTheDocument()
    })

    it('should handle mobile view', () => {
        // Mock mobile width
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        const onClose = vi.fn()
        renderSidebar({ isOpen: true, onClose })

        // Should show mobile header
        expect(screen.getByText('导航菜单')).toBeInTheDocument()

        // Should show close button
        const closeButton = screen.getByRole('button')
        expect(closeButton).toBeInTheDocument()

        fireEvent.click(closeButton)
        expect(onClose).toHaveBeenCalled()
    })

    it('should show overlay in mobile view when open', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        const onClose = vi.fn()
        renderSidebar({ isOpen: true, onClose })

        const overlay = document.querySelector('.bg-black.bg-opacity-50')
        expect(overlay).toBeInTheDocument()

        fireEvent.click(overlay!)
        expect(onClose).toHaveBeenCalled()
    })

    it('should not show overlay in mobile view when closed', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderSidebar({ isOpen: false })

        const overlay = document.querySelector('.bg-black.bg-opacity-50')
        expect(overlay).not.toBeInTheDocument()
    })

    it('should call onClose when clicking navigation link in mobile view', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        const onClose = vi.fn()
        renderSidebar({ isOpen: true, onClose })

        const configLink = screen.getByText('配置管理')
        fireEvent.click(configLink)

        expect(onClose).toHaveBeenCalled()
    })

    it('should not call onClose when clicking navigation link in desktop view', () => {
        window.innerWidth = 1024
        window.dispatchEvent(new Event('resize'))

        const onClose = vi.fn()
        renderSidebar({ isOpen: true, onClose })

        const configLink = screen.getByText('配置管理')
        fireEvent.click(configLink)

        expect(onClose).not.toHaveBeenCalled()
    })

    it('should apply correct classes for mobile closed state', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderSidebar({ isOpen: false })

        const sidebar = document.querySelector('aside')
        expect(sidebar).toHaveClass('-translate-x-full')
    })

    it('should apply correct classes for mobile open state', () => {
        window.innerWidth = 500
        window.dispatchEvent(new Event('resize'))

        renderSidebar({ isOpen: true })

        const sidebar = document.querySelector('aside')
        expect(sidebar).toHaveClass('translate-x-0')
        expect(sidebar).toHaveClass('fixed')
    })

    it('should apply correct classes for desktop view', () => {
        window.innerWidth = 1024
        window.dispatchEvent(new Event('resize'))

        renderSidebar()

        const sidebar = document.querySelector('aside')
        expect(sidebar).toHaveClass('relative')
        expect(sidebar).toHaveClass('translate-x-0')
    })
})