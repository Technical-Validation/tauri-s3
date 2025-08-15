import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
    it('renders with default props', () => {
        render(<ProgressBar value={50} />);
        const progressBar = screen.getByRole('progressbar');

        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '50');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        expect(progressBar).toHaveClass('bg-blue-600', 'h-2');
        expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('handles different progress values', () => {
        const { rerender } = render(<ProgressBar value={0} />);
        expect(screen.getByRole('progressbar')).toHaveStyle({ width: '0%' });

        rerender(<ProgressBar value={25} />);
        expect(screen.getByRole('progressbar')).toHaveStyle({ width: '25%' });

        rerender(<ProgressBar value={100} />);
        expect(screen.getByRole('progressbar')).toHaveStyle({ width: '100%' });
    });

    it('clamps values to valid range', () => {
        const { rerender } = render(<ProgressBar value={-10} />);
        expect(screen.getByRole('progressbar')).toHaveStyle({ width: '0%' });

        rerender(<ProgressBar value={150} />);
        expect(screen.getByRole('progressbar')).toHaveStyle({ width: '100%' });
    });

    it('handles custom max value', () => {
        render(<ProgressBar value={25} max={50} />);
        const progressBar = screen.getByRole('progressbar');

        expect(progressBar).toHaveAttribute('aria-valuemax', '50');
        expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('renders different sizes correctly', () => {
        const { rerender } = render(<ProgressBar value={50} size="sm" />);
        expect(screen.getByRole('progressbar')).toHaveClass('h-1');

        rerender(<ProgressBar value={50} size="md" />);
        expect(screen.getByRole('progressbar')).toHaveClass('h-2');

        rerender(<ProgressBar value={50} size="lg" />);
        expect(screen.getByRole('progressbar')).toHaveClass('h-3');
    });

    it('renders different colors correctly', () => {
        const { rerender } = render(<ProgressBar value={50} color="primary" />);
        expect(screen.getByRole('progressbar')).toHaveClass('bg-blue-600');

        rerender(<ProgressBar value={50} color="success" />);
        expect(screen.getByRole('progressbar')).toHaveClass('bg-green-600');

        rerender(<ProgressBar value={50} color="warning" />);
        expect(screen.getByRole('progressbar')).toHaveClass('bg-yellow-600');

        rerender(<ProgressBar value={50} color="danger" />);
        expect(screen.getByRole('progressbar')).toHaveClass('bg-red-600');
    });

    it('shows percentage label when showLabel is true', () => {
        render(<ProgressBar value={75} showLabel />);

        expect(screen.getByText('Progress')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows custom label', () => {
        render(<ProgressBar value={60} label="Upload Progress" />);

        expect(screen.getByText('Upload Progress')).toBeInTheDocument();
        expect(screen.queryByText('60%')).not.toBeInTheDocument();
    });

    it('shows both custom label and percentage', () => {
        render(<ProgressBar value={80} label="Download" showLabel />);

        expect(screen.getByText('Download')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('does not show label by default', () => {
        render(<ProgressBar value={50} />);

        expect(screen.queryByText('Progress')).not.toBeInTheDocument();
        expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
        render(<ProgressBar value={45} label="File Upload" />);
        const progressBar = screen.getByRole('progressbar');

        expect(progressBar).toHaveAttribute('role', 'progressbar');
        expect(progressBar).toHaveAttribute('aria-label', 'File Upload');
        expect(progressBar).toHaveAttribute('aria-valuenow', '45');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('applies custom className', () => {
        render(<ProgressBar value={50} className="custom-class" />);
        const container = screen.getByRole('progressbar').parentElement;
        expect(container).toHaveClass('custom-class');
    });

    it('handles decimal values correctly', () => {
        render(<ProgressBar value={33.33} showLabel />);

        expect(screen.getByText('33%')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveStyle({ width: '33.33%' });
    });
});