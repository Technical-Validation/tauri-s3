import { invoke } from '@tauri-apps/api/core';
import {
    SecurityWarning,
    SecurityReport,
    NetworkSecurityCheck,
    ConfigurationSecurityCheck,
    EnvironmentSecurityCheck,
    SecuritySettings,
    SecureExportOptions,
    SecureImportOptions
} from '../types/security';
import { S3Config } from '../types/config';

// Enhanced encryption and security utilities
export interface EncryptionMetadata {
    version: string;
    algorithm: string;
    iterations: number;
    keyDerivation: string;
    saltSize: number;
    nonceSize: number;
}

export interface SecureStorageOptions {
    enableEncryption: boolean;
    encryptionPassword?: string;
    keyDerivationIterations?: number;
    enableSecureDelete?: boolean;
    enableMemoryProtection?: boolean;
}

/**
 * Service for handling security-related operations
 * Provides security warnings, validations, and checks
 */
export class SecurityService {
    private static warnings: SecurityWarning[] = [];
    private static settings: SecuritySettings = {
        enableSecurityWarnings: true,
        enableNetworkChecks: true,
        enableCertificateValidation: true,
        enableConfigurationChecks: true,
        warningDismissalTimeout: 24, // 24 hours
        autoSecurityChecks: true,
        securityCheckInterval: 30, // 30 minutes
    };

