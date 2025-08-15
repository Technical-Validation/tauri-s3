import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
    it('renders with default props', () => {
        render(<Input placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('ring-gray-300');
    });

    it('renders with label', () => {
        render(<Input label="Username" placeholder="Enter username" />);
        const label = screen.getByText('Username');
        const input = screen.getByPlaceholderText('Enter username');

        expect(label).toBeInTheDocument();
        expect(label).toHaveAttribute('for', input.id);
    });

    it('shows error state correctly', () => {
        render(<Input error="This field is required" placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        const errorMessage = screen.getByText('This field is required');

        expect(input).toHaveClass('ring-red-300', 'text-red-900');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
    });

    it('shows helper text when no error', () => {
        render(<Input helperText="This is helper text" placeholder="Enter text" />);
        const helperText = screen.getByText('This is helper text');

        expect(helperText).toBeInTheDocument();
        expect(helperText).toHaveClass('text-gray-500');
    });

    it('prioritizes error over helper text', () => {
        render(
            <Input
                error="Error message"
                helperText="Helper text"
                placeholder="Enter text"
            />
        );

        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });

    it('renders with left icon', () => {
        const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
        render(<Input leftIcon={<LeftIcon />} placeholder="Search" />);

        const input = screen.getByPlaceholderText('Search');
        const icon = screen.getByTestId('left-icon');

        expect(input).toHaveClass('pl-10');
        expect(icon).toBeInTheDocument();
    });

    it('renders with right icon', () => {
        const RightIcon = () => <span data-testid="right-icon">✓</span>;
        render(<Input rightIcon={<RightIcon />} placeholder="Enter text" />);

        const input = screen.getByPlaceholderText('Enter text');
        const icon = screen.getByTestId('right-icon');

        expect(input).toHaveClass('pr-10');
        expect(icon).toBeInTheDocument();
    });

    it('handles filled variant', () => {
        render(<Input variant="filled" placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toHaveClass('bg-gray-50');
    });

    it('handles filled variant with error', () => {
        render(<Input variant="filled" error="Error" placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toHaveClass('bg-red-50', 'ring-red-300');
    });

    it('handles disabled state', () => {
        render(<Input disabled placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toBeDisabled();
        expect(input).toHaveClass('disabled:opacity-50');
    });

    it('handles input events', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} placeholder="Enter text" />);

        const input = screen.getByPlaceholderText('Enter text');
        fireEvent.change(input, { target: { value: 'test value' } });

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(input).toHaveValue('test value');
    });

    it('forwards ref correctly', () => {
        const ref = { current: null };
        render(<Input ref={ref} placeholder="Enter text" />);

        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('applies custom className', () => {
        render(<Input className="custom-class" placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toHaveClass('custom-class');
    });
});