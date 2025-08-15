import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { App } from '../../App'
import { mockTauriApi } from './setup'

// Mock all the stores
vi.mock('../../stores/configStore', () => ({
    useConfigStore: () => ({
        configs: [],
        activeConfigId: null,
        addConfig: vi.fn(),
        updateConfig: vi.fn(),
        deleteConfig: vi.fn(),
        setActiveConfig: vi.fn(),
        exportConfigs: vi.fn(),
        importConfigs: vi.fn(),
        testConnection: vi.fn(),
        loadConfigs: vi.fn(),
        saveConfigs: vi.fn(),
        getActiveConfig: () => null,
    })
}))

vi.mock('../../stores/fileStore', () => ({
    useFileStore: () => ({
        files: [],
        currentPath: '',
        loading: false,
        error: null,
        selectedFiles: [],
        loadFiles: vi.fn(),
        navigateToPath: vi.fn(),
        deleteFile: vi.fn(),
        downloadFile: vi.fn(),
        toggleSelection: vi.fn(),
        clearSelection: vi.fn(),
        selectAll: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        filteredFiles: [],
    })
}))

vi.mock('../../stores/uploadStore', () => ({
    useUploadStore: () => ({
        tasks: [],
        addTask: vi.fn(),
        removeTask: vi.fn(),
        clearCompleted: vi.fn(),
        pauseTask: vi.fn(),
        resumeTask: vi.fn(),
        retryTask: vi.fn(),
    })
}))

vi.mock('../../stores/downloadStore', () => ({
    useDownloadStore: () => ({
        tasks: [],
        addTask: vi.fn(),
        removeTask: vi.fn(),
        clearCompleted: vi.fn(),
        pauseTask: vi.fn(),
        resumeTask: vi.fn(),
        retryTask: vi.fn(),
    })
}))

const renderApp = () => {
    return render(
        <BrowserRouter>
            <App />
        </BrowserRouter>
    )
}

