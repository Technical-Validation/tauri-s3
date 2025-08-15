import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConnectionDiagnostics } from '../ConnectionDiagnostics';
import { ConnectionTestResult } from '../../../types/config';

const mockSuccessResult: ConnectionTestResult = {
    success: true,
    duration: 1200,
    details: {
        authentication: true,
        bucketAccess: true,
        permissions: ['read', 'write', 'list'],
        bucketInfo: {
            region: 'us-east-1',
            creationDate: new Date('2024-01-15'),
            objectCount: 1234,
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
        suggestions: [
            'Check your access key ID',
            'Verify credentials are correct',
            'Ensure IAM user has proper permissions',
        ],
    },
};

describe('ConnectionDiagnostics', () => {
    it('renders success diagnostics correctly', () => {
        render(<ConnectionDiagnostics result={mockSuccessResult} />);

        expect(screen.getByText(/连接测试成功/)).toBeInTheDocument();
        expect(screen.getByText(/耗时: 1.2s/)).toBeInTheDocument();
        expect(screen.getByText('存储桶信息:')).toBeInTheDocument();
        expect(screen.getByText('权限检查:')).toBeInTheDocument();
        expect(screen.getByText('性能信息:')).toBeInTheDocument();
    });

    it('displays bucket information correctly', () => {
        render(<ConnectionDiagnostics result={mockSuccessResult} />);

        expect(screen.getByText('us-east-1')).toBeInTheDocument();
        expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('shows permission details', () => {
        render(<ConnectionDiagnostics result={mockSuccessResult} />);

        expect(screen.getByText('身份验证')).toBeInTheDocument();
        expect(screen.getByText('存储桶访问')).toBeInTheDocument();
        expect(screen.getByText('✓ 读取')).toBeInTheDocument();
        expect(screen.getByText('✓ 写入')).toBeInTheDocument();
        expect(screen.getByText('✓ 列表')).toBeInTheDocument();
    });

    it('displays performance information with correct labels', () => {
        render(<ConnectionDiagnostics result={mockSuccessResult} />);

        expect(screen.getByText('连接延迟:')).toBeInTheDocument();
        expect(screen.getByText('1.2s')).toBeInTheDocument();
        expect(screen.getByText('(一般)')).toBeInTheDocument();
    });

    it('renders error diagnostics correctly', () => {
        render(<ConnectionDiagnostics result={mockErrorResult} />);

        expect(screen.getByText(/连接测试失败/)).toBeInTheDocument();
        expect(screen.getByText(/耗时: 800ms/)).toBeInTheDocument();
        expect(screen.getByText('错误详情:')).toBeInTheDocument();
        expect(screen.getByText('检查结果:')).toBeInTheDocument();
        expect(screen.getByText('故障排除建议:')).toBeInTheDocument();
    });

    it('displays error details correctly', () => {
        render(<ConnectionDiagnostics result={mockErrorResult} />);

        expect(screen.getByText('InvalidAccessKeyId')).toBeInTheDocument();
        expect(screen.getByText('The AWS Access Key Id you provided does not exist in our records.')).toBeInTheDocument();
    });

    it('shows troubleshooting suggestions', () => {
        render(<ConnectionDiagnostics result={mockErrorResult} />);

        expect(screen.getByText('Check your access key ID')).toBeInTheDocument();
        expect(screen.getByText('Verify credentials are correct')).toBeInTheDocument();
        expect(screen.getByText('Ensure IAM user has proper permissions')).toBeInTheDocument();
    });

    it('displays failed permission checks', () => {
        render(<ConnectionDiagnostics result={mockErrorResult} />);

        const authElements = screen.getAllByText('身份验证');
        const bucketElements = screen.getAllByText('存储桶访问');

        expect(authElements.length).toBeGreaterThan(0);
        expect(bucketElements.length).toBeGreaterThan(0);
        expect(screen.getAllByText('失败')).toHaveLength(2);
    });

    it('shows common solutions for errors', () => {
        render(<ConnectionDiagnostics result={mockErrorResult} />);

        expect(screen.getByText('常见解决方案:')).toBeInTheDocument();
        expect(screen.getByText('检查网络连接')).toBeInTheDocument();
        expect(screen.getByText('验证访问凭据')).toBeInTheDocument();
        expect(screen.getByText('检查存储桶权限')).toBeInTheDocument();
        expect(screen.getByText('验证区域设置')).toBeInTheDocument();
    });

    it('shows advanced diagnostics when enabled', () => {
        render(<ConnectionDiagnostics result={mockSuccessResult} showAdvanced={true} />);

        expect(screen.getByText('高级诊断:')).toBeInTheDocument();
        expect(screen.getByText('SSL/TLS:')).toBeInTheDocument();
        expect(screen.getByText('协议版本:')).toBeInTheDocument();
        expect(screen.getByText('数据传输:')).toBeInTheDocument();
        expect(screen.getByText('建议延迟:')).toBeInTheDocument();
        expect(screen.getByText('连接质量:')).toBeInTheDocument();
    });

    it('handles missing bucket info gracefully', () => {
        const resultWithoutBucketInfo: ConnectionTestResult = {
            ...mockSuccessResult,
            details: {
                ...mockSuccessResult.details,
                bucketInfo: undefined,
            },
        };

        render(<ConnectionDiagnostics result={resultWithoutBucketInfo} />);

        expect(screen.getByText(/连接测试成功/)).toBeInTheDocument();
        expect(screen.getByText('权限检查:')).toBeInTheDocument();
        // Should not show bucket info section
        expect(screen.queryByText('存储桶信息:')).not.toBeInTheDocument();
    });

    it('formats duration correctly for different values', () => {
        const fastResult = { ...mockSuccessResult, duration: 250 };
        const { rerender } = render(<ConnectionDiagnostics result={fastResult} />);

        expect(screen.getByText(/250ms/)).toBeInTheDocument();
        expect(screen.getByText('(优秀)')).toBeInTheDocument();

        const slowResult = { ...mockSuccessResult, duration: 3000 };
        rerender(<ConnectionDiagnostics result={slowResult} />);

        expect(screen.getByText(/3.0s/)).toBeInTheDocument();
        expect(screen.getByText('(较慢)')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <ConnectionDiagnostics result={mockSuccessResult} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });
});