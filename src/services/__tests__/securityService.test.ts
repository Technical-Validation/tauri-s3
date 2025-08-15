import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SecurityService } from '../securityService';
import { S3Config } from '../../types/config';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('SecurityService', () => {
    beforeEach(() => {
        // Clear warnings before each test
        SecurityService.clearAllWarnings();
    });

    describe('Password Generation', () => {
        test('should generate secure password with correct length', () => {
            const password = SecurityService.generateSecurePassword(16);
            expect(password).toHaveLength(16);
        });

        test('should generate password with mixed character types', () => {
            const password = SecurityService.generateSecurePassword(32);

            // Check for uppercase letters
            expect(password).toMatch(/[A-Z]/);
            // Check for lowercase letters
            expect(password).toMatch(/[a-z]/);
            // Check for numbers
            expect(password).toMatch(/[0-9]/);
            // Check for special characters
            expect(password).toMatch(/[^A-Za-z0-9]/);
        });
    });

    describe('Password Validation', () => {
        test('should validate strong password', () => {
            const result = SecurityService.validatePasswordStrength('MyStr0ng!P@ssw0rd123');
            expect(result.isStrong).toBe(true);
            expect(result.score).toBeGreaterThanOrEqual(5);
        });

        test('should reject weak password', () => {
            const result = SecurityService.validatePasswordStrength('weak');
            expect(result.isStrong).toBe(false);
            expect(result.feedback.length).toBeGreaterThan(0);
        });

        test('should provide feedback for password improvement', () => {
            const result = SecurityService.validatePasswordStrength('password123');
            expect(result.feedback).toContain('应包含大写字母');
            expect(result.feedback).toContain('应包含特殊字符');
        });
    });

    describe('Configuration Security Check', () => {
        test('should detect weak credentials', () => {
            const configs: S3Config[] = [
                {
                    id: '1',
                    name: 'Test Config',
                    accessKeyId: 'test123',
                    secretAccessKey: 'weak',
                    region: 'us-east-1',
                    bucketName: 'test-bucket',
                },
            ];

            const result = SecurityService.checkConfigurationSecurity(configs);
            expect(result.hasWeakCredentials).toBe(true);
        });

        test('should detect potentially exposed credentials', () => {
            const configs: S3Config[] = [
                {
                    id: '1',
                    name: 'Test Config',
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    region: 'us-east-1',
                    bucketName: 'test-bucket',
                },
            ];

            const result = SecurityService.checkConfigurationSecurity(configs);
            expect(result.credentialsExposed).toBe(true);
        });
    });

    describe('Security Warnings', () => {
        test('should create and retrieve warnings', () => {
            const warning = SecurityService.createWarning(
                'configuration',
                'high',
                'Test Warning',
                'This is a test warning'
            );

            expect(warning.type).toBe('configuration');
            expect(warning.severity).toBe('high');
            expect(warning.title).toBe('Test Warning');

            const activeWarnings = SecurityService.getActiveWarnings();
            expect(activeWarnings).toHaveLength(1);
            expect(activeWarnings[0].id).toBe(warning.id);
        });

        test('should dismiss warnings', () => {
            const warning = SecurityService.createWarning(
                'network',
                'medium',
                'Test Warning',
                'This is a test warning'
            );

            SecurityService.dismissWarning(warning.id);
            const activeWarnings = SecurityService.getActiveWarnings();
            expect(activeWarnings).toHaveLength(0);
        });

        test('should clear all warnings', () => {
            SecurityService.createWarning('configuration', 'high', 'Warning 1', 'Message 1');
            SecurityService.createWarning('network', 'medium', 'Warning 2', 'Message 2');

            expect(SecurityService.getActiveWarnings()).toHaveLength(2);

            SecurityService.clearAllWarnings();
            expect(SecurityService.getActiveWarnings()).toHaveLength(0);
        });
    });

    describe('Network Security Check', () => {
        test('should detect non-HTTPS endpoints', async () => {
            const config: S3Config = {
                id: '1',
                name: 'Insecure Config',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                region: 'us-east-1',
                bucketName: 'test-bucket',
                endpoint: 'http://insecure-endpoint.com',
            };

            const result = await SecurityService.checkNetworkSecurity(config);
            expect(result.isHttps).toBe(false);

            const warnings = SecurityService.getActiveWarnings();
            expect(warnings.some(w => w.type === 'network' && w.title.includes('不安全的连接'))).toBe(true);
        });

        test('should validate HTTPS endpoints', async () => {
            const config: S3Config = {
                id: '1',
                name: 'Secure Config',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                region: 'us-east-1',
                bucketName: 'test-bucket',
                endpoint: 'https://secure-endpoint.com',
            };

            const result = await SecurityService.checkNetworkSecurity(config);
            expect(result.isHttps).toBe(true);
        });
    });

    describe('Encryption Settings Validation', () => {
        test('should validate secure storage options', () => {
            const secureOptions = {
                enableEncryption: true,
                encryptionPassword: 'MyStr0ng!P@ssw0rd123',
                keyDerivationIterations: 100000,
                enableSecureDelete: true,
                enableMemoryProtection: true,
            };

            const warnings = SecurityService.validateEncryptionSettings(secureOptions);
            expect(warnings).toHaveLength(0);
        });

        test('should warn about insecure storage options', () => {
            const insecureOptions = {
                enableEncryption: false,
                enableSecureDelete: false,
                enableMemoryProtection: false,
            };

            const warnings = SecurityService.validateEncryptionSettings(insecureOptions);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings.some(w => w.includes('未启用加密存储'))).toBe(true);
        });

        test('should warn about weak passwords', () => {
            const weakPasswordOptions = {
                enableEncryption: true,
                encryptionPassword: 'weak',
                keyDerivationIterations: 100000,
                enableSecureDelete: true,
                enableMemoryProtection: true,
            };

            const warnings = SecurityService.validateEncryptionSettings(weakPasswordOptions);
            expect(warnings.some(w => w.includes('密码强度不足'))).toBe(true);
        });
    });

    describe('Environment Security Check', () => {
        test('should detect development environment', () => {
            // Mock development environment
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const result = SecurityService.checkEnvironmentSecurity();
            expect(result.debugModeEnabled).toBe(true);
            expect(result.isProduction).toBe(false);

            // Restore original environment
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Memory Protection', () => {
        test('should clear sensitive data', () => {
            // Create some warnings with sensitive data
            SecurityService.createWarning(
                'configuration',
                'high',
                'Sensitive Warning',
                'This contains sensitive information'
            );

            SecurityService.clearSensitiveData();

            const warnings = SecurityService.getActiveWarnings();
            expect(warnings[0].message).toBe('[CLEARED]');
        });
    });
});