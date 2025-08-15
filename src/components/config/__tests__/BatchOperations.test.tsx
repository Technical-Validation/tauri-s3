import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BatchOperations } from '../BatchOperations';
import { useConfig } from '../../../hooks/useConfig';

// Mock the useConfig hook
vi.mock('../../../hooks/useConfig');

const mockUseConfig = vi.mocked(useConfig);

describe('BatchOperations', () => {
    const mockDeleteConfigs = vi.fn();
    const mockExportConfigs = vi.fn();
    const mockTestAllConnections = vi.fn();
    const mockSelectAllConfigs = vi.fn();
    const mockClearSelection = vi.fn();

    const mockConfigs = [
        {
            id: '1',
            name: 'Config 1',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region: 'us-east-1',
            bucketName: 'bucket-1',
            connectionStatus: 'connected' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '2',
            name: 'Config 2',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region: 'us-west-2',
            bucketName: 'bucket-2',
            connectionStatus: 'error' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '3',
            name: 'Config 3',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region: 'eu-west-1',
            bucketName: 'bucket-3',
            connectionStatus: 'unknown' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseConfig.mockReturnValue({
            configs: mockConfigs,
            deleteConfigs: mockDeleteConfigs,
            exportConfigs: mockExportConfigs,
            testAllConnections: mockTestAllConnections,
            selectAllConfigs: mockSelectAllConfigs,
            clearSelection: mockClearSelection,
            loading: false,
            error: null,
            // Add other required properties with default values
            activeConfigId: null,
            selectedConfigs: [],
            searchQuery: '',
            sortBy: 'name',
            sortOrder: 'asc',
            addConfig: vi.fn(),
            updateConfig: vi.fn(),
            deleteConfig: vi.fn(),
            duplicateConfig: vi.fn(),
            getConfig: vi.fn(),
            setActiveConfig: vi.fn(),
            toggleConfigSelection: vi.fn(),
            setSearchQuery: vi.fn(),
            setSorting: vi.fn(),
            importConfigs: vi.fn(),
            testConnection: vi.fn(),
            getTemplates: vi.fn(),
            createFromTemplate: vi.fn(),
            setLoading: vi.fn(),
            setError: vi.fn(),
            clearError: vi.fn(),
            initializeFromBackend: vi.fn(),
            getActiveConfig: vi.fn(),
            validateConfig: vi.fn(),
        });
    });

    it('renders with no selection', () => {
        render(<BatchOperations selectedConfigs={[]} />);

        expect(screen.getByText('No configurations selected')).toBeInTheDocument();
        expect(screen.getByText('Select All')).toBeInTheDocument();
        expect(screen.getByText('Test All')).toBeInTheDocument();
    });

    it('renders with single selection', () => {
        render(<BatchOperations selectedConfigs={['1']} />);

        expect(screen.getByText('1 configuration selected')).toBeInTheDocument();
        expect(screen.getByText('Clear Selection')).toBeInTheDocument();
        expect(screen.getByText('Export (1)')).toBeInTheDocument();
        expect(screen.getByText('Delete (1)')).toBeInTheDocument();
    });

    it('renders with multiple selections', () => {
        render(<BatchOperations selectedConfigs={['1', '2']} />);

        expect(screen.getByText('2 configurations selected')).toBeInTheDocument();
        expect(screen.getByText('Export (2)')).toBeInTheDocument();
        expect(screen.getByText('Delete (2)')).toBeInTheDocument();
    });

    it('shows selected configurations preview for small selections', () => {
        render(<BatchOperations selectedConfigs={['1', '2']} />);

        expect(screen.getByText('Config 1')).toBeInTheDocument();
        expect(screen.getByText('Config 2')).toBeInTheDocument();
    });

    it('shows summary for large selections', () => {
        render(<BatchOperations selectedConfigs={['1', '2', '3']} />);

        // Should show first few configs and "and X more..."
        expect(screen.getByText(/Selected configurations:/)).toBeInTheDocument();
    });

    it('handles select all', () => {
        const mockOnSelectionChange = vi.fn();
        render(
            <BatchOperations
                selectedConfigs={[]}
                onSelectionChange={mockOnSelectionChange}
            />
        );

        const selectAllCheckbox = screen.getByRole('checkbox');
        fireEvent.click(selectAllCheckbox);

        expect(mockSelectAllConfigs).toHaveBeenCalled();
        expect(mockOnSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('handles clear selection', () => {
        const mockOnSelectionChange = vi.fn();
        render(
            <BatchOperations
                selectedConfigs={['1', '2']}
                onSelectionChange={mockOnSelectionChange}
            />
        );

        const clearButton = screen.getByText('Clear Selection');
        fireEvent.click(clearButton);

        expect(mockClearSelection).toHaveBeenCalled();
        expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });

    it('handles test all connections', async () => {
        const mockOnOperationComplete = vi.fn();
        render(
            <BatchOperations
                selectedConfigs={[]}
                onOperationComplete={mockOnOperationComplete}
            />
        );

        const testAllButton = screen.getByText('Test All');
        fireEvent.click(testAllButton);

        expect(mockTestAllConnections).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockOnOperationComplete).toHaveBeenCalledWith(
                'test',
                true,
                'Connection tests completed for all configurations'
            );
        });
    });

    it('shows export options dropdown', () => {
        render(<BatchOperations selectedConfigs={['1']} />);

        const exportButton = screen.getByText('Export (1)');
        fireEvent.click(exportButton);

        expect(screen.getByText('Export Options')).toBeInTheDocument();
        expect(screen.getByText('Include sensitive data')).toBeInTheDocument();
    });

    it('handles export with options', async () => {
        const mockOnOperationComplete = vi.fn();
        render(
            <BatchOperations
                selectedConfigs={['1', '2']}
                onOperationComplete={mockOnOperationComplete}
            />
        );

        // Open export options
        const exportButton = screen.getByText('Export (2)');
        fireEvent.click(exportButton);

        // Toggle include sensitive data
        const sensitiveCheckbox = screen.getByRole('checkbox', { name: /Include sensitive data/ });
        fireEvent.click(sensitiveCheckbox);

        // Click export in dropdown
        const exportInDropdown = screen.getAllByText('Export').find(el =>
            el.closest('.absolute') // Find the one in the dropdown
        );
        if (exportInDropdown) {
            fireEvent.click(exportInDropdown);
        }

        await waitFor(() => {
            expect(mockExportConfigs).toHaveBeenCalledWith(['1', '2'], true);
        });

        await waitFor(() => {
            expect(mockOnOperationComplete).toHaveBeenCalledWith(
                'export',
                true,
                'Successfully exported 2 configurations'
            );
        });
    });

    it('shows delete confirmation modal', () => {
        render(<BatchOperations selectedConfigs={['1', '2']} />);

        const deleteButton = screen.getByText('Delete (2)');
        fireEvent.click(deleteButton);

        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete 2 configurations?')).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('handles delete confirmation', async () => {
        const mockOnOperationComplete = vi.fn();
        render(
            <BatchOperations
                selectedConfigs={['1', '2']}
                onOperationComplete={mockOnOperationComplete}
            />
        );

        // Open delete confirmation
        const deleteButton = screen.getByText('Delete (2)');
        fireEvent.click(deleteButton);

        // Confirm deletion
        const confirmButton = screen.getAllByText('Delete').find(el =>
            el.closest('.fixed') // Find the one in the modal
        );
        if (confirmButton) {
            fireEvent.click(confirmButton);
        }

        await waitFor(() => {
            expect(mockDeleteConfigs).toHaveBeenCalledWith(['1', '2']);
        });

        await waitFor(() => {
            expect(mockOnOperationComplete).toHaveBeenCalledWith(
                'delete',
                true,
                'Successfully deleted 2 configurations'
            );
        });
    });

    it('handles delete cancellation', () => {
        render(<BatchOperations selectedConfigs={['1']} />);

        // Open delete confirmation
        const deleteButton = screen.getByText('Delete (1)');
        fireEvent.click(deleteButton);

        // Cancel deletion
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        // Modal should be closed
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
    });

    it('disables operations when loading', () => {
        mockUseConfig.mockReturnValue({
            ...mockUseConfig(),
            loading: true,
        });

        render(<BatchOperations selectedConfigs={['1']} />);

        expect(screen.getByText('Test All')).toBeDisabled();
        expect(screen.getByText('Export (1)')).toBeDisabled();
        expect(screen.getByText('Delete (1)')).toBeDisabled();
    });

    it('disables operations when no configs available', () => {
        mockUseConfig.mockReturnValue({
            ...mockUseConfig(),
            configs: [],
        });

        render(<BatchOperations selectedConfigs={[]} />);

        expect(screen.getByText('Test All')).toBeDisabled();
    });

    it('shows connection status indicators in preview', () => {
        render(<BatchOperations selectedConfigs={['1', '2', '3']} />);

        // Should show status indicators for each config
        const statusIndicators = screen.getAllByRole('generic').filter(el =>
            el.className.includes('w-2 h-2 rounded-full')
        );

        expect(statusIndicators.length).toBeGreaterThan(0);
    });

    it('handles operation errors', async () => {
        const mockOnOperationComplete = vi.fn();
        const error = new Error('Export failed');
        mockExportConfigs.mockRejectedValue(error);

        render(
            <BatchOperations
                selectedConfigs={['1']}
                onOperationComplete={mockOnOperationComplete}
            />
        );

        // Open export options and export
        const exportButton = screen.getByText('Export (1)');
        fireEvent.click(exportButton);

        const exportInDropdown = screen.getAllByText('Export').find(el =>
            el.closest('.absolute')
        );
        if (exportInDropdown) {
            fireEvent.click(exportInDropdown);
        }

        await waitFor(() => {
            expect(mockOnOperationComplete).toHaveBeenCalledWith(
                'export',
                false,
                'Export failed'
            );
        });
    });
});