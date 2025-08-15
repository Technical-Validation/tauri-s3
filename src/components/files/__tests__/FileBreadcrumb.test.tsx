import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FileBreadcrumb } from '../FileBreadcrumb'

describe('FileBreadcrumb', () => {
    const mockOnNavigate = vi.fn()
    const mockOnNavigateToRoot = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render root breadcrumb when path is empty', () => {
        render(
            <FileBreadcrumb
                currentPath=""
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        expect(screen.getByText('根目录')).toBeInTheDocument()
        expect(screen.getByText('根目录')).toHaveClass('text-gray-900') // Current path styling
    })

    it('should render single level path', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        expect(screen.getByText('根目录')).toBeInTheDocument()
        expect(screen.getByText('folder1')).toBeInTheDocument()

        // Root should be clickable
        const rootButton = screen.getByRole('button', { name: '根目录' })
        expect(rootButton).toBeInTheDocument()

        // Current folder should not be clickable
        expect(screen.getByText('folder1')).toHaveClass('text-gray-900')
    })

    it('should render multi-level path', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/folder2/folder3/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        expect(screen.getByText('根目录')).toBeInTheDocument()
        expect(screen.getByText('folder1')).toBeInTheDocument()
        expect(screen.getByText('folder2')).toBeInTheDocument()
        expect(screen.getByText('folder3')).toBeInTheDocument()

        // All except the last should be clickable
        expect(screen.getByRole('button', { name: '根目录' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'folder1' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'folder2' })).toBeInTheDocument()

        // Last item should not be clickable
        expect(screen.getByText('folder3')).toHaveClass('text-gray-900')
    })

    it('should handle root navigation', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/folder2/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        const rootButton = screen.getByRole('button', { name: '根目录' })
        fireEvent.click(rootButton)

        expect(mockOnNavigateToRoot).toHaveBeenCalled()
        expect(mockOnNavigate).not.toHaveBeenCalled()
    })

    it('should handle folder navigation', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/folder2/folder3/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        const folder1Button = screen.getByRole('button', { name: 'folder1' })
        fireEvent.click(folder1Button)

        expect(mockOnNavigate).toHaveBeenCalledWith('folder1/')
        expect(mockOnNavigateToRoot).not.toHaveBeenCalled()
    })

    it('should handle intermediate folder navigation', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/folder2/folder3/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        const folder2Button = screen.getByRole('button', { name: 'folder2' })
        fireEvent.click(folder2Button)

        expect(mockOnNavigate).toHaveBeenCalledWith('folder1/folder2/')
        expect(mockOnNavigateToRoot).not.toHaveBeenCalled()
    })

    it('should render separators between breadcrumb items', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/folder2/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        const separators = document.querySelectorAll('svg')
        expect(separators).toHaveLength(2) // Two separators for three items
    })

    it('should apply custom className', () => {
        render(
            <FileBreadcrumb
                currentPath=""
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
                className="custom-class"
            />
        )

        const nav = document.querySelector('nav')
        expect(nav).toHaveClass('custom-class')
    })

    it('should handle path without trailing slash', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/folder2"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        expect(screen.getByText('根目录')).toBeInTheDocument()
        expect(screen.getByText('folder1')).toBeInTheDocument()
        expect(screen.getByText('folder2')).toBeInTheDocument()

        const folder1Button = screen.getByRole('button', { name: 'folder1' })
        fireEvent.click(folder1Button)

        expect(mockOnNavigate).toHaveBeenCalledWith('folder1/')
    })

    it('should handle empty segments in path', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1//folder2/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        // Should filter out empty segments
        expect(screen.getByText('根目录')).toBeInTheDocument()
        expect(screen.getByText('folder1')).toBeInTheDocument()
        expect(screen.getByText('folder2')).toBeInTheDocument()

        // Should not have any empty breadcrumb items
        const buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(2) // Root and folder1
    })

    it('should have proper accessibility attributes', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        const nav = screen.getByRole('navigation')
        expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
    })

    it('should apply hover styles to clickable items', () => {
        render(
            <FileBreadcrumb
                currentPath="folder1/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        const rootButton = screen.getByRole('button', { name: '根目录' })
        expect(rootButton).toHaveClass('hover:text-gray-700')
    })

    it('should handle single character folder names', () => {
        render(
            <FileBreadcrumb
                currentPath="a/b/c/"
                onNavigate={mockOnNavigate}
                onNavigateToRoot={mockOnNavigateToRoot}
            />
        )

        expect(screen.getByText('a')).toBeInTheDocument()
        expect(screen.getByText('b')).toBeInTheDocument()
        expect(screen.getByText('c')).toBeInTheDocument()
    })
})