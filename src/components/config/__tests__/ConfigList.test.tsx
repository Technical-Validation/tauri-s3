import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ConfigList } from '../ConfigList';
import { S3Config } from '../../../types/config';

const mockConfigs: S3Config[] = [
    {
        id: '1',
        name: 'AWS Production',
        accessKeyId: 'key1',
        secretAccessKey: 'secret1',
        region: 'us-east-1',
        bucketName: 'prod-bucket',
        templateId: 'aws',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastUsed: new Date('2024-01-03'),
        connectionStatus: 'connected',
        tags: ['production'],
    },
    {
        id: '2',
        name: 'MinIO Local',
        accessKeyId: 'key2',
        secretAccessKey: 'secret2',
        region: 'us-east-1',
        bucketName: 'local-bucket',
        endpoint: 'http://localhost:9000',
        templateId: 'minio',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-03'),
        connectionStatus: 'error',
        connectionError: 'Connection timeout',
        tags: ['development'],
    },
];

const defaultProps = {
    configs: mockConfigs,
    activeConfigId: '1',
    selectedConfigs: [],
    searchQuery: '',
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    loading: false,
    onConfigSelect: vi.fn(),
    onConfigEdit: vi.fn(),
    onConfigDelete: vi.fn(),
    onConfigDuplicate: vi.fn(),
    onConfigTest: vi.fn(),
    onSetActiveConfig: vi.fn(),
    onToggleSelection: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onSearchChange: vi.fn(),
    onSortChange: vi.fn(),
    onCreateNew: vi.fn(),
};

describe('ConfigList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render config list with all configs', () => {
        render(<ConfigList {...defaultProps} />);

        expect(screen.getByText('AWS Production')).toBeInTheDocument();
        expect(screen.getByText('MinIO Local')).toBeInTheDocument();
        expect(screen.getByText('配置管理')).toBeInTheDocument();
        expect(screen.getByText('管理您的 S3 存储配置 (2 个配置)')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        render(<ConfigList {...defaultProps} loading={true} />);

        expect(screen.getByText('加载配置中...')).toBeInTheDocument();
    });

    it('should show empty state when no configs', () => {
        render(<ConfigList {...defaultProps} configs={[]} />);

        expect(screen.getByText('还没有配置')).toBeInTheDocument();
        expect(screen.getByText('创建您的第一个 S3 存储配置来开始使用')).toBeInTheDocument();
    });

    it('should call onCreateNew when create button is clicked', () => {
        render(<ConfigList {...defaultProps} />);

        const createButton = screen.getByText('新建配置');
        fireEvent.click(createButton);

        expect(defaultProps.onCreateNew).toHaveBeenCalledTimes(1);
    });

    it('should call onSearchChange when search input changes', () => {
        render(<ConfigList {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText('搜索配置名称、存储桶或标签...');
        fireEvent.change(searchInput, { target: { value: 'test' } });

        expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test');
    });
});