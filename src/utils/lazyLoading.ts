import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loading utility with error boundary and retry mechanism
 */
export function createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: {
        retryCount?: number;
        retryDelay?: number;
        fallback?: ComponentType;
    } = {}
): ComponentType<any> {
    const { retryCount = 3, retryDelay = 1000 } = options;

    const lazyImport = () => {
        let retries = 0;

        const attemptImport = (): Promise<{ default: T }> => {
            return importFn().catch((error) => {
                if (retries < retryCount) {
                    retries++;
                    console.warn(`Lazy loading failed, retrying (${retries}/${retryCount})...`, error);

                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(attemptImport());
                        }, retryDelay * retries);
                    });
                }

                console.error('Lazy loading failed after all retries:', error);
                throw error;
            });
        };

        return attemptImport();
    };

    return lazy(lazyImport);
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<any>): Promise<any> {
    return importFn().catch((error) => {
        console.warn('Component preload failed:', error);
        return null;
    });
}

/**
 * Batch preload multiple components
 */
export function preloadComponents(importFns: Array<() => Promise<any>>): Promise<any[]> {
    return Promise.allSettled(importFns.map(fn => preloadComponent(fn)));
}

/**
 * Memory-efficient component cache
 */
class ComponentCache {
    private cache = new Map<string, ComponentType<any>>();
    private maxSize = 10;

    set(key: string, component: ComponentType<any>): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, component);
    }

    get(key: string): ComponentType<any> | undefined {
        return this.cache.get(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

export const componentCache = new ComponentCache();