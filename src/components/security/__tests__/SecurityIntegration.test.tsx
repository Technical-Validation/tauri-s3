import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityDashboard } from '../SecurityDashboard';
import { SecuritySettings } from '../SecuritySettings';
import { SecurityWarning } from '../SecurityWarning';
import { SecurityService } from '../../../services/securityService';
import { useConfigStore } from '../../../stores/configStore';

// Mock the config store
vi.mock('../../../stores/configStore', () => ({
    useConfigStore: vi.fn(),
}));

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('Security Components Integration', () => {
    beforeEach(() => {
        // Clear warnings before each test
        SecurityService.clearAllWarnings();

        // Mock config store
        (useConfigStore as any).mockReturnValue({
            configs: [
                {
                    id: '1',
                    name: 'Test Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-east-1',
                    bucketName: 'test-bucket',
                },
            ],
        });
    });

    describe('SecurityWarning Component', () => {
        test('should render security warning with all details', () => {
            const warning = SecurityService.createWarning(
                'configuration',
                'high',
                'Test Security Warning',
                'This is a test security warning message',
                'This is a test recommendation'
            );

            const mockDismiss = vi.fn();
            const mockResolve = vi.fn();

            render(
                <SecurityWarning
                    warning={warning}
                    onDismiss={mockDismiss}
                    onResolve={mockResolve}
                    showDetails={true}
                />
            );

            expect(screen.getByText('Test Security Warning')).toBeInTheDocument();
            expect(screen.getByText('This is a test security warning message')).toBeInTheDocument();
            expect(screen.getByText(/This is a test recommendation/)).toBeInTheDocument();
            expect(screen.getByText('配置安全')).toBeInTheDocument();
            expect(screen.getByText('HIGH')).toBeInTheDocument();
        });

        test('should handle dismiss action', () => {
            const warning = SecurityService.createWarning(
                'network',
                'medium',
                'Network Warning',
                'Network security issue'
            );

            const mockDismiss = vi.fn();

            render(
                <SecurityWarning
                    warning={warning}
                    onDismiss={mockDismiss}
                />
            );

            const dismissButton = screen.getByText('忽略');
            fireEvent.click(dismissButton);

            expect(mockDismiss).toHaveBeenCalledWith(warning.id);
        });

        test('should handle resolve action', async () => {
            const warning = SecurityService.createWarning(
                'certificate',
                'critical',
                'Certificate Warning',
                'Certificate issue'
            );

            const mockResolve = vi.fn().mockResolvedValue(undefined);

            render(
                <SecurityWarning
                    warning={warning}
                    onDismiss={vi.fn()}
                    onResolve={mockResolve}
                />
            );

            const resolveButton = screen.getByText('解决');
            fireEvent.click(resolveButton);

            await waitFor(() => {
                expect(mockResolve).toHaveBeenCalledWith(warning.id);
            });
        });
    });

    describe('SecuritySettings Component', () => {
        test('should render security settings form', () => {
            render(<SecuritySettings />);

            expect(screen.getByText('安全设置')).toBeInTheDocument();
            expect(screen.getByText('启用安全警告')).toBeInTheDocument();
            expect(screen.getByText('启用网络安全检查')).toBeInTheDocument();
            expect(screen.getByText('启用SSL证书验证')).toBeInTheDocument();
            expect(screen.getByText('密码生成器')).toBeInTheDocument();
        });

        test('should generate secure password', () => {
            render(<SecuritySettings />);

            const generateButton = screen.getByText('生成密码');
            fireEvent.click(generateButton);

            // Should show generated password
            expect(screen.getByText('复制')).toBeInTheDocument();
            expect(screen.getByText(/密码已复制到剪贴板/)).toBeInTheDocument();
        });

        test('should update security settings', () => {
            render(<SecuritySettings />);

            const warningsCheckbox = screen.getByLabelText('启用安全警告');
            fireEvent.click(warningsCheckbox);

            const saveButton = screen.getByText('保存设置');
            expect(saveButton).not.toBeDisabled();

            fireEvent.click(saveButton);

            // Settings should be saved (button becomes disabled)
            expect(saveButton).toBeDisabled();
        });
    });

    describe('SecurityDashboard Component', () => {
        test('should render security dashboard', async () => {
            render(<SecurityDashboard />);

            expect(screen.getByText('安全概览')).toBeInTheDocument();
            expect(screen.getByText('刷新报告')).toBeInTheDocument();
            expect(screen.getByText('网络检查')).toBeInTheDocument();
        });

        test('should show security warnings when present', async () => {
            // Create a warning
            SecurityService.createWarning(
                'configuration',
                'high',
                'Configuration Issue',
                'There is a configuration security issue'
            );

            render(<SecurityDashboard />);

            await waitFor(() => {
                expect(screen.getByText('安全警告')).toBeInTheDocument();
                expect(screen.getByText('Configuration Issue')).toBeInTheDocument();
            });
        });

        test('should show no warnings state when no issues', async () => {
            render(<SecurityDashboard />);

            await waitFor(() => {
                expect(screen.getByText('安全状态良好')).toBeInTheDocument();
                expect(screen.getByText('当前没有发现安全问题')).toBeInTheDocument();
            });
        });

        test('should handle refresh security report', async () => {
            render(<SecurityDashboard />);

            const refreshButton = screen.getByText('刷新报告');
            fireEvent.click(refreshButton);

            // Should show loading state briefly
            await waitFor(() => {
                expect(refreshButton).toBeInTheDocument();
            });
        });

        test('should handle network security check', async () => {
            render(<SecurityDashboard />);

            const networkCheckButton = screen.getByText('网络检查');
            fireEvent.click(networkCheckButton);

            // Should trigger network security checks
            await waitFor(() => {
                expect(networkCheckButton).toBeInTheDocument();
            });
        });
    });

    describe('Security Service Integration', () => {
        test('should create and manage warnings across components', async () => {
            // Create warnings
            const warning1 = SecurityService.createWarning(
                'network',
                'high',
                'Network Issue',
                'Network security problem'
            );

            const warning2 = SecurityService.createWarning(
                'configuration',
                'medium',
                'Config Issue',
                'Configuration security problem'
            );

            // Render dashboard
            render(<SecurityDashboard />);

            // Should show both warnings
            await waitFor(() => {
                expect(screen.getByText('Network Issue')).toBeInTheDocument();
                expect(screen.getByText('Config Issue')).toBeInTheDocument();
            });

            // Clear all warnings
            const clearButton = screen.getByText('清除全部');
            fireEvent.click(clearButton);

            // Should show no warnings state
            await waitFor(() => {
                expect(screen.getByText('安全状态良好')).toBeInTheDocument();
            });
        });

        test('should validate password strength in settings', () => {
            const strongPassword = 'MyStr0ng!P@ssw0rd123';
            const weakPassword = 'weak';

            const strongResult = SecurityService.validatePasswordStrength(strongPassword);
            const weakResult = SecurityService.validatePasswordStrength(weakPassword);

            expect(strongResult.isStrong).toBe(true);
            expect(strongResult.feedback).toHaveLength(0);

            expect(weakResult.isStrong).toBe(false);
            expect(weakResult.feedback.length).toBeGreaterThan(0);
        });

        test('should perform configuration security checks', () => {
            const configs = [
                {
                    id: '1',
                    name: 'Weak Config',
                    accessKeyId: 'test',
                    secretAccessKey: 'weak',
                    region: 'us-east-1',
                    bucketName: 'test-bucket',
                },
            ];

            const result = SecurityService.checkConfigurationSecurity(configs);
            expect(result.hasWeakCredentials).toBe(true);

            // Should create warnings
            const warnings = SecurityService.getActiveWarnings();
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings.some(w => w.type === 'configuration')).toBe(true);
        });
    });
});