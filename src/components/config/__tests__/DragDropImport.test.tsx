import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DragDropImport } from '../DragDropImport';
import { useConfig } from '../../../hooks/useConfig';
import { ImportResult } from '../../../types/config';

// Mock the useConfig hook
vi.mock('../../../hooks/useConfig');

// Helper to create a mock file with text content
const createMockFile = (content: string, name: string, type: string) => {
    const file = new File([content], name, { type });
    // Mock the text() method
    file.text = vi.fn().mockResolvedValue(content);
    return file;
};

const mockUseConfig = vi.mocked(useConfig);

describe('DragDropImport', () => {
    const mockImportConfigs = vi.fn();
    const mockConfigs = [
        {
            id: '1',
            name: 'Existing Config',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region: 'us-east-1',
            bucketName: 'test-bucket',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseConfig.mockReturnValue({
            configs: mockConfigs,
            importConfigs: mockImportConfigs,
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
            deleteConfigs: vi.fn(),
            duplicateConfig: vi.fn(),
            getConfig: vi.fn(),
            setActiveConfig: vi.fn(),
            toggleConfigSelection: vi.fn(),
            selectAllConfigs: vi.fn(),
            clearSelection: vi.fn(),
            setSearchQuery: vi.fn(),
            setSorting: vi.fn(),
            exportConfigs: vi.fn(),
            testConnection: vi.fn(),
            testAllConnections: vi.fn(),
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

    it('renders drag and drop zone', () => {
        render(<DragDropImport />);

        expect(screen.getByText('Drop configuration file here')).toBeInTheDocument();
        expect(screen.getByText('click to browse')).toBeInTheDocument();
        expect(screen.getByText('Supported formats: JSON, YAML')).toBeInTheDocument();
        expect(screen.getByText('Maximum file size: 10MB')).toBeInTheDocument();
    });

    it('handles file selection via input', async () => {
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'Test Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-west-2',
                    bucketName: 'test-bucket-2',
                }]
            }),
            'config.json',
            'application/json'
        );

        render(<DragDropImport />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();

        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Preview')).toBeInTheDocument();
        });

        expect(screen.getByText('Test Config')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('handles drag and drop', async () => {
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'Dropped Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'eu-west-1',
                    bucketName: 'dropped-bucket',
                }]
            }),
            'dropped-config.json',
            'application/json'
        );

        render(<DragDropImport />);

        const dropZone = screen.getByText('Drop configuration file here').closest('div');
        expect(dropZone).toBeInTheDocument();

        if (dropZone) {
            // Simulate drag over
            fireEvent.dragOver(dropZone, {
                dataTransfer: {
                    files: [mockFile],
                },
            });

            // Simulate drop
            fireEvent.drop(dropZone, {
                dataTransfer: {
                    files: [mockFile],
                },
            });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Preview')).toBeInTheDocument();
        });

        expect(screen.getByText('Dropped Config')).toBeInTheDocument();
    });

    it('detects conflicts with existing configurations', async () => {
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'Existing Config', // Same name as existing config
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-west-2',
                    bucketName: 'test-bucket-2',
                }]
            }),
            'config.json',
            'application/json'
        );

        render(<DragDropImport />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Preview')).toBeInTheDocument();
        });

        expect(screen.getByText('Existing Config')).toBeInTheDocument();
        expect(screen.getByText('Conflict')).toBeInTheDocument();
        expect(screen.getByText('Conflicts with existing configuration "Existing Config"')).toBeInTheDocument();
    });

    it('shows conflict resolution options', async () => {
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'Existing Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-west-2',
                    bucketName: 'test-bucket-2',
                }]
            }),
            'config.json',
            'application/json'
        );

        render(<DragDropImport />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Conflict Resolution:')).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Rename conflicting configurations/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Overwrite existing configurations/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Skip conflicting configurations/)).toBeInTheDocument();
    });

    it('performs import with selected options', async () => {
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'New Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-west-2',
                    bucketName: 'new-bucket',
                }]
            }),
            'config.json',
            'application/json'
        );

        const mockImportResult: ImportResult = {
            success: true,
            imported: 1,
            skipped: 0,
            errors: [],
            conflicts: [],
        };

        mockImportConfigs.mockResolvedValue(mockImportResult);

        render(<DragDropImport />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Preview')).toBeInTheDocument();
        });

        const importButton = screen.getByRole('button', { name: /Import Configurations/i });
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(mockImportConfigs).toHaveBeenCalledWith(mockFile, {
                overwriteExisting: false,
                validateBeforeImport: true,
                skipInvalid: true,
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Import Successful')).toBeInTheDocument();
            expect(screen.getByText('Imported: 1 configurations')).toBeInTheDocument();
        });
    });

    it('handles import errors', async () => {
        const mockFile = createMockFile(
            'invalid json',
            'invalid.json',
            'application/json'
        );

        render(<DragDropImport />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Failed')).toBeInTheDocument();
        });

        expect(screen.getByText(/Failed to parse configuration file/)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'Invalid Config',
                    // Missing required fields
                }]
            }),
            'config.json',
            'application/json'
        );

        render(<DragDropImport />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Preview')).toBeInTheDocument();
        });

        expect(screen.getByText('Invalid Config')).toBeInTheDocument();
        expect(screen.getByText('Invalid')).toBeInTheDocument();
        expect(screen.getByText('Missing required fields')).toBeInTheDocument();
    });

    it('calls onImportComplete callback', async () => {
        const mockOnImportComplete = vi.fn();
        const mockFile = createMockFile(
            JSON.stringify({
                configs: [{
                    name: 'Test Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-west-2',
                    bucketName: 'test-bucket',
                }]
            }),
            'config.json',
            'application/json'
        );

        const mockImportResult: ImportResult = {
            success: true,
            imported: 1,
            skipped: 0,
            errors: [],
            conflicts: [],
        };

        mockImportConfigs.mockResolvedValue(mockImportResult);

        render(<DragDropImport onImportComplete={mockOnImportComplete} />);

        const fileInput = screen.getByRole('button', { name: /click to browse/i }).closest('div')?.querySelector('input[type="file"]');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Preview')).toBeInTheDocument();
        });

        const importButton = screen.getByRole('button', { name: /Import Configurations/i });
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(mockOnImportComplete).toHaveBeenCalledWith(mockImportResult);
        });
    });

    it('rejects non-configuration files', async () => {
        const mockFile = createMockFile('some text', 'document.txt', 'text/plain');

        render(<DragDropImport />);

        const dropZone = screen.getByText('Drop configuration file here').closest('div');
        if (dropZone) {
            fireEvent.drop(dropZone, {
                dataTransfer: {
                    files: [mockFile],
                },
            });
        }

        await waitFor(() => {
            expect(screen.getByText('Import Failed')).toBeInTheDocument();
        });

        expect(screen.getByText('Please drop a valid configuration file (.json, .yaml, .yml)')).toBeInTheDocument();
    });
});