import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { App } from '../../App'
import { mockTauriApi } from './setup'

// Mock stores with download functionality
vi.mock('../../stores/downloadStore', () => ({
    useDownloadStore: () => ({
        tasks: [],
        addTask: vi.fn(),
        removeTask: vi.fn(),
        clearCompleted: vi.fn(),
        pauseTask: vi.fn(),
        resumeTask: vi.fn(),
        retryTask: vi.fn(),
        getTotalProgress: () => 0,
        getActiveTasksCount: () => 0,
    })
}))

vi.mock('../../stores/fileStore', () => ({
    useFileStore: () => ({
        files: [
            {
                key: 'documents/report.pdf',
                name: 'report.pdf',
                size: 2048576,
                lastModified: new Date('2023-01-01'),
                etag: 'abc123',
                isDirectory: false
            },
            {
                key: 'images/photo.jpg',
                name: 'photo.jpg',
                size: 1024768,
                lastModified: new Date('2023-01-02'),
                etag: 'def456',
                isDirectory: false
            },
            {
                key: 'videos/',
                name: 'videos',
                size: 0,
                lastModified: new Date('2023-01-03'),
                etag: '',
                isDirectory: true
            }
        ],
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

vi.mock('../../stores/configStore', () => ({
    useConfigStore: () => ({
        configs: [{
            id: '1',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }],
        activeConfigId: '1',
        getActiveConfig: () => ({
            id: '1',
            name: 'Test Config',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1',
            bucketName: 'test-bucket'
        }),
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

const renderApp = () => {
    return render(
        <BrowserRouter>
            <App />
        </BrowserRouter>
    )
}

describe('Download Workflow E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should complete full file download workflow', async () => {
        // Mock successful download operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads') // select_download_directory
            .mockResolvedValueOnce('download-task-1') // start_download
            .mockResolvedValueOnce(undefined) // download_chunk
            .mockResolvedValueOnce(undefined) // complete_download

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        await waitFor(() => {
            expect(screen.getByText('report.pdf')).toBeInTheDocument()
        })

        // Right-click on file to open context menu
        const fileItem = screen.getByText('report.pdf')
        fireEvent.contextMenu(fileItem)

        await waitFor(() => {
            expect(screen.getByText(/下载/i)).toBeInTheDocument()
        })

        // Click download
        const downloadButton = screen.getByText(/下载/i)
        fireEvent.click(downloadButton)

        // Select download location
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('select_download_directory')
        })

        // Start download
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('start_download', expect.objectContaining({
                s3Key: 'documents/report.pdf',
                fileName: 'report.pdf',
                localPath: '/Users/test/Downloads/report.pdf'
            }))
        })

        // Should show download progress
        expect(screen.getByText(/下载中/i)).toBeInTheDocument()
    })

    it('should handle batch download workflow', async () => {
        // Mock batch download operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads') // select_download_directory
            .mockResolvedValueOnce('download-task-1') // start_download for file 1
            .mockResolvedValueOnce('download-task-2') // start_download for file 2

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        await waitFor(() => {
            expect(screen.getByText('report.pdf')).toBeInTheDocument()
            expect(screen.getByText('photo.jpg')).toBeInTheDocument()
        })

        // Select multiple files
        const checkbox1 = screen.getAllByRole('checkbox')[0]
        const checkbox2 = screen.getAllByRole('checkbox')[1]

        fireEvent.click(checkbox1)
        fireEvent.click(checkbox2)

        // Click batch download button
        const batchDownloadButton = screen.getByText(/批量下载/i)
        fireEvent.click(batchDownloadButton)

        // Select download location
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('select_download_directory')
        })

        // Should start multiple downloads
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('start_download', expect.objectContaining({
                s3Key: 'documents/report.pdf'
            }))
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('start_download', expect.objectContaining({
                s3Key: 'images/photo.jpg'
            }))
        })

        // Should show batch download progress
        expect(screen.getByText(/批量下载进行中/i)).toBeInTheDocument()
        expect(screen.getByText(/2 个文件/i)).toBeInTheDocument()
    })

    it('should handle download with resume capability', async () => {
        // Mock resume download operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads/report.pdf') // select_download_path
            .mockResolvedValueOnce(true) // check_file_exists
            .mockResolvedValueOnce(1024000) // get_file_size (partial download)
            .mockResolvedValueOnce('download-task-1') // resume_download

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        // Right-click on file
        const fileItem = screen.getByText('report.pdf')
        fireEvent.contextMenu(fileItem)

        // Click download
        const downloadButton = screen.getByText(/下载/i)
        fireEvent.click(downloadButton)

        // Should detect partial file and offer resume
        await waitFor(() => {
            expect(screen.getByText(/检测到未完成的下载/i)).toBeInTheDocument()
        })

        // Click resume
        const resumeButton = screen.getByText(/继续下载/i)
        fireEvent.click(resumeButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('resume_download', expect.objectContaining({
                s3Key: 'documents/report.pdf',
                resumeFrom: 1024000
            }))
        })

        // Should show resume progress
        expect(screen.getByText(/断点续传中/i)).toBeInTheDocument()
    })

    it('should handle download error and retry workflow', async () => {
        // Mock download failure and retry
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads') // select_download_directory
            .mockRejectedValueOnce(new Error('Connection timeout')) // start_download fails
            .mockResolvedValueOnce('download-task-1') // retry succeeds

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        // Start download
        const fileItem = screen.getByText('report.pdf')
        fireEvent.contextMenu(fileItem)

        const downloadButton = screen.getByText(/下载/i)
        fireEvent.click(downloadButton)

        await waitFor(() => {
            expect(screen.getByText(/下载失败/i)).toBeInTheDocument()
        })

        // Should show error message
        expect(screen.getByText(/Connection timeout/i)).toBeInTheDocument()

        // Retry download
        const retryButton = screen.getByText(/重试/i)
        fireEvent.click(retryButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledTimes(3) // select + failed attempt + retry
        })

        expect(screen.getByText(/下载中/i)).toBeInTheDocument()
    })

    it('should handle download progress and completion workflow', async () => {
        // Mock progressive download with progress updates
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads') // select_download_directory
            .mockResolvedValueOnce('download-task-1') // start_download

        // Mock progress events
        const mockProgressEvents = [
            { taskId: 'download-task-1', progress: 20, downloadedBytes: 409600, totalBytes: 2048576 },
            { taskId: 'download-task-1', progress: 40, downloadedBytes: 819200, totalBytes: 2048576 },
            { taskId: 'download-task-1', progress: 60, downloadedBytes: 1228800, totalBytes: 2048576 },
            { taskId: 'download-task-1', progress: 80, downloadedBytes: 1638400, totalBytes: 2048576 },
            { taskId: 'download-task-1', progress: 100, downloadedBytes: 2048576, totalBytes: 2048576 }
        ]

        renderApp()

        // Navigate to files page and start download
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        const fileItem = screen.getByText('report.pdf')
        fireEvent.contextMenu(fileItem)

        const downloadButton = screen.getByText(/下载/i)
        fireEvent.click(downloadButton)

        // Simulate progress updates
        for (const progressEvent of mockProgressEvents) {
            window.dispatchEvent(new CustomEvent('download-progress', { detail: progressEvent }))

            await waitFor(() => {
                expect(screen.getByText(`${progressEvent.progress}%`)).toBeInTheDocument()
            })
        }

        // Should show completion
        await waitFor(() => {
            expect(screen.getByText(/下载完成/i)).toBeInTheDocument()
        })

        // Should show completion notification
        expect(screen.getByText(/文件已保存到/i)).toBeInTheDocument()
    })

    it('should handle download queue management workflow', async () => {
        renderApp()

        // Navigate to downloads page
        const downloadsLink = screen.getByText(/下载管理/i)
        fireEvent.click(downloadsLink)

        await waitFor(() => {
            expect(screen.getByText(/下载队列/i)).toBeInTheDocument()
        })

        // Should show empty state initially
        expect(screen.getByText(/暂无下载任务/i)).toBeInTheDocument()

        // Add some mock downloads (simulate ongoing downloads)
        const mockDownloads = [
            { id: '1', fileName: 'file1.pdf', progress: 45, status: 'downloading' },
            { id: '2', fileName: 'file2.jpg', progress: 100, status: 'completed' },
            { id: '3', fileName: 'file3.mp4', progress: 0, status: 'failed' }
        ]

        // Simulate downloads being added to queue
        for (const download of mockDownloads) {
            window.dispatchEvent(new CustomEvent('download-added', { detail: download }))
        }

        await waitFor(() => {
            expect(screen.getByText('file1.pdf')).toBeInTheDocument()
            expect(screen.getByText('file2.jpg')).toBeInTheDocument()
            expect(screen.getByText('file3.mp4')).toBeInTheDocument()
        })

        // Pause active download
        const pauseButton = screen.getByText(/暂停/i)
        fireEvent.click(pauseButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('pause_download', { taskId: '1' })
        })

        // Remove completed download
        const removeButtons = screen.getAllByText(/移除/i)
        fireEvent.click(removeButtons[0]) // Remove completed download

        await waitFor(() => {
            expect(screen.queryByText('file2.jpg')).not.toBeInTheDocument()
        })

        // Clear all completed downloads
        const clearCompletedButton = screen.getByText(/清除已完成/i)
        fireEvent.click(clearCompletedButton)

        // Should only show active and failed downloads
        expect(screen.getByText('file1.pdf')).toBeInTheDocument()
        expect(screen.getByText('file3.mp4')).toBeInTheDocument()
    })

    it('should handle download path selection and validation workflow', async () => {
        // Mock path selection and validation
        mockTauriApi.invoke
            .mockResolvedValueOnce('/Users/test/Downloads/report.pdf') // select_download_path
            .mockResolvedValueOnce(true) // validate_download_path
            .mockResolvedValueOnce(false) // check_file_exists
            .mockResolvedValueOnce('download-task-1') // start_download

        renderApp()

        // Navigate to files page
        const filesLink = screen.getByText(/文件浏览/i)
        fireEvent.click(filesLink)

        // Right-click on file
        const fileItem = screen.getByText('report.pdf')
        fireEvent.contextMenu(fileItem)

        // Click download with custom path
        const downloadAsButton = screen.getByText(/另存为/i)
        fireEvent.click(downloadAsButton)

        // Should open path selection dialog
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('select_download_path', expect.objectContaining({
                defaultFileName: 'report.pdf'
            }))
        })

        // Should validate the selected path
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('validate_download_path', {
                path: '/Users/test/Downloads/report.pdf'
            })
        })

        // Should check if file already exists
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('check_file_exists', {
                path: '/Users/test/Downloads/report.pdf'
            })
        })

        // Should start download with validated path
        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('start_download', expect.objectContaining({
                localPath: '/Users/test/Downloads/report.pdf'
            }))
        })
    })

    it('should handle download notifications workflow', async () => {
        renderApp()

        // Navigate to downloads page
        const downloadsLink = screen.getByText(/下载管理/i)
        fireEvent.click(downloadsLink)

        // Simulate download completion event
        const completionEvent = {
            taskId: 'download-task-1',
            fileName: 'report.pdf',
            localPath: '/Users/test/Downloads/report.pdf',
            status: 'completed'
        }

        window.dispatchEvent(new CustomEvent('download-completed', { detail: completionEvent }))

        // Should show completion notification
        await waitFor(() => {
            expect(screen.getByText(/下载完成/i)).toBeInTheDocument()
            expect(screen.getByText(/report.pdf 已成功下载/i)).toBeInTheDocument()
        })

        // Should have action buttons in notification
        expect(screen.getByText(/打开文件/i)).toBeInTheDocument()
        expect(screen.getByText(/打开文件夹/i)).toBeInTheDocument()

        // Test open file action
        const openFileButton = screen.getByText(/打开文件/i)
        fireEvent.click(openFileButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('open_file', {
                path: '/Users/test/Downloads/report.pdf'
            })
        })

        // Test open folder action
        const openFolderButton = screen.getByText(/打开文件夹/i)
        fireEvent.click(openFolderButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('open_folder', {
                path: '/Users/test/Downloads'
            })
        })
    })
})