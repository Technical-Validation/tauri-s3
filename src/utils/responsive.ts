import { useEffect, useState } from 'react';
import { debounce } from './performance';

// Breakpoint definitions (matching Tailwind CSS defaults)
export const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook for responsive behavior
export const useResponsive = () => {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('sm');

    useEffect(() => {
        const handleResize = debounce(() => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            setWindowSize({ width, height });

            // Determine current breakpoint
            if (width >= breakpoints['2xl']) {
                setCurrentBreakpoint('2xl');
            } else if (width >= breakpoints.xl) {
                setCurrentBreakpoint('xl');
            } else if (width >= breakpoints.lg) {
                setCurrentBreakpoint('lg');
            } else if (width >= breakpoints.md) {
                setCurrentBreakpoint('md');
            } else {
                setCurrentBreakpoint('sm');
            }
        }, 150);

        // Set initial values
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isBreakpoint = (breakpoint: Breakpoint) => {
        return windowSize.width >= breakpoints[breakpoint];
    };

    const isMobile = windowSize.width < breakpoints.md;
    const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
    const isDesktop = windowSize.width >= breakpoints.lg;

    return {
        windowSize,
        currentBreakpoint,
        isBreakpoint,
        isMobile,
        isTablet,
        isDesktop,
    };
};

// Hook for media queries
export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        if (media.matches !== matches) {
            setMatches(media.matches);
        }

        const listener = () => setMatches(media.matches);

        // Use the newer addEventListener if available
        if (media.addEventListener) {
            media.addEventListener('change', listener);
            return () => media.removeEventListener('change', listener);
        } else {
            // Fallback for older browsers
            media.addListener(listener);
            return () => media.removeListener(listener);
        }
    }, [matches, query]);

    return matches;
};

// Utility functions for responsive classes
export const getResponsiveClasses = (
    classes: Partial<Record<Breakpoint | 'base', string>>
): string => {
    const { base = '', sm = '', md = '', lg = '', xl = '', '2xl': xl2 = '' } = classes;

    return [
        base,
        sm && `sm:${sm}`,
        md && `md:${md}`,
        lg && `lg:${lg}`,
        xl && `xl:${xl}`,
        xl2 && `2xl:${xl2}`,
    ].filter(Boolean).join(' ');
};

// Container queries (experimental)
export const useContainerQuery = (containerRef: React.RefObject<HTMLElement>) => {
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(
            debounce((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    setContainerSize({ width, height });
                }
            }, 100)
        );

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [containerRef]);

    return containerSize;
};

// Responsive grid utilities
export const getGridColumns = (
    itemCount: number,
    containerWidth: number,
    minItemWidth: number = 250,
    maxColumns: number = 6
): number => {
    const possibleColumns = Math.floor(containerWidth / minItemWidth);
    const optimalColumns = Math.min(possibleColumns, itemCount, maxColumns);
    return Math.max(1, optimalColumns);
};

// Responsive text utilities
export const getResponsiveTextSize = (breakpoint: Breakpoint): string => {
    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
    };

    return textSizes[breakpoint] || 'text-base';
};

// Touch device detection
export const useTouch = () => {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            setIsTouch(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-ignore - for older browsers
                navigator.msMaxTouchPoints > 0
            );
        };

        checkTouch();

        // Listen for touch events to detect touch capability
        const handleTouchStart = () => setIsTouch(true);

        window.addEventListener('touchstart', handleTouchStart, { once: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
        };
    }, []);

    return isTouch;
};

// Orientation detection
export const useOrientation = () => {
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    useEffect(() => {
        const updateOrientation = () => {
            setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
        };

        updateOrientation();

        window.addEventListener('resize', updateOrientation);
        window.addEventListener('orientationchange', updateOrientation);

        return () => {
            window.removeEventListener('resize', updateOrientation);
            window.removeEventListener('orientationchange', updateOrientation);
        };
    }, []);

    return orientation;
};

// Reduced motion preference
export const useReducedMotion = () => {
    return useMediaQuery('(prefers-reduced-motion: reduce)');
};

// Dark mode preference
export const useDarkMode = () => {
    return useMediaQuery('(prefers-color-scheme: dark)');
};

// High contrast preference
export const useHighContrast = () => {
    return useMediaQuery('(prefers-contrast: high)');
};