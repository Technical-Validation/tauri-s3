import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BatchConnectionTest } from '../BatchConnectionTest';
import { S3Config, ConnectionTestResult } from '../../../types/config';

const mockConfigs: S3Config[] = [
    {
        id: 'config-1',
        name: 'AWS Production',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        bucketName: 'prod-bucket',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'config-2',
        name: 'AWS Staging',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2',
        bucketName: 'staging-bucket',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

const mockSuccessResult: ConnectionTestResult = {
    success: true,
    duration: 1200,
    details: {
        authentication: true,
        bucketAccess: true,
        permissions: ['read', 'write'],
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
        message: 'Invalid credentials',
        suggestions: ['Check your access key'],
    },
};

describe('BatchConnectionTest', () => {
    const mockOnTestAll = vi.fn();
    const mockOnTestConfig = vi.fn();
    const mockOnProgress = vi.fn();

    beforeEach(() => {
        mockOnTestAll.mockClear();
        mockOnTestConfig.mockClear();
        mockOnProgress.mockClear();
    });

    it('renders batch connection test component', () => {
        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        expect(screen.getByText('批量连接测试')).toBeInTheDocument();
        expect(screen.getByText('开始批量测试')).toBeInTheDocument();
        expect(screen.getByText('测试所有配置的连接状态 (2 个配置)')).toBeInTheDocument();
    });

    it('shows empty state when no configs', () => {
        render(
            <BatchConnectionTest
                configs={[]}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        expect(screen.getByText('没有配置可测试')).toBeInTheDocument();
        expect(screen.getByText('请先添加一些 S3 配置')).toBeInTheDocument();
    });

    it('performs sequential batch testing', async () => {
        mockOnTestConfig
            .mockResolvedValueOnce(mockSuccessResult)
            .mockResolvedValueOnce(mockErrorResult);

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
                onProgress={mockOnProgress}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        expect(screen.getByText('测试中...')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockOnTestConfig).toHaveBeenCalledTimes(2);
        });

        expect(mockOnProgress).toHaveBeenCalledWith(1, 2);
        expect(mockOnProgress).toHaveBeenCalledWith(2, 2);
    });

    it('performs parallel batch testing', async () => {
        mockOnTestConfig
            .mockResolvedValueOnce(mockSuccessResult)
            .mockResolvedValueOnce(mockErrorResult);

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
                parallelTests={true}
                showDetailedProgress={true}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        expect(screen.getByText('并行测试进行中...')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockOnTestConfig).toHaveBeenCalledTimes(2);
        });
    });

    it('shows test progress and results', async () => {
        mockOnTestConfig
            .mockResolvedValueOnce(mockSuccessResult)
            .mockResolvedValueOnce(mockErrorResult);

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        // Should show progress
        expect(screen.getByText('正在测试: AWS Production')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('测试结果摘要')).toBeInTheDocument();
        });

        // Should show summary stats
        expect(screen.getByText('2')).toBeInTheDocument(); // Total
        expect(screen.getByText('1')).toBeInTheDocument(); // Successful
        expect(screen.getByText('1')).toBeInTheDocument(); // Failed
    });

    it('shows detailed results for each config', async () => {
        mockOnTestConfig
            .mockResolvedValueOnce(mockSuccessResult)
            .mockResolvedValueOnce(mockErrorResult);

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        await waitFor(() => {
            expect(screen.getByText('详细结果')).toBeInTheDocument();
        });

        // Should show individual config results
        expect(screen.getByText('AWS Production')).toBeInTheDocument();
        expect(screen.getByText('AWS Staging')).toBeInTheDocument();
        expect(screen.getByText('连接成功')).toBeInTheDocument();
        expect(screen.getByText('连接失败')).toBeInTheDocument();
    });

    it('handles test errors gracefully', async () => {
        mockOnTestConfig.mockRejectedValue(new Error('Network error'));

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        await waitFor(() => {
            expect(screen.getByText('测试结果摘要')).toBeInTheDocument();
        });

        // Should show all as failed
        expect(screen.getByText('2')).toBeInTheDocument(); // Failed count
    });

    it('disables test button while testing', async () => {
        mockOnTestConfig.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve(mockSuccessResult), 100))
        );

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        const testButton = screen.getByText('开始批量测试');
        fireEvent.click(testButton);

        expect(testButton).toBeDisabled();

        await waitFor(() => {
            expect(testButton).not.toBeDisabled();
        });
    });

    it('shows estimated time remaining', async () => {
        mockOnTestConfig.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve(mockSuccessResult), 50))
        );

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        await waitFor(() => {
            expect(screen.getByText(/预计剩余:/)).toBeInTheDocument();
        });
    });

    it('shows current testing configs in parallel mode', async () => {
        mockOnTestConfig.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve(mockSuccessResult), 100))
        );

        render(
            <BatchConnectionTest
                configs={mockConfigs}
                onTestAll={mockOnTestAll}
                onTestConfig={mockOnTestConfig}
                parallelTests={true}
                showDetailedProgress={true}
            />
        );

        fireEvent.click(screen.getByText('开始批量测试'));

        expect(screen.getByText('当前测试中')).toBeInTheDocument();
    });
});