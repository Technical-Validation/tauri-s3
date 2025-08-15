/**
 * Performance optimization utilities
 */

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate = false
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };

        const callNow = immediate && !timeout;

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func(...args);
    };
}

/**
 * Throttle function to limit function execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
    private static instance: MemoryMonitor;
    private observers: Array<(usage: MemoryInfo) => void> = [];
    private intervalId: NodeJS.Timeout | null = null;

    static getInstance(): MemoryMonitor {
        if (!MemoryMonitor.instance) {
            MemoryMonitor.instance = new MemoryMonitor();
        }
        return MemoryMonitor.instance;
    }

    startMonitoring(interval = 5000): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                this.notifyObservers(memory);
            }
        }, interval);
    }

    stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    addObserver(callback: (usage: MemoryInfo) => void): void {
        this.observers.push(callback);
    }

    removeObserver(callback: (usage: MemoryInfo) => void): void {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    private notifyObservers(usage: MemoryInfo): void {
        this.observers.forEach(observer => observer(usage));
    }

    getCurrentUsage(): MemoryInfo | null {
        if ('memory' in performance) {
            return (performance as any).memory;
        }
        return null;
    }
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollOptions {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
    threshold?: number;
}

export function calculateVirtualScrollRange(
    scrollTop: number,
    totalItems: number,
    options: VirtualScrollOptions
): { startIndex: number; endIndex: number; visibleItems: number } {
    const { itemHeight, containerHeight, overscan = 5, threshold = 0 } = options;

    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        totalItems - 1,
        startIndex + visibleItems + overscan * 2
    );

    return {
        startIndex,
        endIndex,
        visibleItems
    };
}

/**
 * Intersection Observer utility for lazy loading
 */
export class LazyLoadObserver {
    private observer: IntersectionObserver;
    private callbacks = new Map<Element, () => void>();

    constructor(options: IntersectionObserverInit = {}) {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const callback = this.callbacks.get(entry.target);
                    if (callback) {
                        callback();
                        this.unobserve(entry.target);
                    }
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        });
    }

    observe(element: Element, callback: () => void): void {
        this.callbacks.set(element, callback);
        this.observer.observe(element);
    }

    unobserve(element: Element): void {
        this.callbacks.delete(element);
        this.observer.unobserve(element);
    }

    disconnect(): void {
        this.observer.disconnect();
        this.callbacks.clear();
    }
}

/**
 * Request idle callback utility
 */
export function requestIdleCallback(
    callback: () => void,
    options: { timeout?: number } = {}
): void {
    if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, options);
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(callback, 1);
    }
}

/**
 * Batch DOM updates
 */
export class BatchUpdater {
    private updates: Array<() => void> = [];
    private scheduled = false;

    add(update: () => void): void {
        this.updates.push(update);
        this.schedule();
    }

    private schedule(): void {
        if (this.scheduled) return;

        this.scheduled = true;
        requestAnimationFrame(() => {
            const updates = [...this.updates];
            this.updates = [];
            this.scheduled = false;

            updates.forEach(update => update());
        });
    }

    flush(): void {
        if (this.updates.length === 0) return;

        const updates = [...this.updates];
        this.updates = [];
        this.scheduled = false;

        updates.forEach(update => update());
    }
}

export const batchUpdater = new BatchUpdater();

/**
 * Performance measurement utilities
 */
export class PerformanceTracker {
    private marks = new Map<string, number>();
    private measures = new Map<string, number>();

    mark(name: string): void {
        this.marks.set(name, performance.now());
    }

    measure(name: string, startMark: string, endMark?: string): number {
        const startTime = this.marks.get(startMark);
        if (!startTime) {
            console.warn(`Start mark "${startMark}" not found`);
            return 0;
        }

        const endTime = endMark ? this.marks.get(endMark) : performance.now();
        if (endMark && !endTime) {
            console.warn(`End mark "${endMark}" not found`);
            return 0;
        }

        const duration = (endTime || performance.now()) - startTime;
        this.measures.set(name, duration);

        return duration;
    }

    getMeasure(name: string): number | undefined {
        return this.measures.get(name);
    }

    getAllMeasures(): Record<string, number> {
        return Object.fromEntries(this.measures);
    }

    clear(): void {
        this.marks.clear();
        this.measures.clear();
    }
}

export const performanceTracker = new PerformanceTracker();