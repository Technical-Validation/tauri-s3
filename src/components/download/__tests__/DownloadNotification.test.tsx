import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DownloadNotification, DownloadNotificationManager } from '../DownloadNotification'
import { DownloadTask } from '../../../types/download'

// Mock formatters
vi.mock('../../../utils/formatters', () => ({
    formatBytes: (bytes: number) => `${bytes} bytes`
}))

describe('DownloadNotification', () => {
    const mockOnClose = vi.fn()

    const createMockTask = (overrides: Partial<DownloadTask> = {}): DownloadTask => ({
        id: '1',
        fileName: 'test-file.txt',
        s3Key: 'test/file.txt',
        localPath: '/downloads/test-file.txt',
        totalBytes: 1000,
        downloadedBytes: 500,
        progress: 50,
        status: 'downloading',
        createdAt: new Date(),
        ...overrides
    })

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should render downloading notification', () => {
        const task = createMockTask({ status: 'downloading' })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        expect(screen.getByText('正在下载')).toBeInTheDocument()
        expect(screen.getByText('test-file.txt 正在下载中 (50%)')).toBeInTheDocument()
        expect(screen.getByText('500 bytes')).toBeInTheDocument()
        expect(screen.getByText('1000 bytes')).toBeInTheDocument()
    })

    it('should render completed notification', () => {
        const task = createMockTask({ status: 'completed', progress: 100 })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        expect(screen.getByText('下载完成')).toBeInTheDocument()
        expect(screen.getByText('test-file.txt 已成功下载到 /downloads/test-file.txt')).toBeInTheDocument()
        expect(screen.getByText('打开文件')).toBeInTheDocument()
        expect(screen.getByText('打开文件夹')).toBeInTheDocument()
    })

    it('should render failed notification', () => {
        const task = createMockTask({
            status: 'failed',
            error: 'Network error'
        })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        expect(screen.getByText('下载失败')).toBeInTheDocument()
        expect(screen.getByText('test-file.txt 下载失败: Network error')).toBeInTheDocument()
    })

    it('should render paused notification', () => {
        const task = createMockTask({ status: 'paused' })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        expect(screen.getByText('下载已暂停')).toBeInTheDocument()
        expect(screen.getByText('test-file.txt 下载已暂停')).toBeInTheDocument()
    })

    it('should close notification when close button is clicked', () => {
        const task = createMockTask()

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        const closeButton = screen.getByRole('button')
        fireEvent.click(closeButton)

        // Should call onClose after animation delay
        vi.advanceTimersByTime(300)
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('should auto-close completed notification', async () => {
        const task = createMockTask({ status: 'completed' })

        render(<DownloadNotification task={task} onClose={mockOnClose} autoClose={true} autoCloseDelay={1000} />)

        vi.advanceTimersByTime(1300) // 1000ms delay + 300ms animation

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it('should auto-close failed notification', async () => {
        const task = createMockTask({ status: 'failed' })

        render(<DownloadNotification task={task} onClose={mockOnClose} autoClose={true} autoCloseDelay={1000} />)

        vi.advanceTimersByTime(1300)

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it('should not auto-close when autoClose is false', () => {
        const task = createMockTask({ status: 'completed' })

        render(<DownloadNotification task={task} onClose={mockOnClose} autoClose={false} />)

        vi.advanceTimersByTime(10000)

        expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should not auto-close downloading notification', () => {
        const task = createMockTask({ status: 'downloading' })

        render(<DownloadNotification task={task} onClose={mockOnClose} autoClose={true} autoCloseDelay={1000} />)

        vi.advanceTimersByTime(2000)

        expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should handle open file button click', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
        const task = createMockTask({ status: 'completed' })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        const openFileButton = screen.getByText('打开文件')
        fireEvent.click(openFileButton)

        expect(consoleSpy).toHaveBeenCalledWith('Opening file:', '/downloads/test-file.txt')

        consoleSpy.mockRestore()
    })

    it('should handle open folder button click', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
        const task = createMockTask({ status: 'completed' })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        const openFolderButton = screen.getByText('打开文件夹')
        fireEvent.click(openFolderButton)

        expect(consoleSpy).toHaveBeenCalledWith('Opening folder:', '/downloads')

        consoleSpy.mockRestore()
    })

    it('should display progress bar for downloading task', () => {
        const task = createMockTask({ status: 'downloading', progress: 75 })

        render(<DownloadNotification task={task} onClose={mockOnClose} />)

        const progressBar = document.querySelector('[style*="width: 75%"]')
        expect(progressBar).toBeInTheDocument()
    })

    it('should apply correct styling based on status', () => {
        const { rerender } = render(<DownloadNotification task={createMockTask({ status: 'completed' })} onClose={mockOnClose} />)

        let notification = document.querySelector('.bg-green-50')
        expect(notification).toBeInTheDocument()

        rerender(<DownloadNotification task={createMockTask({ status: 'failed' })} onClose={mockOnClose} />)
        notification = document.querySelector('.bg-red-50')
        expect(notification).toBeInTheDocument()

        rerender(<DownloadNotification task={createMockTask({ status: 'downloading' })} onClose={mockOnClose} />)
        notification = document.querySelector('.bg-blue-50')
        expect(notification).toBeInTheDocument()
    })
})

describe('DownloadNotificationManager', () => {
    const createMockTask = (id: string, status: DownloadTask['status']): DownloadTask => ({
        id,
        fileName: `file-${id}.txt`,
        s3Key: `test/file-${id}.txt`,
        localPath: `/downloads/file-${id}.txt`,
        totalBytes: 1000,
        downloadedBytes: 1000,
        progress: 100,
        status,
        createdAt: new Date()
    })

    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should render notifications for completed tasks', () => {
        const tasks = [
            createMockTask('1', 'completed'),
            createMockTask('2', 'downloading')
        ]

        render(<DownloadNotificationManager tasks={tasks} />)

        expect(screen.getByText('下载完成')).toBeInTheDocument()
        expect(screen.queryByText('正在下载')).not.toBeInTheDocument()
    })

    it('should render notifications for failed tasks', () => {
        const tasks = [
            createMockTask('1', 'failed'),
            createMockTask('2', 'downloading')
        ]

        render(<DownloadNotificationManager tasks={tasks} />)

        expect(screen.getByText('下载失败')).toBeInTheDocument()
        expect(screen.queryByText('正在下载')).not.toBeInTheDocument()
    })

    it('should limit number of notifications', () => {
        const tasks = [
            createMockTask('1', 'completed'),
            createMockTask('2', 'completed'),
            createMockTask('3', 'completed'),
            createMockTask('4', 'completed')
        ]

        render(<DownloadNotificationManager tasks={tasks} maxNotifications={2} />)

        const notifications = screen.getAllByText('下载完成')
        expect(notifications).toHaveLength(2)
    })

    it('should handle notification close', async () => {
        const tasks = [createMockTask('1', 'completed')]

        render(<DownloadNotificationManager tasks={tasks} />)

        expect(screen.getByText('下载完成')).toBeInTheDocument()

        const closeButton = screen.getByRole('button')
        fireEvent.click(closeButton)

        vi.advanceTimersByTime(300)

        await waitFor(() => {
            expect(screen.queryByText('下载完成')).not.toBeInTheDocument()
        })
    })

    it('should not show duplicate notifications', () => {
        const task = createMockTask('1', 'completed')
        const { rerender } = render(<DownloadNotificationManager tasks={[task]} />)

        expect(screen.getAllByText('下载完成')).toHaveLength(1)

        // Re-render with same task
        rerender(<DownloadNotificationManager tasks={[task]} />)

        expect(screen.getAllByText('下载完成')).toHaveLength(1)
    })
})