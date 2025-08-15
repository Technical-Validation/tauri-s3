import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        children: <div>Modal content</div>
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders when isOpen is true', () => {
        render(<Modal {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<Modal {...defaultProps} isOpen={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders with title', () => {
        render(<Modal {...defaultProps} title="Test Modal" />);

        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('shows close button by default', () => {
        render(<Modal {...defaultProps} title="Test Modal" />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
        render(<Modal {...defaultProps} title="Test Modal" showCloseButton={false} />);

        expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} title="Test Modal" />);

        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when escape key is pressed', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} />);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when escape key is pressed and closeOnEscape is false', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} />);

        // Find the flex container that handles overlay clicks
        const overlay = document.querySelector('.flex.min-h-full');
        fireEvent.click(overlay!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when overlay is clicked and closeOnOverlayClick is false', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />);

        const overlay = document.querySelector('.flex.min-h-full');
        fireEvent.click(overlay!);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when modal content is clicked', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('Modal content'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('renders different sizes correctly', () => {
        const { rerender } = render(<Modal {...defaultProps} size="sm" />);
        // Check the modal panel (inner div) for size classes
        expect(document.querySelector('.max-w-md')).toBeInTheDocument();

        rerender(<Modal {...defaultProps} size="md" />);
        expect(document.querySelector('.max-w-lg')).toBeInTheDocument();

        rerender(<Modal {...defaultProps} size="lg" />);
        expect(document.querySelector('.max-w-2xl')).toBeInTheDocument();

        rerender(<Modal {...defaultProps} size="xl" />);
        expect(document.querySelector('.max-w-4xl')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
        const footer = <button>Footer Button</button>;
        render(<Modal {...defaultProps} footer={footer} />);

        expect(screen.getByRole('button', { name: 'Footer Button' })).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<Modal {...defaultProps} className="custom-modal-class" />);

        // Check that the custom class is applied to the modal panel
        expect(document.querySelector('.custom-modal-class')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
        render(<Modal {...defaultProps} title="Accessible Modal" />);
        const dialog = screen.getByRole('dialog');

        expect(dialog).toHaveAttribute('role', 'dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('prevents body scroll when open', () => {
        const originalOverflow = document.body.style.overflow;

        render(<Modal {...defaultProps} />);
        expect(document.body.style.overflow).toBe('hidden');

        // Cleanup
        document.body.style.overflow = originalOverflow;
    });

    it('restores body scroll when closed', () => {
        const originalOverflow = document.body.style.overflow;

        const { rerender } = render(<Modal {...defaultProps} />);
        expect(document.body.style.overflow).toBe('hidden');

        rerender(<Modal {...defaultProps} isOpen={false} />);
        expect(document.body.style.overflow).toBe('unset');

        // Cleanup
        document.body.style.overflow = originalOverflow;
    });

    it('handles other key presses without closing', () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} onClose={onClose} />);

        fireEvent.keyDown(document, { key: 'Enter' });
        fireEvent.keyDown(document, { key: 'Space' });
        fireEvent.keyDown(document, { key: 'Tab' });

        expect(onClose).not.toHaveBeenCalled();
    });
});