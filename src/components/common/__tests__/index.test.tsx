import { render } from '@testing-library/react';
import { Button, Input, Modal, ProgressBar, LoadingSpinner } from '../index';

describe('Component exports', () => {
    it('exports all components correctly', () => {
        expect(Button).toBeDefined();
        expect(Input).toBeDefined();
        expect(Modal).toBeDefined();
        expect(ProgressBar).toBeDefined();
        expect(LoadingSpinner).toBeDefined();
    });

    it('can render all components without errors', () => {
        expect(() => {
            render(<Button>Test</Button>);
            render(<Input />);
            render(<Modal isOpen={false} onClose={() => { }}>Content</Modal>);
            render(<ProgressBar value={50} />);
            render(<LoadingSpinner />);
        }).not.toThrow();
    });
});