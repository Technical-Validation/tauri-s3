import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders with default props', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('animate-spin', 'h-6', 'w-6', 'text-blue-600');
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('renders different sizes correctly', () => {
        const { rerender } = render(<LoadingSpinner size="sm" />);
        expect(screen.getByRole('status')).toHaveClass('h-4', 'w-4');

        rerender(<LoadingSpinner size="md" />);
        expect(screen.getByRole('status')).toHaveClass('h-6', 'w-6');

        rerender(<LoadingSpinner size="lg" />);
        expect(screen.getByRole('status')).toHaveClass('h-8', 'w-8');

        rerender(<LoadingSpinner size="xl" />);
        expect(screen.getByRole('status')).toHaveClass('h-12', 'w-12');
    });

    it('renders different colors correctly', () => {
        const { rerender } = render(<LoadingSpinner color="primary" />);
        expect(screen.getByRole('status')).toHaveClass('text-blue-600');

        rerender(<LoadingSpinner color="secondary" />);
        expect(screen.getByRole('status')).toHaveClass('text-gray-600');

        rerender(<LoadingSpinner color="white" />);
        expect(screen.getByRole('status')).toHaveClass('text-white');
    });

    it('applies custom className', () => {
        render(<LoadingSpinner className="custom-class" />);
        expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('has proper accessibility attributes', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveAttribute('role', 'status');
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('contains SVG with correct structure', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getByRole('status');

        expect(spinner.tagName).toBe('svg');
        expect(spinner).toHaveAttribute('viewBox', '0 0 24 24');
        expect(spinner).toHaveAttribute('fill', 'none');

        const circle = spinner.querySelector('circle');
        const path = spinner.querySelector('path');

        expect(circle).toBeInTheDocument();
        expect(path).toBeInTheDocument();
        expect(circle).toHaveClass('opacity-25');
        expect(path).toHaveClass('opacity-75');
    });
});