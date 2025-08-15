import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ConnectionTest } from '../ConnectionTest';
import { S3Config, ConnectionTestResult } from '../../../types/config';

// Mock components
vi.mock('../ConnectionDiagnostics', () => ({
    ConnectionDiagnostics: ({ result }: { result: ConnectionTestResult }) => (
        <div data-testid="connection-diagnostics">
            {result.success ? 'Success' : 'Failed'}
        </div>
    ),
}));

const mockConfig: S3Config = {
    id: 'test-config',
    name: 'Test Config',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
    bucketName: 'test-bucket',
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockSuccessResult: ConnectionTestResult = {
    success: true,
    duration: 1200,
    details: {
        authentication: true,
        bucketAccess: true,
        permissions: ['read', 'write'],
        bucketInfo: {
            region: 'us-east-1',
            creationDate: new Date(),
            objectCount: 100,
        },
    },
};

const mockErrorResult: ConnectionTestResult = {
    success: false,
    duration: 800,
    details: {
        authentication: false,
        bucketAccess: false,
        permissions: [],
    },
    error: {
        code: 'InvalidAccessKeyId',
        message: 'The AWS Access Key Id you provided does not exist in our records.',
        suggestions: ['Check your access key ID', 'Verify credentials are correct'],
    },
};

describe('ConnectionTest', () => {
    const mockOnTest = vi.fn();

    beforeEach(() => {
        mockOnTest.mockClear();
    });

    it('renders connection test component', () => {
        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} />);

        expect(screen.getByText('连接测试')).toBeInTheDocument();
        expect(screen.getByText('开始测试')).toBeInTheDocument();
    });

    it('shows test progress when testing', async () => {
        mockOnTest.mockResolvedValue(mockSuccessResult);

        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} />);

        fireEvent.click(screen.getByText('开始测试'));

        expect(screen.getByText('测试中...')).toBeInTheDocument();
        expect(screen.getByText('测试进度')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('连接成功')).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it('displays test steps with progress', async () => {
        mockOnTest.mockResolvedValue(mockSuccessResult);

        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} />);

        fireEvent.click(screen.getByText('开始测试'));

        // Check that test steps are displayed
        expect(screen.getByText('检查网络连接')).toBeInTheDocument();
        expect(screen.getByText('验证访问密钥')).toBeInTheDocument();
        expect(screen.getByText('验证存储桶访问')).toBeInTheDocument();
        expect(screen.getByText('检查权限')).toBeInTheDocument();
        expect(screen.getByText('获取存储桶信息')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockOnTest).toHaveBeenCalledWith(mockConfig);
        }, { timeout: 5000 });
    });

    it('shows advanced diagnostics when enabled', async () => {
        mockOnTest.mockResolvedValue(mockSuccessResult);

        render(
            <ConnectionTest
                config={mockConfig}
                onTest={mockOnTest}
                showAdvancedDiagnostics={true}
            />
        );

        fireEvent.click(screen.getByText('开始测试'));

        await waitFor(() => {
            expect(screen.getByText('连接成功')).toBeInTheDocument();
        }, { timeout: 5000 });

        // Should show step descriptions in advanced mode
        expect(screen.getByText('验证网络连通性和DNS解析')).toBeInTheDocument();
    });

    it('handles test errors correctly', async () => {
        mockOnTest.mockResolvedValue(mockErrorResult);

        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} />);

        fireEvent.click(screen.getByText('开始测试'));

        await waitFor(() => {
            expect(screen.getByText('连接失败')).toBeInTheDocument();
        }, { timeout: 5000 });

        expect(screen.getByTestId('connection-diagnostics')).toHaveTextContent('Failed');
    });

    it('supports auto testing', async () => {
        mockOnTest.mockResolvedValue(mockSuccessResult);

        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} autoTest={true} />);

        await waitFor(() => {
            expect(mockOnTest).toHaveBeenCalledWith(mockConfig);
        }, { timeout: 5000 });
    });

    it('calls onStatusChange when status changes', async () => {
        const mockOnStatusChange = vi.fn();
        mockOnTest.mockResolvedValue(mockSuccessResult);

        render(
            <ConnectionTest
                config={mockConfig}
                onTest={mockOnTest}
                realTimeUpdates={true}
                onStatusChange={mockOnStatusChange}
            />
        );

        fireEvent.click(screen.getByText('开始测试'));

        await waitFor(() => {
            expect(mockOnStatusChange).toHaveBeenCalledWith('success');
        }, { timeout: 5000 });
    });

    it('handles test exceptions gracefully', async () => {
        mockOnTest.mockRejectedValue(new Error('Network error'));

        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} />);

        fireEvent.click(screen.getByText('开始测试'));

        await waitFor(() => {
            expect(screen.getByText('连接失败')).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it('disables test button while testing', async () => {
        let resolveTest: (value: ConnectionTestResult) => void;
        const testPromise = new Promise<ConnectionTestResult>((resolve) => {
            resolveTest = resolve;
        });
        mockOnTest.mockReturnValue(testPromise);

        render(<ConnectionTest config={mockConfig} onTest={mockOnTest} />);

        const testButton = screen.getByText('开始测试');
        fireEvent.click(testButton);

        expect(testButton).toBeDisabled();

        // Resolve the test
        resolveTest!(mockSuccessResult);

        await waitFor(() => {
            expect(testButton).not.toBeDisabled();
        }, { timeout: 5000 });
    });
});