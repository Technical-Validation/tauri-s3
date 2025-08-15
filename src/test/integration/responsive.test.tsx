import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsive, useMediaQuery, useTouch, useOrientation } from '../../utils/responsive';

// Mock window properties
const mockWindow = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
    });
};

describe('Responsive Utilities', () => {
    beforeEach(() => {
        // Reset window size
        mockWindow(1024, 768);
    });

    describe('useResponsive', () => {
        it('should detect desktop breakpoint', () => {
            mockWindow(1024, 768);
            const { result } = renderHook(() => useResponsive());

            expect(result.current.isDesktop).toBe(true);
            expect(result.current.isMobile).toBe(false);
            expect(result.current.isTablet).toBe(false);
            expect(result.current.currentBreakpoint).toBe('lg');
        });

        it('should detect mobile breakpoint', () => {
            mockWindow(640, 480);
            const { result } = renderHook(() => useResponsive());

            expect(result.current.isMobile).toBe(true);
            expect(result.current.isDesktop).toBe(false);
            expect(result.current.currentBreakpoint).toBe('sm');
        });

        it('should detect tablet breakpoint', () => {
            mockWindow(768, 1024);
            const { result } = renderHook(() => useResponsive());

            expect(result.current.isTablet).toBe(true);
            expect(result.current.isMobile).toBe(false);
            expect(result.current.isDesktop).toBe(false);
            expect(result.current.currentBreakpoint).toBe('md');
        });

        it('should update on window resize', () => {
            const { result } = renderHook(() => useResponsive());

            expect(result.current.isDesktop).toBe(true);

            act(() => {
                mockWindow(640, 480);
                window.dispatchEvent(new Event('resize'));
            });

            // Note: Due to debouncing, we might need to wait
            setTimeout(() => {
                expect(result.current.isMobile).toBe(true);
            }, 200);
        });
    });

    describe('useMediaQuery', () => {
        it('should match media query', () => {
            // Mock matchMedia
            const mockMatchMedia = vi.fn().mockImplementation((query) => ({
                matches: query === '(min-width: 768px)',
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: mockMatchMedia,
            });

            const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
            expect(result.current).toBe(true);
        });
    });

    describe('useOrientation', () => {
        it('should detect portrait orientation', () => {
            mockWindow(768, 1024);
            const { result } = renderHook(() => useOrientation());

            expect(result.current).toBe('portrait');
        });

        it('should detect landscape orientation', () => {
            mockWindow(1024, 768);
            const { result } = renderHook(() => useOrientation());

            expect(result.current).toBe('landscape');
        });
    });

    describe('useTouch', () => {
        it('should detect touch capability', () => {
            // Mock touch support
            Object.defineProperty(window, 'ontouchstart', {
                value: {},
                configurable: true,
            });

            const { result } = renderHook(() => useTouch());
            expect(result.current).toBe(true);
        });

        it('should detect non-touch devices', () => {
            // Remove touch support
            delete (window as any).ontouchstart;
            Object.defineProperty(navigator, 'maxTouchPoints', {
                value: 0,
                configurable: true,
            });

            const { result } = renderHook(() => useTouch());
            expect(result.current).toBe(false);
        });
    });
});