describe('Configuration Workflow E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should complete full configuration setup workflow', async () => {
        // Mock successful config operations
        mockTauriApi.invoke
            .mockResolvedValueOnce(false) // config_exists
            .mockResolvedValueOnce(undefined) // save_config
            .mockResolvedValueOnce('{"configs":[{"id":"1","name":"Test Config"}]}') // load_config

        renderApp()

        // Should start on config page since no config exists
        expect(screen.getByText('配置管理')).toBeInTheDocument()

        // Fill in configuration form
        const nameInput = screen.getByLabelText(/配置名称/i)
        const accessKeyInput = screen.getByLabelText(/Access Key ID/i)
        const secretKeyInput = screen.getByLabelText(/Secret Access Key/i)
        const regionInput = screen.getByLabelText(/区域/i)
        const bucketInput = screen.getByLabelText(/存储桶名称/i)

        fireEvent.change(nameInput, { target: { value: 'Test S3 Config' } })
        fireEvent.change(accessKeyInput, { target: { value: 'AKIAIOSFODNN7EXAMPLE' } })
        fireEvent.change(secretKeyInput, { target: { value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' } })
        fireEvent.change(regionInput, { target: { value: 'us-east-1' } })
        fireEvent.change(bucketInput, { target: { value: 'test-bucket' } })

        // Test connection
        const testButton = screen.getByText(/测试连接/i)
        fireEvent.click(testButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('test_connection', expect.any(Object))
        })

        // Save configuration
        const saveButton = screen.getByText(/保存配置/i)
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('save_config', expect.any(Object))
        })

        // Should show success message
        expect(screen.getByText(/配置保存成功/i)).toBeInTheDocument()
    })

    it('should handle configuration import/export workflow', async () => {
        // Mock file dialog and config operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('/path/to/export.json') // select_export_path
            .mockResolvedValueOnce(undefined) // export_config
            .mockResolvedValueOnce('/path/to/import.json') // select_import_path
            .mockResolvedValueOnce('{"configs":[{"id":"1","name":"Imported Config"}]}') // import_config

        renderApp()

        // Navigate to import/export section
        const importExportButton = screen.getByText(/导入导出/i)
        fireEvent.click(importExportButton)

        // Test export
        const exportButton = screen.getByText(/导出配置/i)
        fireEvent.click(exportButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('select_export_path')
        })

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('export_config', expect.any(Object))
        })

        // Test import
        const importButton = screen.getByText(/导入配置/i)
        fireEvent.click(importButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('select_import_path')
        })

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('import_config', expect.any(Object))
        })

        // Should show success message
        expect(screen.getByText(/导入成功/i)).toBeInTheDocument()
    })

    it('should handle configuration validation errors', async () => {
        // Mock validation failure
        mockTauriApi.invoke.mockRejectedValueOnce(new Error('Invalid credentials'))

        renderApp()

        // Fill in invalid configuration
        const nameInput = screen.getByLabelText(/配置名称/i)
        const accessKeyInput = screen.getByLabelText(/Access Key ID/i)
        const secretKeyInput = screen.getByLabelText(/Secret Access Key/i)

        fireEvent.change(nameInput, { target: { value: 'Invalid Config' } })
        fireEvent.change(accessKeyInput, { target: { value: 'invalid-key' } })
        fireEvent.change(secretKeyInput, { target: { value: 'invalid-secret' } })

        // Test connection with invalid credentials
        const testButton = screen.getByText(/测试连接/i)
        fireEvent.click(testButton)

        await waitFor(() => {
            expect(screen.getByText(/连接失败/i)).toBeInTheDocument()
        })

        // Should show error message
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
    })

    it('should handle multiple configurations workflow', async () => {
        const mockConfigs = [
            { id: '1', name: 'Config 1', region: 'us-east-1', bucketName: 'bucket1' },
            { id: '2', name: 'Config 2', region: 'us-west-2', bucketName: 'bucket2' }
        ]

        // Mock multiple configs
        mockTauriApi.invoke
            .mockResolvedValueOnce(JSON.stringify({ configs: mockConfigs, activeConfigId: '1' }))

        renderApp()

        await waitFor(() => {
            expect(screen.getByText('Config 1')).toBeInTheDocument()
            expect(screen.getByText('Config 2')).toBeInTheDocument()
        })

        // Switch active configuration
        const config2Button = screen.getByText('Config 2')
        fireEvent.click(config2Button)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('set_active_config', { configId: '2' })
        })

        // Delete a configuration
        const deleteButton = screen.getAllByText(/删除/i)[0]
        fireEvent.click(deleteButton)

        // Confirm deletion
        const confirmButton = screen.getByText(/确认删除/i)
        fireEvent.click(confirmButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('delete_config', { configId: '1' })
        })
    })

    it('should handle configuration encryption workflow', async () => {
        // Mock encrypted config operations
        mockTauriApi.invoke
            .mockResolvedValueOnce(undefined) // save_config with encryption
            .mockResolvedValueOnce('encrypted_config_data') // load_config with decryption

        renderApp()

        // Enable encryption
        const encryptionCheckbox = screen.getByLabelText(/启用加密/i)
        fireEvent.click(encryptionCheckbox)

        // Enter encryption password
        const passwordInput = screen.getByLabelText(/加密密码/i)
        fireEvent.change(passwordInput, { target: { value: 'secure-password-123' } })

        // Fill in configuration
        const nameInput = screen.getByLabelText(/配置名称/i)
        fireEvent.change(nameInput, { target: { value: 'Encrypted Config' } })

        // Save encrypted configuration
        const saveButton = screen.getByText(/保存配置/i)
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('save_config',
                expect.objectContaining({
                    password: 'secure-password-123',
                    encrypted: true
                })
            )
        })

        // Should show encryption success message
        expect(screen.getByText(/配置已加密保存/i)).toBeInTheDocument()
    })

    it('should handle configuration backup and restore workflow', async () => {
        // Mock backup operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('/path/to/backup.json') // create_backup
            .mockResolvedValueOnce(undefined) // save_backup
            .mockResolvedValueOnce('/path/to/restore.json') // select_restore_file
            .mockResolvedValueOnce('{"configs":[{"id":"1","name":"Restored Config"}]}') // restore_backup

        renderApp()

        // Navigate to backup section
        const backupButton = screen.getByText(/备份恢复/i)
        fireEvent.click(backupButton)

        // Create backup
        const createBackupButton = screen.getByText(/创建备份/i)
        fireEvent.click(createBackupButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('create_backup')
        })

        // Should show backup success
        expect(screen.getByText(/备份创建成功/i)).toBeInTheDocument()

        // Restore from backup
        const restoreButton = screen.getByText(/恢复备份/i)
        fireEvent.click(restoreButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('select_restore_file')
        })

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('restore_backup', expect.any(Object))
        })

        // Should show restore success
        expect(screen.getByText(/恢复成功/i)).toBeInTheDocument()
    })
})