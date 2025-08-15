import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SecurityDashboard } from '../SecurityDashboard'
import { SecurityService } from '../../../services/securityService'
import { useConfigStore } from '../../../stores/configStore'
import { SecurityReport, SecurityWarning, NetworkSecurityCheck } from '../../../types/security'

// Mock dependencies
vi.mock('../../../services/securityService')
vi.mock('../../../stores/configStore')
vi.mock('../SecurityWarning', () => ({
    SecurityWarning: ({ warning, onDismiss, onResolve }: any) => (
        <div data-testid={`warning-${warning.id}`}>
            <span>{warning.message}</span>
            <button onClick={() => onDismiss(warning.id)}>Dismiss</button>
            <button onClick={() => onResolve(warning.id)}>Resolve</button>
        </div>
    )
}))

const mockSecurityService = vi.mocked(SecurityService)
const mockUseConfigStore = vi.mocked(useConfigStore)

describe('SecurityDashboard', () => {
    const mockConfigs = [
        {
            id: '1',
            name: 'Test Config 1',
            accessKeyId: 'test-key-1',
            secretAccessKey: 'test-secret-1',
            region: 'us-east-1',
            bucketName: 'test-bucket-1'
        },
        {
            id: '2',
            name: 'Test Config 2',
            accessKeyId: 'test-key-2',
            secretAccessKey: 'test-secret-2',
            region: 'us-west-2',
            bucketName: 'test-bucket-2'
        }
    ]

    const mockReport: SecurityReport = {
        overallRisk: 'medium',
        networkSecurity: {
            isHttps: true,
            certificateValid: true
        },
        configurationSecurity: {
            configurationEncrypted: true,
            hasWeakCredentials: false,
            credentialsExposed: false
        },
        environmentSecurity: {
            isProduction: true,
            debugModeEnabled: false,
            sensitiveDataInLogs: false
        },
        recommendations: ['Enable MFA', 'Rotate credentials regularly'],
        timestamp: new Date('2023-01-01T12:00:00Z')
    }

    const mockWarnings: SecurityWarning[] = [
        {
            id: '1',
            type: 'network',
            severity: 'high',
            message: 'Insecure connection detected',
            details: 'Connection is not using HTTPS',
            timestamp: new Date('2023-01-01T12:00:00Z'),
            configId: '1'
        },
        {
            id: '2',
            type: 'certificate',
            severity: 'medium',
            message: 'Certificate expiring soon',
            details: 'SSL certificate expires in 30 days',
            timestamp: new Date('2023-01-01T12:00:00Z'),
            configId: '2'
        }
    ]

    const mockNetworkCheck: NetworkSecurityCheck = {
        isHttps: true,
        certificateValid: true,
        certificateExpiry: new Date('2024-01-01T12:00:00Z'),
        certificateIssuer: 'Test CA',
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384'
    }

    beforeEach(() => {
        vi.clearAllMocks()

        mockUseConfigStore.mockReturnValue({
            configs: mockConfigs,
            activeConfigId: null,
            getActiveConfig: vi.fn(),
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

        mockSecurityService.generateSecurityReport.mockResolvedValue(mockReport)
        mockSecurityService.getActiveWarnings.mockReturnValue(mockWarnings)
        mockSecurityService.checkNetworkSecurity.mockResolvedValue(mockNetworkCheck)
        mockSecurityService.getSettings.mockReturnValue({
            autoSecurityChecks: true,
            warningThreshold: 'medium',
            encryptionEnabled: true
        })
        mockSecurityService.dismissWarning.mockImplementation(() => { })
        mockSecurityService.clearAllWarnings.mockImplementation(() => { })
    })

    it('should render loading state initially', () => {
        mockSecurityService.generateSecurityReport.mockImplementation(() => new Promise(() => { }))

        render(<SecurityDashboard />)

        expect(screen.getByText('正在生成安全报告...')).toBeInTheDocument()
    })

    it('should render security overview after loading', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('安全概览')).toBeInTheDocument()
        })

        expect(screen.getByText('中等风险')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument() // Number of warnings
        expect(screen.getByText('2')).toBeInTheDocument() // Number of recommendations
    })

    it('should render security warnings', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('安全警告')).toBeInTheDocument()
        })

        expect(screen.getByText('Insecure connection detected')).toBeInTheDocument()
        expect(screen.getByText('Certificate expiring soon')).toBeInTheDocument()
    })

    it('should handle warning dismissal', async () => {
        mockSecurityService.getActiveWarnings.mockReturnValueOnce(mockWarnings).mockReturnValueOnce([mockWarnings[1]])

        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByTestId('warning-1')).toBeInTheDocument()
        })

        const dismissButton = screen.getAllByText('Dismiss')[0]
        fireEvent.click(dismissButton)

        expect(mockSecurityService.dismissWarning).toHaveBeenCalledWith('1')
    })

    it('should handle clear all warnings', async () => {
        mockSecurityService.getActiveWarnings.mockReturnValueOnce(mockWarnings).mockReturnValueOnce([])

        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('清除全部')).toBeInTheDocument()
        })

        const clearAllButton = screen.getByText('清除全部')
        fireEvent.click(clearAllButton)

        expect(mockSecurityService.clearAllWarnings).toHaveBeenCalled()
    })

    it('should expand and collapse warnings', async () => {
        const manyWarnings = Array.from({ length: 5 }, (_, i) => ({
            ...mockWarnings[0],
            id: `warning-${i}`,
            message: `Warning ${i}`
        }))

        mockSecurityService.getActiveWarnings.mockReturnValue(manyWarnings)

        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('显示更多 (2 个警告)')).toBeInTheDocument()
        })

        // Should only show first 3 warnings initially
        expect(screen.getByText('Warning 0')).toBeInTheDocument()
        expect(screen.getByText('Warning 1')).toBeInTheDocument()
        expect(screen.getByText('Warning 2')).toBeInTheDocument()
        expect(screen.queryByText('Warning 3')).not.toBeInTheDocument()

        // Expand to show all warnings
        const expandButton = screen.getByText('显示更多 (2 个警告)')
        fireEvent.click(expandButton)

        await waitFor(() => {
            expect(screen.getByText('Warning 3')).toBeInTheDocument()
            expect(screen.getByText('Warning 4')).toBeInTheDocument()
        })

        // Should show collapse button
        expect(screen.getByText('收起')).toBeInTheDocument()
    })

    it('should perform network security checks', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('网络检查')).toBeInTheDocument()
        })

        const networkCheckButton = screen.getByText('网络检查')
        fireEvent.click(networkCheckButton)

        expect(mockSecurityService.checkNetworkSecurity).toHaveBeenCalledWith(mockConfigs[0])
        expect(mockSecurityService.checkNetworkSecurity).toHaveBeenCalledWith(mockConfigs[1])
    })

    it('should refresh security report', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('刷新报告')).toBeInTheDocument()
        })

        const refreshButton = screen.getByText('刷新报告')
        fireEvent.click(refreshButton)

        expect(mockSecurityService.generateSecurityReport).toHaveBeenCalledWith(mockConfigs)
    })

    it('should show network security details when expanded', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('展开')).toBeInTheDocument()
        })

        const expandButton = screen.getByText('展开')
        fireEvent.click(expandButton)

        await waitFor(() => {
            expect(screen.getByText('网络安全详情')).toBeInTheDocument()
        })

        expect(screen.getByText('Test Config 1')).toBeInTheDocument()
        expect(screen.getByText('Test Config 2')).toBeInTheDocument()
        expect(screen.getByText('✓ 已启用')).toBeInTheDocument() // HTTPS enabled
        expect(screen.getByText('✓ 有效')).toBeInTheDocument() // Certificate valid
    })

    it('should show detailed security information when expanded', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('展开')).toBeInTheDocument()
        })

        const expandButton = screen.getByText('展开')
        fireEvent.click(expandButton)

        await waitFor(() => {
            expect(screen.getByText('详细安全信息')).toBeInTheDocument()
        })

        expect(screen.getByText('网络安全')).toBeInTheDocument()
        expect(screen.getByText('配置安全')).toBeInTheDocument()
        expect(screen.getByText('环境安全')).toBeInTheDocument()
        expect(screen.getByText('安全建议')).toBeInTheDocument()

        expect(screen.getByText('Enable MFA')).toBeInTheDocument()
        expect(screen.getByText('Rotate credentials regularly')).toBeInTheDocument()
    })

    it('should show no warnings state when there are no warnings', async () => {
        mockSecurityService.getActiveWarnings.mockReturnValue([])

        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('安全状态良好')).toBeInTheDocument()
        })

        expect(screen.getByText('当前没有发现安全问题')).toBeInTheDocument()
        expect(screen.getByText('🛡️')).toBeInTheDocument()
    })

    it('should handle warning resolution', async () => {
        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByTestId('warning-1')).toBeInTheDocument()
        })

        const resolveButton = screen.getAllByText('Resolve')[0]
        fireEvent.click(resolveButton)

        // Should trigger network security check for network type warning
        await waitFor(() => {
            expect(mockSecurityService.checkNetworkSecurity).toHaveBeenCalled()
        })
    })

    it('should apply custom className', () => {
        const { container } = render(<SecurityDashboard className="custom-class" />)

        expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should handle different risk levels', async () => {
        const highRiskReport = { ...mockReport, overallRisk: 'high' as const }
        mockSecurityService.generateSecurityReport.mockResolvedValue(highRiskReport)

        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(screen.getByText('高风险')).toBeInTheDocument()
        })
    })

    it('should handle errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        mockSecurityService.generateSecurityReport.mockRejectedValue(new Error('Test error'))

        render(<SecurityDashboard />)

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to generate security report:', expect.any(Error))
        })

        consoleSpy.mockRestore()
    })
})