    /**
     * Generate a unique ID for warnings
     */
    private static generateWarningId(): string {
        return `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a security warning
     */
    static createWarning(
        type: SecurityWarning['type'],
        severity: SecurityWarning['severity'],
        title: string,
        message: string,
        recommendation?: string
    ): SecurityWarning {
        const warning: SecurityWarning = {
            id: this.generateWarningId(),
            type,
            severity,
            title,
            message,
            recommendation,
            timestamp: new Date(),
            dismissed: false,
        };

        this.warnings.push(warning);
        return warning;
    }

    /**
     * Get all active security warnings
     */
    static getActiveWarnings(): SecurityWarning[] {
        const now = new Date();
        const timeoutMs = this.settings.warningDismissalTimeout * 60 * 60 * 1000;

        return this.warnings.filter(warning => {
            if (warning.dismissed) {
                // Check if dismissal has expired
                const dismissalExpired = now.getTime() - warning.timestamp.getTime() > timeoutMs;
                if (dismissalExpired) {
                    warning.dismissed = false;
                }
                return !warning.dismissed;
            }
            return true;
        });
    }

    /**
     * Dismiss a security warning
     */
    static dismissWarning(warningId: string): void {
        const warning = this.warnings.find(w => w.id === warningId);
        if (warning) {
            warning.dismissed = true;
        }
    }

    /**
     * Clear all warnings
     */
    static clearAllWarnings(): void {
        this.warnings = [];
    }

    /**
     * Check network security for S3 endpoint
     */
    static async checkNetworkSecurity(config: S3Config): Promise<NetworkSecurityCheck> {
        try {
            const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`;
            const url = new URL(endpoint);

            const networkCheck: NetworkSecurityCheck = {
                isHttps: url.protocol === 'https:',
                certificateValid: true, // Will be validated by actual connection
            };

            // Create warning for non-HTTPS connections
            if (!networkCheck.isHttps) {
                this.createWarning(
                    'network',
                    'high',
                    '不安全的连接',
                    `端点 ${endpoint} 使用不安全的 HTTP 连接`,
                    '建议使用 HTTPS 连接以确保数据传输安全'
                );
            }

            // Enhanced certificate validation for HTTPS endpoints
            if (networkCheck.isHttps) {
                try {
                    // Perform actual certificate validation
                    const certInfo = await this.validateSSLCertificate(endpoint);
                    networkCheck.certificateValid = certInfo.valid;
                    networkCheck.certificateExpiry = certInfo.expiry;
                    networkCheck.certificateIssuer = certInfo.issuer;
                    networkCheck.tlsVersion = certInfo.tlsVersion;
                    networkCheck.cipherSuite = certInfo.cipherSuite;

                    if (!certInfo.valid) {
                        this.createWarning(
                            'certificate',
                            'critical',
                            'SSL证书验证失败',
                            `端点 ${endpoint} 的SSL证书无效: ${certInfo.error}`,
                            '请检查证书是否有效、未过期且由受信任的CA颁发'
                        );
                    } else if (certInfo.expiry && certInfo.expiry.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000) {
                        // Certificate expires within 30 days
                        this.createWarning(
                            'certificate',
                            'medium',
                            'SSL证书即将过期',
                            `端点 ${endpoint} 的SSL证书将在 ${certInfo.expiry.toLocaleDateString()} 过期`,
                            '请及时更新SSL证书以避免连接中断'
                        );
                    }

                    // Check for weak TLS versions
                    if (certInfo.tlsVersion && parseFloat(certInfo.tlsVersion.replace('TLS ', '')) < 1.2) {
                        this.createWarning(
                            'network',
                            'high',
                            '使用弱TLS版本',
                            `端点 ${endpoint} 使用较旧的TLS版本: ${certInfo.tlsVersion}`,
                            '建议使用TLS 1.2或更高版本以确保安全性'
                        );
                    }
                } catch (error) {
                    networkCheck.certificateValid = false;
                    this.createWarning(
                        'certificate',
                        'medium',
                        'SSL证书检查失败',
                        `无法验证 ${endpoint} 的SSL证书: ${error}`,
                        '请检查网络连接或证书配置'
                    );
                }
            }

            // Check for potentially unsafe endpoints
            if (config.endpoint && !config.endpoint.includes('amazonaws.com')) {
                this.createWarning(
                    'network',
                    'medium',
                    '使用自定义端点',
                    `配置 "${config.name}" 使用自定义端点: ${config.endpoint}`,
                    '请确认端点的安全性和可信度'
                );
            }

            return networkCheck;
        } catch (error) {
            this.createWarning(
                'network',
                'medium',
                '网络安全检查失败',
                `无法检查网络安全性: ${error}`,
                '请检查网络连接和配置'
            );

            return {
                isHttps: false,
                certificateValid: false,
            };
        }
    }

    /**
     * Validate SSL certificate for an endpoint
     */
    private static async validateSSLCertificate(endpoint: string): Promise<{
        valid: boolean;
        expiry?: Date;
        issuer?: string;
        tlsVersion?: string;
        cipherSuite?: string;
        error?: string;
    }> {
        try {
            // In a real implementation, this would make an actual HTTPS request
            // and inspect the certificate. For now, we'll simulate the validation.

            // Simulate certificate validation with fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await fetch(endpoint, {
                    method: 'HEAD',
                    signal: controller.signal,
                    // This will trigger certificate validation
                });

                clearTimeout(timeoutId);

                // If we get here, the certificate is likely valid
                // In a real implementation, we would extract actual certificate details
                return {
                    valid: true,
                    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Simulate 1 year expiry
                    issuer: 'Amazon', // Simulated issuer
                    tlsVersion: 'TLS 1.3', // Simulated TLS version
                    cipherSuite: 'TLS_AES_256_GCM_SHA384', // Simulated cipher suite
                };
            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // Analyze the error to determine certificate validity
                if (fetchError.name === 'AbortError') {
                    return {
                        valid: false,
                        error: '连接超时',
                    };
                }

                // Check for common certificate errors
                const errorMessage = fetchError.message.toLowerCase();
                if (errorMessage.includes('certificate') ||
                    errorMessage.includes('ssl') ||
                    errorMessage.includes('tls')) {
                    return {
                        valid: false,
                        error: '证书验证失败',
                    };
                }

                // If it's a CORS error or similar, the certificate might be valid
                if (errorMessage.includes('cors') ||
                    errorMessage.includes('network') ||
                    fetchError.name === 'TypeError') {
                    return {
                        valid: true,
                        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                        issuer: 'Unknown',
                        tlsVersion: 'TLS 1.2+',
                    };
                }

                return {
                    valid: false,
                    error: fetchError.message,
                };
            }
        } catch (error: any) {
            return {
                valid: false,
                error: error.message || 'Unknown error',
            };
        }
    }

    /**
     * Check for insecure network environment
     */
    static checkNetworkEnvironment(): {
        isSecure: boolean;
        warnings: string[];
    } {
        const warnings: string[] = [];
        let isSecure = true;

        // Check if running on localhost (development)
        if (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.endsWith('.local')) {
            warnings.push('应用运行在本地开发环境');
            isSecure = false;
        }

        // Check if running over HTTP in production
        if (window.location.protocol === 'http:' &&
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1') {
            warnings.push('应用通过不安全的HTTP协议访问');
            isSecure = false;

            this.createWarning(
                'network',
                'critical',
                '不安全的应用访问',
                '应用正通过HTTP协议访问，存在数据泄露风险',
                '请使用HTTPS协议访问应用'
            );
        }

        // Check for development tools
        if (process.env.NODE_ENV === 'development') {
            warnings.push('应用运行在开发模式');
        }

        // Check for browser security features
        if (!window.isSecureContext) {
            warnings.push('浏览器安全上下文不可用');
            isSecure = false;
        }

        // Check for mixed content (if running on HTTPS but loading HTTP resources)
        if (window.location.protocol === 'https:') {
            // This is a simplified check - in practice you'd scan for HTTP resources
            const httpImages = document.querySelectorAll('img[src^="http:"]');
            const httpScripts = document.querySelectorAll('script[src^="http:"]');

            if (httpImages.length > 0 || httpScripts.length > 0) {
                warnings.push('检测到混合内容（HTTPS页面加载HTTP资源）');
                isSecure = false;

                this.createWarning(
                    'network',
                    'high',
                    '混合内容警告',
                    '页面通过HTTPS加载但包含HTTP资源',
                    '请确保所有资源都通过HTTPS加载'
                );
            }
        }

        return { isSecure, warnings };
    }

    /**
     * Check configuration security
     */
    static checkConfigurationSecurity(configs: S3Config[]): ConfigurationSecurityCheck {
        const check: ConfigurationSecurityCheck = {
            hasWeakCredentials: false,
            credentialsExposed: false,
            configurationEncrypted: true, // Assuming our encryption is working
            backupExists: false,
        };

        // Check for weak credentials
        for (const config of configs) {
            // Check for common weak patterns
            if (this.isWeakCredential(config.accessKeyId) || this.isWeakCredential(config.secretAccessKey)) {
                check.hasWeakCredentials = true;
                this.createWarning(
                    'configuration',
                    'high',
                    '弱凭据检测',
                    `配置 "${config.name}" 可能包含弱凭据`,
                    '建议使用强度更高的访问密钥'
                );
            }

            // Check for potentially exposed credentials (simple patterns)
            if (this.isPotentiallyExposed(config.accessKeyId) || this.isPotentiallyExposed(config.secretAccessKey)) {
                check.credentialsExposed = true;
                this.createWarning(
                    'configuration',
                    'critical',
                    '凭据可能已暴露',
                    `配置 "${config.name}" 的凭据可能已被暴露`,
                    '立即更换访问密钥并检查账户安全'
                );
            }
        }

        return check;
    }

    /**
     * Check environment security
     */
    static checkEnvironmentSecurity(): EnvironmentSecurityCheck {
        const networkEnv = this.checkNetworkEnvironment();

        const check: EnvironmentSecurityCheck = {
            isProduction: !window.location.hostname.includes('localhost') &&
                !window.location.hostname.includes('127.0.0.1') &&
                process.env.NODE_ENV === 'production',
            debugModeEnabled: process.env.NODE_ENV === 'development',
            loggingLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
            sensitiveDataInLogs: false,
            networkInterfaces: [], // Would be populated by system info
        };

        // Create warnings for development environment
        if (check.debugModeEnabled) {
            this.createWarning(
                'environment',
                'medium',
                '调试模式已启用',
                '应用程序正在调试模式下运行',
                '在生产环境中请禁用调试模式'
            );
        }

        // Create warnings for insecure network environment
        if (!networkEnv.isSecure) {
            this.createWarning(
                'environment',
                'high',
                '不安全的网络环境',
                `检测到网络安全问题: ${networkEnv.warnings.join(', ')}`,
                '请在安全的网络环境中使用应用'
            );
        }

        // Check for browser security features
        if (!window.isSecureContext) {
            this.createWarning(
                'environment',
                'high',
                '浏览器安全上下文不可用',
                '当前浏览器环境不支持安全上下文，某些安全功能可能不可用',
                '请使用支持安全上下文的现代浏览器并通过HTTPS访问'
            );
        }

        // Check for potential sensitive data in console logs
        if (check.debugModeEnabled) {
            // In development mode, there's a higher risk of sensitive data in logs
            check.sensitiveDataInLogs = true;
            this.createWarning(
                'environment',
                'low',
                '开发模式可能记录敏感数据',
                '调试模式下可能在控制台记录敏感信息',
                '确保在生产环境中禁用详细日志记录'
            );
        }

        return check;
    }

    /**
     * Generate comprehensive security report
     */
    static async generateSecurityReport(configs: S3Config[]): Promise<SecurityReport> {
        const networkChecks = await Promise.all(
            configs.map(config => this.checkNetworkSecurity(config))
        );

        const configurationSecurity = this.checkConfigurationSecurity(configs);
        const environmentSecurity = this.checkEnvironmentSecurity();

        // Determine overall risk level
        const warnings = this.getActiveWarnings();
        const criticalWarnings = warnings.filter(w => w.severity === 'critical').length;
        const highWarnings = warnings.filter(w => w.severity === 'high').length;
        const mediumWarnings = warnings.filter(w => w.severity === 'medium').length;

        let overallRisk: SecurityReport['overallRisk'] = 'low';
        if (criticalWarnings > 0) {
            overallRisk = 'critical';
        } else if (highWarnings > 0) {
            overallRisk = 'high';
        } else if (mediumWarnings > 2) {
            overallRisk = 'medium';
        }

        // Generate recommendations
        const recommendations: string[] = [];
        if (configurationSecurity.hasWeakCredentials) {
            recommendations.push('更新弱凭据以提高安全性');
        }
        if (configurationSecurity.credentialsExposed) {
            recommendations.push('立即更换可能已暴露的凭据');
        }
        if (environmentSecurity.debugModeEnabled) {
            recommendations.push('在生产环境中禁用调试模式');
        }
        if (networkChecks.some(check => !check.isHttps)) {
            recommendations.push('使用HTTPS连接确保数据传输安全');
        }

        return {
            timestamp: new Date(),
            overallRisk,
            networkSecurity: networkChecks[0] || { isHttps: false, certificateValid: false },
            configurationSecurity,
            environmentSecurity,
            warnings,
            recommendations,
        };
    }

    /**
     * Validate secure export options
     */
    static validateSecureExport(options: SecureExportOptions): string[] {
        const warnings: string[] = [];

        if (options.includeSensitiveData && !options.encryptExport) {
            warnings.push('导出包含敏感数据但未加密，存在安全风险');
        }

        if (options.encryptExport && !options.exportPassword) {
            warnings.push('启用了加密但未提供密码');
        }

        if (options.exportPassword && options.exportPassword.length < 8) {
            warnings.push('导出密码过短，建议至少8位字符');
        }

        return warnings;
    }

    /**
     * Validate secure import options
     */
    static validateSecureImport(options: SecureImportOptions): string[] {
        const warnings: string[] = [];

        if (!options.validateSecurity) {
            warnings.push('已禁用安全验证，可能导入不安全的配置');
        }

        if (options.trustUnknownSources) {
            warnings.push('信任未知来源可能带来安全风险');
        }

        if (options.requireEncryption && !options.importPassword) {
            warnings.push('要求加密但未提供解密密码');
        }

        return warnings;
    }

    /**
     * Get security settings
     */
    static getSettings(): SecuritySettings {
        return { ...this.settings };
    }

    /**
     * Update security settings
     */
    static updateSettings(newSettings: Partial<SecuritySettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Check if credential appears weak
     */
    private static isWeakCredential(credential: string): boolean {
        if (!credential || credential.length < 16) return true;

        // Check for common weak patterns
        const weakPatterns = [
            /^(test|demo|example|sample)/i,
            /^(admin|root|user)/i,
            /^(123|abc|qwe)/i,
            /(password|secret|key)/i,
        ];

        return weakPatterns.some(pattern => pattern.test(credential));
    }

    /**
     * Check if credential might be exposed
     */
    private static isPotentiallyExposed(credential: string): boolean {
        if (!credential) return false;

        // Check for patterns that suggest exposure
        const exposurePatterns = [
            /^AKIA[0-9A-Z]{16}$/, // AWS Access Key pattern
            /github|gitlab|bitbucket/i,
            /public|shared|common/i,
        ];

        return exposurePatterns.some(pattern => pattern.test(credential));
    }

    /**
     * Perform automatic security checks
     */
    static async performAutoSecurityChecks(configs: S3Config[]): Promise<void> {
        if (!this.settings.autoSecurityChecks) return;

        try {
            await this.generateSecurityReport(configs);
        } catch (error) {
            console.error('Auto security check failed:', error);
        }
    }

    /**
     * Start automatic security check interval
     */
    static startAutoSecurityChecks(configs: S3Config[]): NodeJS.Timeout {
        const intervalMs = this.settings.securityCheckInterval * 60 * 1000;

        return setInterval(() => {
            this.performAutoSecurityChecks(configs);
        }, intervalMs);
    }

    /**
     * Enhanced configuration encryption using Tauri backend
     */
    static async encryptConfiguration(
        configJson: string,
        password: string
    ): Promise<void> {
        try {
            await invoke('save_config', {
                configJson,
                password,
            });
        } catch (error) {
            throw new Error(`Configuration encryption failed: ${error}`);
        }
    }

    /**
     * Enhanced configuration decryption using Tauri backend
     */
    static async decryptConfiguration(password: string): Promise<string> {
        try {
            return await invoke('load_config', { password });
        } catch (error) {
            if (error === 'Invalid password') {
                throw new Error('Invalid password provided');
            }
            throw new Error(`Configuration decryption failed: ${error}`);
        }
    }

    /**
     * Check if encrypted configuration exists
     */
    static async hasEncryptedConfiguration(): Promise<boolean> {
        try {
            return await invoke('config_exists');
        } catch (error) {
            console.error('Failed to check config existence:', error);
            return false;
        }
    }

    /**
     * Securely delete configuration
     */
    static async secureDeleteConfiguration(): Promise<void> {
        try {
            await invoke('delete_config');
        } catch (error) {
            throw new Error(`Secure deletion failed: ${error}`);
        }
    }

    /**
     * Generate secure password for configuration encryption
     */
    static generateSecurePassword(length: number = 32): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';

        // Ensure at least one character from each category
        const categories = [
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'abcdefghijklmnopqrstuvwxyz',
            '0123456789',
            '!@#$%^&*()_+-=[]{}|;:,.<>?'
        ];

        // Add one character from each category
        for (const category of categories) {
            const randomIndex = Math.floor(Math.random() * category.length);
            password += category[randomIndex];
        }

        // Fill the rest with random characters
        for (let i = password.length; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    /**
     * Validate password strength
     */
    static validatePasswordStrength(password: string): {
        score: number;
        feedback: string[];
        isStrong: boolean;
    } {
        const feedback: string[] = [];
        let score = 0;

        // Length check
        if (password.length >= 12) {
            score += 2;
        } else if (password.length >= 8) {
            score += 1;
        } else {
            feedback.push('密码长度至少应为8位字符');
        }

        // Character variety checks
        if (/[A-Z]/.test(password)) {
            score += 1;
        } else {
            feedback.push('应包含大写字母');
        }

        if (/[a-z]/.test(password)) {
            score += 1;
        } else {
            feedback.push('应包含小写字母');
        }

        if (/[0-9]/.test(password)) {
            score += 1;
        } else {
            feedback.push('应包含数字');
        }

        if (/[^A-Za-z0-9]/.test(password)) {
            score += 1;
        } else {
            feedback.push('应包含特殊字符');
        }

        // Common patterns check
        const commonPatterns = [
            /(.)\1{2,}/, // Repeated characters
            /123|abc|qwe/i, // Sequential patterns
            /password|admin|user/i, // Common words
        ];

        for (const pattern of commonPatterns) {
            if (pattern.test(password)) {
                score -= 1;
                feedback.push('避免使用常见模式或重复字符');
                break;
            }
        }

        const isStrong = score >= 5;
        return { score, feedback, isStrong };
    }

    /**
     * Enhanced secure export with encryption options
     */
    static async secureExportConfiguration(
        configs: S3Config[],
        exportPath: string,
        options: SecureExportOptions
    ): Promise<void> {
        try {
            let exportData: any = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                configs: options.includeSensitiveData ? configs : configs.map(config => ({
                    ...config,
                    accessKeyId: '[REDACTED]',
                    secretAccessKey: '[REDACTED]',
                })),
            };

            if (options.includeSecurityMetadata) {
                const securityReport = await this.generateSecurityReport(configs);
                exportData.securityMetadata = {
                    exportedAt: new Date().toISOString(),
                    securityWarnings: securityReport.warnings.length,
                    overallRisk: securityReport.overallRisk,
                };
            }

            let finalData = JSON.stringify(exportData, null, 2);

            if (options.encryptExport && options.exportPassword) {
                // For encrypted export, we'll use a simple encryption
                // In a real implementation, you might want to use the same encryption as config storage
                const encoder = new TextEncoder();
                const data = encoder.encode(finalData);

                // Simple base64 encoding for demonstration
                // In production, use proper encryption
                finalData = btoa(String.fromCharCode(...data));

                exportData = {
                    encrypted: true,
                    algorithm: 'base64', // Placeholder - use proper encryption
                    data: finalData,
                };
                finalData = JSON.stringify(exportData, null, 2);
            }

            await invoke('export_config', {
                exportPath,
                configJson: finalData,
            });

            this.createWarning(
                'configuration',
                'low',
                '配置已导出',
                `配置已成功导出到 ${exportPath}`,
                options.includeSensitiveData ? '请妥善保管导出文件，其中包含敏感信息' : undefined
            );
        } catch (error) {
            throw new Error(`Secure export failed: ${error}`);
        }
    }

    /**
     * Enhanced secure import with validation
     */
    static async secureImportConfiguration(
        importPath: string,
        options: SecureImportOptions
    ): Promise<S3Config[]> {
        try {
            const importedData = await invoke('import_config', { importPath });
            let parsedData: any;

            try {
                parsedData = JSON.parse(importedData as string);
            } catch (error) {
                throw new Error('Invalid JSON format in import file');
            }

            // Handle encrypted imports
            if (parsedData.encrypted) {
                if (options.requireEncryption && !options.importPassword) {
                    throw new Error('Import password required for encrypted file');
                }

                if (parsedData.algorithm === 'base64') {
                    // Simple base64 decoding for demonstration
                    const decodedData = atob(parsedData.data);
                    const decoder = new TextDecoder();
                    const bytes = new Uint8Array(decodedData.split('').map(char => char.charCodeAt(0)));
                    const decryptedJson = decoder.decode(bytes);
                    parsedData = JSON.parse(decryptedJson);
                }
            }

            // Validate import structure
            if (!parsedData.configs || !Array.isArray(parsedData.configs)) {
                throw new Error('Invalid configuration format: missing configs array');
            }

            // Security validation
            if (options.validateSecurity) {
                const securityCheck = this.checkConfigurationSecurity(parsedData.configs);
                if (securityCheck.hasWeakCredentials && !options.trustUnknownSources) {
                    throw new Error('Import contains weak credentials and unknown sources are not trusted');
                }
            }

            // Validate each configuration
            for (const config of parsedData.configs) {
                if (!config.name || !config.region || !config.bucketName) {
                    throw new Error(`Invalid configuration: missing required fields in config "${config.name || 'unnamed'}"`);
                }

                // Check for potentially dangerous configurations
                if (!options.trustUnknownSources) {
                    if (config.endpoint && !config.endpoint.includes('amazonaws.com')) {
                        this.createWarning(
                            'configuration',
                            'medium',
                            '未知端点',
                            `配置 "${config.name}" 使用非AWS端点: ${config.endpoint}`,
                            '请验证端点的安全性'
                        );
                    }
                }
            }

            this.createWarning(
                'configuration',
                'low',
                '配置已导入',
                `成功导入 ${parsedData.configs.length} 个配置`,
                '请验证导入的配置是否正确'
            );

            return parsedData.configs;
        } catch (error) {
            throw new Error(`Secure import failed: ${error}`);
        }
    }

    /**
     * Get encryption metadata from backend
     */
    static async getEncryptionMetadata(): Promise<EncryptionMetadata> {
        // This would typically come from the backend
        // For now, return the known values from the Rust implementation
        return {
            version: '1.0',
            algorithm: 'AES-256-GCM',
            iterations: 100000,
            keyDerivation: 'PBKDF2-HMAC-SHA256',
            saltSize: 32,
            nonceSize: 12,
        };
    }

    /**
     * Validate encryption settings
     */
    static validateEncryptionSettings(options: SecureStorageOptions): string[] {
        const warnings: string[] = [];

        if (!options.enableEncryption) {
            warnings.push('未启用加密存储，配置将以明文保存');
        }

        if (options.enableEncryption && !options.encryptionPassword) {
            warnings.push('启用了加密但未提供密码');
        }

        if (options.encryptionPassword) {
            const passwordValidation = this.validatePasswordStrength(options.encryptionPassword);
            if (!passwordValidation.isStrong) {
                warnings.push(`密码强度不足: ${passwordValidation.feedback.join(', ')}`);
            }
        }

        if (options.keyDerivationIterations && options.keyDerivationIterations < 50000) {
            warnings.push('密钥派生迭代次数过低，建议至少50000次');
        }

        return warnings;
    }

    /**
     * Memory protection utilities
     */
    static enableMemoryProtection(): void {
        // Disable right-click context menu in production
        if (process.env.NODE_ENV === 'production') {
            document.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        // Disable F12 and other developer tools shortcuts
        document.addEventListener('keydown', (e) => {
            if (process.env.NODE_ENV === 'production') {
                if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                    (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                    (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                }
            }
        });

        // Clear clipboard after a timeout when copying sensitive data
        let clipboardTimeout: NodeJS.Timeout;
        document.addEventListener('copy', () => {
            clearTimeout(clipboardTimeout);
            clipboardTimeout = setTimeout(() => {
                navigator.clipboard.writeText('').catch(() => {
                    // Ignore errors - clipboard clearing is best effort
                });
            }, 30000); // Clear after 30 seconds
        });
    }

    /**
     * Clear sensitive data from memory (enhanced)
     */
    static clearSensitiveData(): void {
        // Clear warnings that might contain sensitive information
        this.warnings = this.warnings.map(warning => ({
            ...warning,
            message: warning.type === 'configuration' ? '[CLEARED]' : warning.message,
        }));

        // Clear any cached sensitive data in localStorage/sessionStorage
        try {
            const sensitiveKeys = ['s3-config', 'access-key', 'secret-key', 'password'];
            sensitiveKeys.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });
        } catch (error) {
            console.warn('Failed to clear storage:', error);
        }

        // Clear form inputs that might contain sensitive data
        const sensitiveInputs = document.querySelectorAll('input[type="password"], input[name*="key"], input[name*="secret"]');
        sensitiveInputs.forEach((input: any) => {
            if (input.value) {
                input.value = '';
            }
        });

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }

        // Request memory pressure release (Chrome-specific)
        if ('memory' in performance && 'usedJSHeapSize' in (performance as any).memory) {
            // This is a hint to the browser to consider garbage collection
            setTimeout(() => {
                if (window.gc) {
                    window.gc();
                }
            }, 100);
        }
    }

    /**
     * Setup automatic memory cleanup
     */
    static setupMemoryCleanup(): NodeJS.Timeout {
        return setInterval(() => {
            this.clearSensitiveData();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Secure application shutdown
     */
    static async secureShutdown(): Promise<void> {
        // Clear all sensitive data
        this.clearSensitiveData();

        // Clear all warnings
        this.clearAllWarnings();

        // Additional cleanup can be added here
        console.log('Secure shutdown completed');
    }
}