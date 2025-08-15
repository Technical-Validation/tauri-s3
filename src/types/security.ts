/**
 * Security-related type definitions
 */

export interface SecurityWarning {
    id: string;
    type: 'network' | 'certificate' | 'configuration' | 'environment';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    recommendation?: string;
    timestamp: Date;
    dismissed?: boolean;
}

export interface NetworkSecurityCheck {
    isHttps: boolean;
    certificateValid: boolean;
    certificateExpiry?: Date;
    certificateIssuer?: string;
    tlsVersion?: string;
    cipherSuite?: string;
}

export interface ConfigurationSecurityCheck {
    hasWeakCredentials: boolean;
    credentialsExposed: boolean;
    configurationEncrypted: boolean;
    backupExists: boolean;
    lastSecurityUpdate?: Date;
}

export interface EnvironmentSecurityCheck {
    isProduction: boolean;
    debugModeEnabled: boolean;
    loggingLevel: string;
    sensitiveDataInLogs: boolean;
    networkInterfaces: string[];
}

export interface SecurityReport {
    timestamp: Date;
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    networkSecurity: NetworkSecurityCheck;
    configurationSecurity: ConfigurationSecurityCheck;
    environmentSecurity: EnvironmentSecurityCheck;
    warnings: SecurityWarning[];
    recommendations: string[];
}

export interface SecuritySettings {
    enableSecurityWarnings: boolean;
    enableNetworkChecks: boolean;
    enableCertificateValidation: boolean;
    enableConfigurationChecks: boolean;
    warningDismissalTimeout: number; // in hours
    autoSecurityChecks: boolean;
    securityCheckInterval: number; // in minutes
}

export interface SecureExportOptions {
    includeSensitiveData: boolean;
    encryptExport: boolean;
    exportPassword?: string;
    includeSecurityMetadata: boolean;
}

export interface SecureImportOptions {
    validateSecurity: boolean;
    requireEncryption: boolean;
    importPassword?: string;
    trustUnknownSources: boolean;
}