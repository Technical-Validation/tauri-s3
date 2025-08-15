import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { VirtualizedFileList } from '../VirtualizedFileList';
import { S3File, FileSelection } from '../../../types/file';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock react-window
vi.mock('react-window', () => ({
    FixedSizeList: ({ children, itemData, itemCount }: any) => (
        <div data-testid="virtualized-list">
            {Array.from({ length: Math.min(itemCount, 10) }, (_, index) => {
                const Child = children;
                return <Child key={index} index={index} style={{}} data={itemData} />;
            })}
        </div>
    ),
}));

const mockFiles: S3File[] = [
    {
        key: 'file1.txt',
        name: 'file1.txt',
        size: 1024,
        lastModified: new Date('2023-01-01'),
        etag: 'etag1',
        isDirectory: false,
    },
    {
        key: 'folder1/',
        name: 'folder1',
        size: 0,
        lastModified: new Date('2023-01-02'),
        etag: 'etag2',
        isDirectory: true,
    },
];

const mockSelection: FileSelection = {
    selectedFiles: new Set(),
    selectAll: false,
    selectionCount: 0,
};

const mockProps = {
    files: mockFiles,
    loading: false,
    onNavigate: vi.fn(),
    onContextMenu: vi.fn(),
    selection: mockSelection,
};

describe('VirtualizedFileList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders virtualized list with files', () => {
        render(<VirtualizedFileList {...mockProps} />);

        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        expect(screen.getByText('名称')).toBeInTheDocument();
        expect(screen.getByText('大小')).toBeInTheDocument();
        expect(screen.getByText('类型')).toBeInTheDocument();
        expect(screen.getByText('修改时间')).toBeInTheDocument();
    });

    it('shows empty state when no files', () => {
        render(<VirtualizedFileList {...mockProps} files={[]} />);

        expect(screen.getByText('此文件夹为空')).toBeInTheDocument();
        expect(screen.getByText('此位置没有文件或文件夹')).toBeInTheDocument();
    });

    it('shows loading state', () => {
        render(<VirtualizedFileList {...mockProps} loading={true} />);

        expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('renders with custom item height', () => {
        render(<VirtualizedFileList {...mockProps} itemHeight={80} />);

        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
});