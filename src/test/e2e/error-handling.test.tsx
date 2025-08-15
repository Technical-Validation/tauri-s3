import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { App } from '../../App'
import { mockTauriApi } from './setup'

// Mock stores with error states
vi.mock('../../stores/configStore', () => ({
    useConfigStore: () => ({
        configs: [],
        activeConfigId: null,
        getActiveConfig: () => null,
        addConfig: vi.fn(),
        updateConfig: vi.fn(),
        deleteConfig: vi.fn(),
        setActiveConfig: vi.fn(),
        exportConfigs: vi.fn(),
        importConfigs: vi.fn(),
        testConnection: vi.fn(),
        loadConfigs: vi.fn(),
        saveConfigs: vi.fn(),
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

const renderApp = () => {
    return render(
        <BrowserRouter>
            <App />
        </BrowserRouter>
    )
}

describe('Error Handling E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should handle network connectivity errors', async () => {
        // Mock network error
        mockTauriApi.invoke.mockRejectedValue(new Error('Network unreachable'))

        renderApp()

        // Try to test connection
        const testConnectionButton = screen.getByText(/测试连接/i)
        fireEvent.click(testConnectionButton)

        await waitFor(() => {
            expect(screen.getByText(/网络连接失败/i)).toBeInTheDocument()
        })

        // Should show network error details
        expect(screen.getByText(/Network unreachable/i)).toBeInTheDocument()

        // Should show retry option
        expect(screen.getByText(/重试/i)).toBeInTheDocument()

        // Should show offline indicator
        expect(screen.getByText(/离线模式/i)).toBeInTheDocument()
    })

    it('should handle authentication errors', async () => {
        // Mock authentication error
        mockTauriApi.invoke.mockRejectedValue(new Error('Invalid credentials'))

        renderApp()

        // Fill in configuration with invalid credentials
        const accessKeyInput = screen.getByLabelText(/Access Key ID/i)
        const secretKeyInput = screen.getByLabelText(/Secret Access Key/i)

        fireEvent.change(accessKeyInput, { target: { value: 'invalid-key' } })
        fireEvent.change(secretKeyInput, { target: { value: 'invalid-secret' } })

        // Test connection
        const testConnectionButton = screen.getByText(/测试连接/i)
        fireEvent.click(testConnectionButton)

        await waitFor(() => {
            expect(screen.getByText(/认证失败/i)).toBeInTheDocument()
        })

        // Should show authentication error details
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()

        // Should suggest checking credentials
        expect(screen.getByText(/请检查您的访问密钥/i)).toBeInTheDocument()

        // Should highlight the problematic fields
        expect(accessKeyInput).toHaveClass('border-red-500')
        expect(secretKeyInput).toHaveClass('border-red-500')
    })

    it('should handle permission errors', async () => {
        // Mock permission error
        mockTauriApi.invoke.mockRejectedValue(new Error('Access denied'))

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        // Try to load files
        await waitFor(() => {
            expect(screen.getByText(/权限不足/i)).toBeInTheDocument()
        })

        // Should show permission error details
        expect(screen.getByText(/Access denied/i)).toBeInTheDocument()

        // Should suggest checking IAM permissions
        expect(screen.getByText(/请检查IAM权限设置/i)).toBeInTheDocument()

        // Should show help link
        expect(screen.getByText(/权限配置帮助/i)).toBeInTheDocument()
    })

    it('should handle file system errors', async () => {
        // Mock file system error
        mockTauriApi.invoke.mockRejectedValue(new Error('Disk full'))

        renderApp()

        // Try to save configuration
        const saveButton = screen.getByText(/保存配置/i)
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(screen.getByText(/文件系统错误/i)).toBeInTheDocument()
        })

        // Should show disk space error
        expect(screen.getByText(/Disk full/i)).toBeInTheDocument()

        // Should suggest freeing up space
        expect(screen.getByText(/请释放磁盘空间/i)).toBeInTheDocument()

        // Should show disk usage info
        expect(screen.getByText(/磁盘使用情况/i)).toBeInTheDocument()
    })

    it('should handle configuration corruption errors', async () => {
        // Mock configuration corruption
        mockTauriApi.invoke.mockRejectedValue(new Error('Configuration file corrupted'))

        renderApp()

        await waitFor(() => {
            expect(screen.getByText(/配置文件损坏/i)).toBeInTheDocument()
        })

        // Should show corruption error details
        expect(screen.getByText(/Configuration file corrupted/i)).toBeInTheDocument()

        // Should offer recovery options
        expect(screen.getByText(/恢复默认配置/i)).toBeInTheDocument()
        expect(screen.getByText(/从备份恢复/i)).toBeInTheDocument()

        // Test recovery option
        const resetButton = screen.getByText(/恢复默认配置/i)
        fireEvent.click(resetButton)

        // Should show confirmation dialog
        await waitFor(() => {
            expect(screen.getByText(/确认重置配置/i)).toBeInTheDocument()
        })

        const confirmButton = screen.getByText(/确认重置/i)
        fireEvent.click(confirmButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('reset_config')
        })
    })

    it('should handle upload errors with detailed feedback', async () => {
        // Mock various upload errors
        const uploadErrors = [
            { error: 'File too large', code: 'FILE_TOO_LARGE' },
            { error: 'Insufficient storage', code: 'INSUFFICIENT_STORAGE' },
            { error: 'Invalid file type', code: 'INVALID_FILE_TYPE' },
            { error: 'Upload timeout', code: 'TIMEOUT' }
        ]

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        for (const { error, code } of uploadErrors) {
            // Mock specific error
            mockTauriApi.invoke.mockRejectedValueOnce(new Error(error))

            // Simulate file upload
            const dropZone = screen.getByTestId('upload-zone')
            const file = new File(['test'], 'test.txt', { type: 'text/plain' })
            const dropEvent = new Event('drop', { bubbles: true })
            Object.defineProperty(dropEvent, 'dataTransfer', {
                value: { files: [file], types: ['Files'] }
            })

            fireEvent(dropZone, dropEvent)

            const uploadButton = screen.getByText(/开始上传/i)
            fireEvent.click(uploadButton)

            await waitFor(() => {
                expect(screen.getByText(/上传失败/i)).toBeInTheDocument()
            })

            // Should show specific error message
            expect(screen.getByText(error)).toBeInTheDocument()

            // Should show appropriate action based on error type
            switch (code) {
                case 'FILE_TOO_LARGE':
                    expect(screen.getByText(/文件大小超出限制/i)).toBeInTheDocument()
                    expect(screen.getByText(/压缩文件/i)).toBeInTheDocument()
                    break
                case 'INSUFFICIENT_STORAGE':
                    expect(screen.getByText(/存储空间不足/i)).toBeInTheDocument()
                    expect(screen.getByText(/清理空间/i)).toBeInTheDocument()
                    break
                case 'INVALID_FILE_TYPE':
                    expect(screen.getByText(/不支持的文件类型/i)).toBeInTheDocument()
                    expect(screen.getByText(/查看支持格式/i)).toBeInTheDocument()
                    break
                case 'TIMEOUT':
                    expect(screen.getByText(/上传超时/i)).toBeInTheDocument()
                    expect(screen.getByText(/重试上传/i)).toBeInTheDocument()
                    break
            }

            // Clear error for next test
            const clearButton = screen.getByText(/清除/i)
            fireEvent.click(clearButton)
        }
    })

    it('should handle download errors with recovery options', async () => {
        // Mock download errors
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads') // select_download_directory
            .mockRejectedValueOnce(new Error('Connection lost')) // start_download fails

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        // Mock file list
        const mockFiles = [
            { key: 'test.pdf', name: 'test.pdf', size: 1024, isDirectory: false }
        ]

        // Simulate file list loaded
        window.dispatchEvent(new CustomEvent('files-loaded', { detail: mockFiles }))

        await waitFor(() => {
            expect(screen.getByText('test.pdf')).toBeInTheDocument()
        })

        // Try to download file
        const fileItem = screen.getByText('test.pdf')
        fireEvent.contextMenu(fileItem)

        const downloadButton = screen.getByText(/下载/i)
        fireEvent.click(downloadButton)

        await waitFor(() => {
            expect(screen.getByText(/下载失败/i)).toBeInTheDocument()
        })

        // Should show connection error
        expect(screen.getByText(/Connection lost/i)).toBeInTheDocument()

        // Should offer recovery options
        expect(screen.getByText(/重试下载/i)).toBeInTheDocument()
        expect(screen.getByText(/稍后重试/i)).toBeInTheDocument()
        expect(screen.getByText(/检查网络/i)).toBeInTheDocument()

        // Test retry functionality
        mockTauriApi.invoke.mockResolvedValueOnce('download-task-1') // retry succeeds

        const retryButton = screen.getByText(/重试下载/i)
        fireEvent.click(retryButton)

        await waitFor(() => {
            expect(screen.getByText(/下载中/i)).toBeInTheDocument()
        })
    })

    it('should handle application crash recovery', async () => {
        // Mock application crash scenario
        mockTauriApi.invoke.mockRejectedValue(new Error('Application crashed'))

        renderApp()

        // Simulate crash during operation
        const saveButton = screen.getByText(/保存配置/i)
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(screen.getByText(/应用程序遇到错误/i)).toBeInTheDocument()
        })

        // Should show crash recovery options
        expect(screen.getByText(/重启应用/i)).toBeInTheDocument()
        expect(screen.getByText(/发送错误报告/i)).toBeInTheDocument()
        expect(screen.getByText(/安全模式/i)).toBeInTheDocument()

        // Test error reporting
        const reportButton = screen.getByText(/发送错误报告/i)
        fireEvent.click(reportButton)

        await waitFor(() => {
            expect(screen.getByText(/错误报告已发送/i)).toBeInTheDocument()
        })

        // Test safe mode
        const safeModeButton = screen.getByText(/安全模式/i)
        fireEvent.click(safeModeButton)

        await waitFor(() => {
            expect(screen.getByText(/安全模式已启用/i)).toBeInTheDocument()
        })

        // Should disable advanced features in safe mode
        expect(screen.queryByText(/高级设置/i)).not.toBeInTheDocument()
    })

    it('should handle validation errors with field-specific feedback', async () => {
        renderApp()

        // Try to save configuration with invalid data
        const nameInput = screen.getByLabelText(/配置名称/i)
        const accessKeyInput = screen.getByLabelText(/Access Key ID/i)
        const regionInput = screen.getByLabelText(/区域/i)
        const bucketInput = screen.getByLabelText(/存储桶名称/i)

        // Enter invalid data
        fireEvent.change(nameInput, { target: { value: '' } }) // Empty name
        fireEvent.change(accessKeyInput, { target: { value: 'short' } }) // Too short
        fireEvent.change(regionInput, { target: { value: 'invalid-region' } }) // Invalid region
        fireEvent.change(bucketInput, { target: { value: 'Invalid_Bucket_Name!' } }) // Invalid characters

        const saveButton = screen.getByText(/保存配置/i)
        fireEvent.click(saveButton)

        await waitFor(() => {
            // Should show field-specific validation errors
            expect(screen.getByText(/配置名称不能为空/i)).toBeInTheDocument()
            expect(screen.getByText(/Access Key ID 长度不足/i)).toBeInTheDocument()
            expect(screen.getByText(/无效的区域格式/i)).toBeInTheDocument()
            expect(screen.getByText(/存储桶名称包含无效字符/i)).toBeInTheDocument()
        })

        // Should highlight invalid fields
        expect(nameInput).toHaveClass('border-red-500')
        expect(accessKeyInput).toHaveClass('border-red-500')
        expect(regionInput).toHaveClass('border-red-500')
        expect(bucketInput).toHaveClass('border-red-500')

        // Should show validation summary
        expect(screen.getByText(/发现 4 个验证错误/i)).toBeInTheDocument()

        // Fix validation errors
        fireEvent.change(nameInput, { target: { value: 'Valid Config' } })
        fireEvent.change(accessKeyInput, { target: { value: 'AKIAIOSFODNN7EXAMPLE' } })
        fireEvent.change(regionInput, { target: { value: 'us-east-1' } })
        fireEvent.change(bucketInput, { target: { value: 'valid-bucket-name' } })

        // Should clear validation errors
        await waitFor(() => {
            expect(screen.queryByText(/配置名称不能为空/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/Access Key ID 长度不足/i)).not.toBeInTheDocument()
        })

        // Fields should no longer be highlighted
        expect(nameInput).not.toHaveClass('border-red-500')
        expect(accessKeyInput).not.toHaveClass('border-red-500')
    })
})