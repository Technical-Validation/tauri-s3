import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryMonitor, performanceTracker, debounce, throttle } from '../../utils/performance';

describe('Performance Utilities', () => {
    describe('MemoryMonitor', () => {
        let memoryMonitor: MemoryMonitor;
        let mockObserver: vi.Mock;

        beforeEach(() => {
            memoryMonitor = MemoryMonitor.getInstance();
            mockObserver = vi.fn();

            // Mock performance.memory
            Object.defineProperty(performance, 'memory', {
                value: {
                    usedJSHeapSize: 1000000,
                    totalJSHeapSize: 2000000,
                    jsHeapSizeLimit: 4000000
                },
                configurable: true
            });
        });

        afterEach(() => {
            memoryMonitor.stopMonitoring();
            memoryMonitor.removeObserver(mockObserver);
        });

        it('should start and stop monitoring', () => {
            memoryMonitor.addObserver(mockObserver);
            memoryMonitor.startMonitoring(100);

            expect(mockObserver).not.toHaveBeenCalled();

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(mockObserver).toHaveBeenCalled();
                    memoryMonitor.stopMonitoring();
                    resolve();
                }, 150);
            });
        });

        it('should get current memory usage', () => {
            const usage = memoryMonitor.getCurrentUsage();
            expect(usage).toBeDefined();
            expect(usage?.usedJSHeapSize).toBe(1000000);
        });
    });

    describe('PerformanceTracker', () => {
        beforeEach(() => {
            performanceTracker.clear();
        });

        it('should track performance marks and measures', () => {
            performanceTracker.mark('start');

            // Simulate some work
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Busy wait
            }

            performanceTracker.mark('end');
            const duration = performanceTracker.measure('test', 'start', 'end');

            expect(duration).toBeGreaterThan(0);
            expect(performanceTracker.getMeasure('test')).toBe(duration);
        });

        it('should handle missing marks gracefully', () => {
            const duration = performanceTracker.measure('test', 'nonexistent');
            expect(duration).toBe(0);
        });
    });

    describe('Debounce', () => {
        it('should debounce function calls', async () => {
            const mockFn = vi.fn();
            const debouncedFn = debounce(mockFn, 100);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            expect(mockFn).not.toHaveBeenCalled();

            await new Promise(resolve => setTimeout(resolve, 150));
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should handle immediate execution', () => {
            const mockFn = vi.fn();
            const debouncedFn = debounce(mockFn, 100, true);

            debouncedFn();
            expect(mockFn).toHaveBeenCalledTimes(1);

            debouncedFn();
            expect(mockFn).toHaveBeenCalledTimes(1); // Should not call again immediately
        });
    });

    describe('Throttle', () => {
        it('should throttle function calls', async () => {
            const mockFn = vi.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(mockFn).toHaveBeenCalledTimes(1);

            await new Promise(resolve => setTimeout(resolve, 150));

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(2);
        });
    });
});