import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigImportExport } from '../ConfigImportExport';
import { ConfigService } from '../../../services/configService';

// Mock the useConfig hook
const mockUseConfig = {
    configs: [
        {
            id: 'config-1',
            name: 'Test Config 1',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region: 'us-east-1',
            bucketName: 'test-bucket-1',
        },
        {
            id: 'config-2',
            name: 'Test Config 2',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE2',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2',
            region: 'us-west-2',
            bucketName: 'test-bucket-2',
        },
    ],
    exportConfigs: vi.fn(),
    importConfigs: vi.fn(),
    loading: false,
    error: null,
    clearError: vi.fn(),
};

vi.mock('../../../hooks/useConfig', () => ({
    useConfig: () => mockUseConfig,
}));

// Mock ConfigService
vi.mock('../../../services/configService', () => ({
    ConfigService: {
        selectImportPath: vi.fn(),
        selectExportPath: vi.fn(),
    },
}));

describe('ConfigImportExport', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseConfig.loading = false;
        mockUseConfig.error = null;
        mockUseConfig.exportConfigs.mockResolvedValue(undefined);
        mockUseConfig.importConfigs.mockResolvedValue(undefined);
        vi.mocked(ConfigService.selectImportPath).mockResolvedValue('/path/to/config.json');
    });

    describe('Rendering', () => {
        it('should render import and export sections', () => {
            render(<ConfigImportExport />);

            expect(screen.getByText('配置导入导出')).toBeInTheDocument();
            expect(screen.getByText('导出配置')).toBeInTheDocument();
            expect(screen.getByText('导入配置')).toBeInTheDocument();
        });

        it('should render export options', () => {
            render(<ConfigImportExport />);

            expect(screen.getByLabelText(/包含敏感数据/)).toBeInTheDocument();
            expect(screen.getByText('导出配置')).toBeInTheDocument();
        });

        it('should render import options', () => {
            render(<ConfigImportExport />);

            expect(screen.getByLabelText(/覆盖同名配置/)).toBeInTheDocument();
            expect(screen.getByText('选择文件导入')).toBeInTheDocument();
            expect(screen.getByText('浏览文件导入')).toBeInTheDocument();
        });

        it('should disable export button when no configs exist', () => {
            mockUseConfig.configs = [];
            render(<ConfigImportExport />);

            const exportButton = screen.getByText('导出配置');
            expect(exportButton).toBeDisabled();
            expect(screen.getByText('没有可导出的配置')).toBeInTheDocument();
        });

        it('should render usage instructions', () => {
            render(<ConfigImportExport />);

            expect(screen.getByText('使用说明')).toBeInTheDocument();
            expect(screen.getByText(/导出的配置文件为JSON格式/)).toBeInTheDocument();
        });
    });

    describe('Export Functionality', () => {
        it('should handle export with default options', async () => {
            render(<ConfigImportExport />);

            const exportButton = screen.getByText('导出配置');
            await user.click(exportButton);

            await waitFor(() => {
                expect(mockUseConfig.exportConfigs).toHaveBeenCalledWith({
                    includeSensitiveData: false,
                });
            });

            await waitFor(() => {
                expect(screen.getByText('配置导出成功')).toBeInTheDocument();
            });
        });

        it('should handle export with sensitive data included', async () => {
            render(<ConfigImportExport />);

            const sensitiveDataCheckbox = screen.getByLabelText(/包含敏感数据/);
            await user.click(sensitiveDataCheckbox);

            const exportButton = screen.getByText('导出配置');
            await user.click(exportButton);

            await waitFor(() => {
                expect(mockUseConfig.exportConfigs).toHaveBeenCalledWith({
                    includeSensitiveData: true,
                });
            });
        });

        it('should show loading state during export', async () => {
            let resolveExport: () => void;
            const exportPromise = new Promise<void>((resolve) => {
                resolveExport = resolve;
            });
            mockUseConfig.exportConfigs.mockReturnValue(exportPromise);

            render(<ConfigImportExport />);

            const exportButton = screen.getByText('导出配置');
            await user.click(exportButton);

            expect(screen.getByText('导出中...')).toBeInTheDocument();
            expect(exportButton).toBeDisabled();

            resolveExport!();
            await waitFor(() => {
                expect(screen.getByText('配置导出成功')).toBeInTheDocument();
            });
        });

        it('should handle export failure', async () => {
            mockUseConfig.exportConfigs.mockRejectedValue(new Error('Export failed'));

            render(<ConfigImportExport />);

            const exportButton = screen.getByText('导出配置');
            await user.click(exportButton);

            await waitFor(() => {
                expect(screen.getByText('配置导出失败')).toBeInTheDocument();
            });
        });

        it('should call onExportComplete callback', async () => {
            const onExportComplete = vi.fn();
            render(<ConfigImportExport onExportComplete={onExportComplete} />);

            const exportButton = screen.getByText('导出配置');
            await user.click(exportButton);

            await waitFor(() => {
                expect(onExportComplete).toHaveBeenCalled();
            });
        });

        it('should update sensitive data warning text', async () => {
            render(<ConfigImportExport />);

            expect(screen.getByText(/导出的文件不包含敏感信息/)).toBeInTheDocument();

            const sensitiveDataCheckbox = screen.getByLabelText(/包含敏感数据/);
            await user.click(sensitiveDataCheckbox);

            expect(screen.getByText(/导出的文件将包含敏感信息/)).toBeInTheDocument();
        });
    });

    describe('Import Functionality', () => {
        it('should handle file import with default options', async () => {
            render(<ConfigImportExport />);

            const file = new File(['{"configs": []}'], 'config.json', { type: 'application/json' });
            const fileInput = screen.getByRole('button', { name: /选择文件导入/ }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

            if (fileInput) {
                await user.upload(fileInput, file);
            }

            await waitFor(() => {
                expect(mockUseConfig.importConfigs).toHaveBeenCalledWith(file, {
                    overwriteExisting: false,
                    validateBeforeImport: true,
                });
            });

            await waitFor(() => {
                expect(screen.getByText('配置导入成功')).toBeInTheDocument();
            });
        });

        it('should handle file import with overwrite option', async () => {
            render(<ConfigImportExport />);

            const overwriteCheckbox = screen.getByLabelText(/覆盖同名配置/);
            await user.click(overwriteCheckbox);

            const file = new File(['{"configs": []}'], 'config.json', { type: 'application/json' });
            const fileInput = screen.getByRole('button', { name: /选择文件导入/ }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

            if (fileInput) {
                await user.upload(fileInput, file);
            }

            await waitFor(() => {
                expect(mockUseConfig.importConfigs).toHaveBeenCalledWith(file, {
                    overwriteExisting: true,
                    validateBeforeImport: true,
                });
            });
        });

        it('should handle Tauri file dialog import', async () => {
            render(<ConfigImportExport />);

            const browseButton = screen.getByText('浏览文件导入');
            await user.click(browseButton);

            await waitFor(() => {
                expect(ConfigService.selectImportPath).toHaveBeenCalled();
                expect(mockUseConfig.importConfigs).toHaveBeenCalledWith('/path/to/config.json', {
                    overwriteExisting: false,
                    validateBeforeImport: true,
                });
            });

            await waitFor(() => {
                expect(screen.getByText('配置导入成功')).toBeInTheDocument();
            });
        });

        it('should handle Tauri import cancellation', async () => {
            vi.mocked(ConfigService.selectImportPath).mockResolvedValue(null);

            render(<ConfigImportExport />);

            const browseButton = screen.getByText('浏览文件导入');
            await user.click(browseButton);

            await waitFor(() => {
                expect(ConfigService.selectImportPath).toHaveBeenCalled();
                expect(mockUseConfig.importConfigs).not.toHaveBeenCalled();
            });
        });

        it('should show loading state during import', async () => {
            let resolveImport: () => void;
            const importPromise = new Promise<void>((resolve) => {
                resolveImport = resolve;
            });
            mockUseConfig.importConfigs.mockReturnValue(importPromise);

            render(<ConfigImportExport />);

            const browseButton = screen.getByText('浏览文件导入');
            await user.click(browseButton);

            expect(screen.getAllByText('导入中...')[0]).toBeInTheDocument();
            expect(browseButton).toBeDisabled();

            resolveImport!();
            await waitFor(() => {
                expect(screen.getByText('配置导入成功')).toBeInTheDocument();
            });
        });

        it('should handle import failure', async () => {
            mockUseConfig.importConfigs.mockRejectedValue(new Error('Import failed'));

            render(<ConfigImportExport />);

            const browseButton = screen.getByText('浏览文件导入');
            await user.click(browseButton);

            await waitFor(() => {
                expect(screen.getByText('配置导入失败')).toBeInTheDocument();
            });
        });

        it('should call onImportComplete callback', async () => {
            const onImportComplete = vi.fn();
            render(<ConfigImportExport onImportComplete={onImportComplete} />);

            const browseButton = screen.getByText('浏览文件导入');
            await user.click(browseButton);

            await waitFor(() => {
                expect(onImportComplete).toHaveBeenCalled();
            });
        });

        it('should update overwrite warning text', async () => {
            render(<ConfigImportExport />);

            expect(screen.getByText(/如果存在同名配置，将跳过导入/)).toBeInTheDocument();

            const overwriteCheckbox = screen.getByLabelText(/覆盖同名配置/);
            await user.click(overwriteCheckbox);

            expect(screen.getByText(/如果存在同名配置，将会被覆盖/)).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should display general error message', () => {
            mockUseConfig.error = '操作失败';

            render(<ConfigImportExport />);

            expect(screen.getAllByText('操作失败')).toHaveLength(2); // Title and message
        });

        it('should clear status and errors', async () => {
            render(<ConfigImportExport />);

            // First trigger an export to show status
            const exportButton = screen.getByRole('button', { name: '导出配置' });
            await user.click(exportButton);

            await waitFor(() => {
                expect(screen.getByText('配置导出成功')).toBeInTheDocument();
            });

            // Then clear status
            const clearButton = screen.getByText('清除状态');
            await user.click(clearButton);

            expect(screen.queryByText('配置导出成功')).not.toBeInTheDocument();
            expect(mockUseConfig.clearError).toHaveBeenCalled();
        });
    });

    describe('UI State Management', () => {
        it('should disable buttons during loading', () => {
            mockUseConfig.loading = true;

            render(<ConfigImportExport />);

            expect(screen.getByRole('button', { name: '导出配置' })).toBeDisabled();
            expect(screen.getByRole('button', { name: '选择文件导入' })).toBeDisabled();
            expect(screen.getByRole('button', { name: '浏览文件导入' })).toBeDisabled();
        });

        it('should show clear status button when there are status messages', async () => {
            render(<ConfigImportExport />);

            // Initially no clear button
            expect(screen.queryByText('清除状态')).not.toBeInTheDocument();

            // After export, clear button should appear
            const exportButton = screen.getByRole('button', { name: '导出配置' });
            await user.click(exportButton);

            await waitFor(() => {
                expect(screen.getByText('清除状态')).toBeInTheDocument();
            });
        });
    });
});