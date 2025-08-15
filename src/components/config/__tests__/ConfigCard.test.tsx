import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ConfigCard } from '../ConfigCard';
import { S3Config } from '../../../types/config';

const mockConfig: S3Config = {
    id: '1',
    name: 'Test Config',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    region: 'us-east-1',
    bucketName: 'test-bucket',
    templateId: 'aws',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    lastUsed: new Date('2024-01-03'),
    connectionStatus: 'connected',
    tags: ['production', 'backup'],
};

const defaultProps = {
    config: mockConfig,
    isActive: false,
    isSelected: false,
    viewMode: 'grid' as const,
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onTest: vi.fn(),
    onSetActive: vi.fn(),
};

describe('ConfigCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Grid View', () => {
        it('should render config information in grid view', () => {
            render(<ConfigCard {...defaultProps} />);

            expect(screen.getByText('Test Config')).toBeInTheDocument();
            expect(screen.getByText('test-bucket')).toBeInTheDocument();
            expect(screen.getByText('us-east-1')).toBeInTheDocument();
            expect(screen.getByText('已连接')).toBeInTheDocument();
        });

        it('should show active badge when config is active', () => {
            render(<ConfigCard {...defaultProps} isActive={true} />);

            expect(screen.getByText('活跃')).toBeInTheDocument();
        });

        it('should show selected state', () => {
            render(<ConfigCard {...defaultProps} isSelected={true} />);

            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).toBeChecked();
        });

        it('should display tags', () => {
            render(<ConfigCard {...defaultProps} />);

            expect(screen.getByText('production')).toBeInTheDocument();
            expect(screen.getByText('backup')).toBeInTheDocument();
        });

        it('should show error message when connection status is error', () => {
            const configWithError = {
                ...mockConfig,
                connectionStatus: 'error' as const,
                connectionError: 'Connection failed',
            };

            render(<ConfigCard {...defaultProps} config={configWithError} />);

            expect(screen.getByText('连接错误')).toBeInTheDocument();
            expect(screen.getByText('Connection failed')).toBeInTheDocument();
        });

        it('should call onSelect when checkbox is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const checkbox = screen.getByRole('checkbox');
            fireEvent.click(checkbox);

            expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
        });

        it('should call onEdit when edit button is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const editButton = screen.getByTitle('编辑配置');
            fireEvent.click(editButton);

            expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
        });

        it('should call onTest when test button is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const testButton = screen.getByTitle('测试连接');
            fireEvent.click(testButton);

            expect(defaultProps.onTest).toHaveBeenCalledTimes(1);
        });
    });

    describe('List View', () => {
        it('should render config information in list view', () => {
            render(<ConfigCard {...defaultProps} viewMode="list" />);

            expect(screen.getByText('Test Config')).toBeInTheDocument();
            expect(screen.getByText('test-bucket')).toBeInTheDocument();
            expect(screen.getByText('us-east-1')).toBeInTheDocument();
            expect(screen.getByText('已连接')).toBeInTheDocument();
        });

        it('should show template name in list view', () => {
            render(<ConfigCard {...defaultProps} viewMode="list" />);

            expect(screen.getByText('Amazon S3')).toBeInTheDocument();
        });
    });

    describe('Menu Actions', () => {
        it('should show menu when more actions button is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const menuButton = screen.getByTitle('更多操作');
            fireEvent.click(menuButton);

            expect(screen.getByText('设为活跃配置')).toBeInTheDocument();
            expect(screen.getByText('复制配置')).toBeInTheDocument();
            expect(screen.getByText('删除配置')).toBeInTheDocument();
        });

        it('should not show "设为活跃配置" when config is already active', () => {
            render(<ConfigCard {...defaultProps} isActive={true} />);

            const menuButton = screen.getByTitle('更多操作');
            fireEvent.click(menuButton);

            expect(screen.queryByText('设为活跃配置')).not.toBeInTheDocument();
        });

        it('should call onSetActive when "设为活跃配置" is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const menuButton = screen.getByTitle('更多操作');
            fireEvent.click(menuButton);

            const setActiveButton = screen.getByText('设为活跃配置');
            fireEvent.click(setActiveButton);

            expect(defaultProps.onSetActive).toHaveBeenCalledTimes(1);
        });

        it('should call onDuplicate when "复制配置" is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const menuButton = screen.getByTitle('更多操作');
            fireEvent.click(menuButton);

            const duplicateButton = screen.getByText('复制配置');
            fireEvent.click(duplicateButton);

            expect(defaultProps.onDuplicate).toHaveBeenCalledTimes(1);
        });

        it('should call onDelete when "删除配置" is clicked', () => {
            render(<ConfigCard {...defaultProps} />);

            const menuButton = screen.getByTitle('更多操作');
            fireEvent.click(menuButton);

            const deleteButton = screen.getByText('删除配置');
            fireEvent.click(deleteButton);

            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });
    });

    describe('Status Display', () => {
        it('should show correct status for different connection states', () => {
            const testCases = [
                { status: 'connected', text: '已连接' },
                { status: 'error', text: '连接错误' },
                { status: 'testing', text: '测试中' },
                { status: 'unknown', text: '未测试' },
            ];

            testCases.forEach(({ status, text }) => {
                const configWithStatus = {
                    ...mockConfig,
                    connectionStatus: status as any,
                };

                const { rerender } = render(<ConfigCard {...defaultProps} config={configWithStatus} />);

                expect(screen.getByText(text)).toBeInTheDocument();

                rerender(<div />); // Clear for next test
            });
        });
    });

    describe('Date Formatting', () => {
        it('should format last used date correctly', () => {
            render(<ConfigCard {...defaultProps} />);

            // Should show formatted date
            expect(screen.getByText(/最后使用/)).toBeInTheDocument();
        });

        it('should show "未知" when lastUsed is undefined', () => {
            const configWithoutLastUsed = {
                ...mockConfig,
                lastUsed: undefined,
            };

            render(<ConfigCard {...defaultProps} config={configWithoutLastUsed} />);

            expect(screen.getByText(/未知/)).toBeInTheDocument();
        });
    });
});