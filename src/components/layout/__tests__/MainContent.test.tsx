import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MainContent from '../MainContent'

describe('MainContent', () => {
    it('should render children content', () => {
        render(
            <MainContent>
                <div>Test content</div>
            </MainContent>
        )

        expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('should render title when provided', () => {
        render(
            <MainContent title="Test Title">
                <div>Content</div>
            </MainContent>
        )

        expect(screen.getByText('Test Title')).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Title')
    })

    it('should render subtitle when provided', () => {
        render(
            <MainContent title="Test Title" subtitle="Test subtitle">
                <div>Content</div>
            </MainContent>
        )

        expect(screen.getByText('Test subtitle')).toBeInTheDocument()
    })

    it('should render actions when provided', () => {
        const actions = (
            <button>Test Action</button>
        )

        render(
            <MainContent title="Test Title" actions={actions}>
                <div>Content</div>
            </MainContent>
        )

        expect(screen.getByRole('button', { name: 'Test Action' })).toBeInTheDocument()
    })

    it('should not render header section when no title, subtitle, or actions provided', () => {
        render(
            <MainContent>
                <div>Content</div>
            </MainContent>
        )

        // Header section should not exist
        const headerSection = document.querySelector('.mb-6')
        expect(headerSection).not.toBeInTheDocument()
    })

    it('should render header section when only title is provided', () => {
        render(
            <MainContent title="Test Title">
                <div>Content</div>
            </MainContent>
        )

        const headerSection = document.querySelector('.mb-6')
        expect(headerSection).toBeInTheDocument()
    })

    it('should render header section when only subtitle is provided', () => {
        render(
            <MainContent subtitle="Test subtitle">
                <div>Content</div>
            </MainContent>
        )

        const headerSection = document.querySelector('.mb-6')
        expect(headerSection).toBeInTheDocument()
    })

    it('should render header section when only actions are provided', () => {
        const actions = <button>Action</button>

        render(
            <MainContent actions={actions}>
                <div>Content</div>
            </MainContent>
        )

        const headerSection = document.querySelector('.mb-6')
        expect(headerSection).toBeInTheDocument()
    })

    it('should apply custom className', () => {
        render(
            <MainContent className="custom-class">
                <div>Content</div>
            </MainContent>
        )

        const container = document.querySelector('.max-w-7xl')
        expect(container).toHaveClass('custom-class')
    })

    it('should render all elements together', () => {
        const actions = (
            <div>
                <button>Action 1</button>
                <button>Action 2</button>
            </div>
        )

        render(
            <MainContent
                title="Main Title"
                subtitle="Main subtitle"
                actions={actions}
                className="test-class"
            >
                <div>Main content</div>
                <div>Additional content</div>
            </MainContent>
        )

        expect(screen.getByText('Main Title')).toBeInTheDocument()
        expect(screen.getByText('Main subtitle')).toBeInTheDocument()
        expect(screen.getByText('Action 1')).toBeInTheDocument()
        expect(screen.getByText('Action 2')).toBeInTheDocument()
        expect(screen.getByText('Main content')).toBeInTheDocument()
        expect(screen.getByText('Additional content')).toBeInTheDocument()

        const container = document.querySelector('.max-w-7xl')
        expect(container).toHaveClass('test-class')
    })

    it('should apply correct CSS classes for responsive design', () => {
        render(
            <MainContent title="Test Title">
                <div>Content</div>
            </MainContent>
        )

        const title = screen.getByText('Test Title')
        expect(title).toHaveClass('text-2xl', 'sm:text-3xl', 'font-bold', 'text-gray-900', 'truncate')
    })
})