import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { App } from '../../App'
import { mockTauriApi } from './setup'

// Mock stores with upload functionality
vi.mock('../../stores/uploadStore', () => ({
    useUploadStore: () => ({
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

// Mock File API
const createMockFile = (name: string, size: number, type: string = 'text/plain') => {
    const file = new File(['test content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
}

describe('Upload Workflow E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should complete full file upload workflow', async () => {
        // Mock successful upload operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('upload-task-1') // start_upload
            .mockResolvedValueOnce(undefined) // upload_chunk
            .mockResolvedValueOnce(undefined) // complete_upload

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        await waitFor(() => {
            expect(screen.getByText(/拖拽文件到此处/i)).toBeInTheDocument()
        })

        // Create mock files
        const testFile = createMockFile('test-document.pdf', 1024 * 1024) // 1MB file

        // Simulate file drop
        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: {
                files: [testFile],
                types: ['Files']
            }
        })

        fireEvent(dropZone, dropEvent)

        await waitFor(() => {
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
        })

        // Start upload
        const uploadButton = screen.getByText(/开始上传/i)
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('start_upload', expect.objectContaining({
                fileName: 'test-document.pdf',
                fileSize: 1024 * 1024
            }))
        })

        // Should show upload progress
        expect(screen.getByText(/上传中/i)).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should handle multiple file upload workflow', async () => {
        // Mock multiple file upload
        mockTauriApi.invoke
            .mockResolvedValueOnce('upload-task-1') // start_upload for file 1
            .mockResolvedValueOnce('upload-task-2') // start_upload for file 2
            .mockResolvedValueOnce('upload-task-3') // start_upload for file 3

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        // Create multiple mock files
        const files = [
            createMockFile('document1.pdf', 500 * 1024),
            createMockFile('image1.jpg', 2 * 1024 * 1024),
            createMockFile('video1.mp4', 50 * 1024 * 1024)
        ]

        // Simulate multiple file drop
        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: {
                files: files,
                types: ['Files']
            }
        })

        fireEvent(dropZone, dropEvent)

        await waitFor(() => {
            expect(screen.getByText('document1.pdf')).toBeInTheDocument()
            expect(screen.getByText('image1.jpg')).toBeInTheDocument()
            expect(screen.getByText('video1.mp4')).toBeInTheDocument()
        })

        // Start batch upload
        const uploadAllButton = screen.getByText(/全部上传/i)
        fireEvent.click(uploadAllButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledTimes(3)
        })

        // Should show upload queue
        expect(screen.getByText(/上传队列/i)).toBeInTheDocument()
        expect(screen.getByText(/3 个文件/i)).toBeInTheDocument()
    })

    it('should handle large file multipart upload workflow', async () => {
        // Mock multipart upload operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('multipart-upload-1') // initiate_multipart_upload
            .mockResolvedValueOnce('part-1-etag') // upload_part
            .mockResolvedValueOnce('part-2-etag') // upload_part
            .mockResolvedValueOnce(undefined) // complete_multipart_upload

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        // Create large mock file (>100MB to trigger multipart)
        const largeFile = createMockFile('large-video.mp4', 150 * 1024 * 1024)

        // Simulate file drop
        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: {
                files: [largeFile],
                types: ['Files']
            }
        })

        fireEvent(dropZone, dropEvent)

        await waitFor(() => {
            expect(screen.getByText('large-video.mp4')).toBeInTheDocument()
        })

        // Should show multipart upload indicator
        expect(screen.getByText(/分片上传/i)).toBeInTheDocument()

        // Start upload
        const uploadButton = screen.getByText(/开始上传/i)
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('initiate_multipart_upload', expect.any(Object))
        })

        // Should show multipart progress
        expect(screen.getByText(/分片 1/i)).toBeInTheDocument()
        expect(screen.getByText(/分片 2/i)).toBeInTheDocument()
    })

    it('should handle upload pause and resume workflow', async () => {
        // Mock pause/resume operations
        mockTauriApi.invoke
            .mockResolvedValueOnce('upload-task-1') // start_upload
            .mockResolvedValueOnce(undefined) // pause_upload
            .mockResolvedValueOnce(undefined) // resume_upload

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        // Add file and start upload
        const testFile = createMockFile('test-file.txt', 10 * 1024 * 1024)
        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [testFile], types: ['Files'] }
        })

        fireEvent(dropZone, dropEvent)

        const uploadButton = screen.getByText(/开始上传/i)
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(screen.getByText(/上传中/i)).toBeInTheDocument()
        })

        // Pause upload
        const pauseButton = screen.getByText(/暂停/i)
        fireEvent.click(pauseButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('pause_upload', { taskId: 'upload-task-1' })
        })

        expect(screen.getByText(/已暂停/i)).toBeInTheDocument()

        // Resume upload
        const resumeButton = screen.getByText(/继续/i)
        fireEvent.click(resumeButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledWith('resume_upload', { taskId: 'upload-task-1' })
        })

        expect(screen.getByText(/上传中/i)).toBeInTheDocument()
    })

    it('should handle upload error and retry workflow', async () => {
        // Mock upload failure and retry
        mockTauriApi.invoke
            .mockRejectedValueOnce(new Error('Network error')) // start_upload fails
            .mockResolvedValueOnce('upload-task-1') // retry succeeds

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        // Add file and start upload
        const testFile = createMockFile('test-file.txt', 1024)
        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [testFile], types: ['Files'] }
        })

        fireEvent(dropZone, dropEvent)

        const uploadButton = screen.getByText(/开始上传/i)
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(screen.getByText(/上传失败/i)).toBeInTheDocument()
        })

        // Should show error message
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()

        // Retry upload
        const retryButton = screen.getByText(/重试/i)
        fireEvent.click(retryButton)

        await waitFor(() => {
            expect(mockTauriApi.invoke).toHaveBeenCalledTimes(2)
        })

        expect(screen.getByText(/上传中/i)).toBeInTheDocument()
    })

    it('should handle upload progress and completion workflow', async () => {
        // Mock progressive upload with progress updates
        mockTauriApi.invoke
            .mockResolvedValueOnce('upload-task-1') // start_upload

        // Mock progress events
        const mockProgressEvents = [
            { taskId: 'upload-task-1', progress: 25, uploadedBytes: 256 * 1024, totalBytes: 1024 * 1024 },
            { taskId: 'upload-task-1', progress: 50, uploadedBytes: 512 * 1024, totalBytes: 1024 * 1024 },
            { taskId: 'upload-task-1', progress: 75, uploadedBytes: 768 * 1024, totalBytes: 1024 * 1024 },
            { taskId: 'upload-task-1', progress: 100, uploadedBytes: 1024 * 1024, totalBytes: 1024 * 1024 }
        ]

        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        // Add file and start upload
        const testFile = createMockFile('test-file.txt', 1024 * 1024)
        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [testFile], types: ['Files'] }
        })

        fireEvent(dropZone, dropEvent)

        const uploadButton = screen.getByText(/开始上传/i)
        fireEvent.click(uploadButton)

        // Simulate progress updates
        for (const progressEvent of mockProgressEvents) {
            // Simulate progress event from Tauri
            window.dispatchEvent(new CustomEvent('upload-progress', { detail: progressEvent }))

            await waitFor(() => {
                expect(screen.getByText(`${progressEvent.progress}%`)).toBeInTheDocument()
            })
        }

        // Should show completion
        await waitFor(() => {
            expect(screen.getByText(/上传完成/i)).toBeInTheDocument()
        })
    })

    it('should handle upload queue management workflow', async () => {
        renderApp()

        // Navigate to upload page
        const uploadLink = screen.getByText(/文件上传/i)
        fireEvent.click(uploadLink)

        // Add multiple files
        const files = [
            createMockFile('file1.txt', 1024),
            createMockFile('file2.txt', 2048),
            createMockFile('file3.txt', 4096)
        ]

        const dropZone = screen.getByTestId('upload-zone')
        const dropEvent = new Event('drop', { bubbles: true })
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: files, types: ['Files'] }
        })

        fireEvent(dropZone, dropEvent)

        await waitFor(() => {
            expect(screen.getByText('file1.txt')).toBeInTheDocument()
            expect(screen.getByText('file2.txt')).toBeInTheDocument()
            expect(screen.getByText('file3.txt')).toBeInTheDocument()
        })

        // Remove a file from queue
        const removeButtons = screen.getAllByText(/移除/i)
        fireEvent.click(removeButtons[1]) // Remove file2.txt

        await waitFor(() => {
            expect(screen.queryByText('file2.txt')).not.toBeInTheDocument()
        })

        // Clear all files
        const clearAllButton = screen.getByText(/清空队列/i)
        fireEvent.click(clearAllButton)

        await waitFor(() => {
            expect(screen.queryByText('file1.txt')).not.toBeInTheDocument()
            expect(screen.queryByText('file3.txt')).not.toBeInTheDocument()
        })

        // Should show empty state
        expect(screen.getByText(/拖拽文件到此处/i)).toBeInTheDocument()
    })
})