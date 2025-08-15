import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
    invoke: vi.fn().mockResolvedValue({}),
}));

// Mock hooks
vi.mock('../../hooks/useConfig', () => ({
    useConfig: () => ({
        hasValidConfig: true,
        config: {
            id: 'test',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }
    })
}));

describe('Final Integration Tests', () => {
    it('should render the application without crashing', () => {
        render(<App />);

        // The app should render without throwing errors
        expect(document.body).toBeInTheDocument();
    });

    it('should handle lazy loading gracefully', async () => {
        render(<App />);

        // Should show loading fallback initially
        expect(screen.getByText('Loading page...')).toBeInTheDocument();
    });

    it('should integrate all performance optimizations', () => {
        // Test that performance utilities are available
        expect(typeof window.performance).toBe('object');

        // Test that memory monitoring can be initialized
        const { MemoryMonitor } = require('../../utils/performance');
        const monitor = MemoryMonitor.getInstance();
        expect(monitor).toBeDefined();
    });

    it('should integrate responsive utilities', () => {
        // Test that responsive utilities work
        const { useResponsive } = require('../../utils/responsive');
        expect(typeof useResponsive).toBe('function');
    });

    it('should integrate enhanced UI components', () => {
        // Test that enhanced components are available
        const { Toast, StatusIndicator, FeedbackOverlay, SkeletonLoader, ErrorBoundary } = require('../../components/common');

        expect(Toast).toBeDefined();
        expect(StatusIndicator).toBeDefined();
        expect(FeedbackOverlay).toBeDefined();
        expect(SkeletonLoader).toBeDefined();
        expect(ErrorBoundary).toBeDefined();
    });

    it('should integrate optimized file and upload components', () => {
        // Test that optimized components are available
        const { OptimizedFileList } = require('../../components/files');
        const { OptimizedUploadQueue } = require('../../components/upload');

        expect(OptimizedFileList).toBeDefined();
        expect(OptimizedUploadQueue).toBeDefined();
    });
});

describe('Performance Integration', () => {
    it('should have lazy loading implemented', () => {
        const { createLazyComponent } = require('../../utils/lazyLoading');
        expect(typeof createLazyComponent).toBe('function');
    });

    it('should have performance utilities available', () => {
        const { debounce, throttle, MemoryMonitor, performanceTracker } = require('../../utils/performance');

        expect(typeof debounce).toBe('function');
        expect(typeof throttle).toBe('function');
        expect(MemoryMonitor).toBeDefined();
        expect(performanceTracker).toBeDefined();
    });

    it('should have responsive utilities available', () => {
        const { useResponsive, useMediaQuery, useTouch } = require('../../utils/responsive');

        expect(typeof useResponsive).toBe('function');
        expect(typeof useMediaQuery).toBe('function');
        expect(typeof useTouch).toBe('function');
    });
});

describe('User Experience Integration', () => {
    it('should have toast notifications available', () => {
        const { useToast } = require('../../components/common/Toast');
        expect(typeof useToast).toBe('function');
    });

    it('should have feedback overlay available', () => {
        const { useFeedbackOverlay } = require('../../components/common/FeedbackOverlay');
        expect(typeof useFeedbackOverlay).toBe('function');
    });

    it('should have skeleton loaders available', () => {
        const {
            SkeletonLoader,
            TextSkeleton,
            CardSkeleton,
            FileListSkeleton,
            UploadQueueSkeleton
        } = require('../../components/common/SkeletonLoader');

        expect(SkeletonLoader).toBeDefined();
        expect(TextSkeleton).toBeDefined();
        expect(CardSkeleton).toBeDefined();
        expect(FileListSkeleton).toBeDefined();
        expect(UploadQueueSkeleton).toBeDefined();
    });

    it('should have error boundary available', () => {
        const { ErrorBoundary, withErrorBoundary } = require('../../components/common/ErrorBoundary');

        expect(ErrorBoundary).toBeDefined();
        expect(typeof withErrorBoundary).toBe('function');
    });
});

describe('Component Integration', () => {
    it('should have optimized file components available', () => {
        const { OptimizedFileList, VirtualizedFileList } = require('../../components/files');

        expect(OptimizedFileList).toBeDefined();
        expect(VirtualizedFileList).toBeDefined();
    });

    it('should have optimized upload components available', () => {
        const { OptimizedUploadQueue, UploadQueue } = require('../../components/upload');

        expect(OptimizedUploadQueue).toBeDefined();
        expect(UploadQueue).toBeDefined();
    });

    it('should have enhanced layout components available', () => {
        const Layout = require('../../components/layout/Layout').default;
        expect(Layout).toBeDefined();
    });
});