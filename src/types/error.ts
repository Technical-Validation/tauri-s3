// Base error types
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'authentication' | 'authorization' | 'validation' | 'file_system' | 's3' | 'configuration' | 'unknown';

// Base error interface
export interface BaseError {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: Date;
    context?: Record<string, any>;
    stack?: string;
}

// User-friendly error interface
export interface UserFriendlyError {
    title: string;
    message: string;
    actionable: boolean;
    retryable: boolean;
    suggestions?: string[];
    helpUrl?: string;
}

// S3 specific errors
export interface S3Error extends BaseError {
    category: 's3';
    statusCode?: number;
    requestId?: string;
    resource?: string;
    operation?: string;
}

// Network errors
export interface NetworkError extends BaseError {
    category: 'network';
    statusCode?: number;
    timeout?: boolean;
    offline?: boolean;
    dns?: boolean;
}

// Authentication errors
export interface AuthenticationError extends BaseError {
    category: 'authentication';
    credentialsExpired?: boolean;
    invalidCredentials?: boolean;
    missingCredentials?: boolean;
}

// Authorization errors
export interface AuthorizationError extends BaseError {
    category: 'authorization';
    requiredPermissions?: string[];
    resource?: string;
    action?: string;
}

// File system errors
export interface FileSystemError extends BaseError {
    category: 'file_system';
    path?: string;
    operation?: 'read' | 'write' | 'delete' | 'create' | 'move' | 'copy';
    diskSpace?: boolean;
    permissions?: boolean;
}

// Configuration errors
export interface ConfigurationError extends BaseError {
    category: 'configuration';
    field?: string;
    validationErrors?: string[];
    missingFields?: string[];
}

// Validation errors
export interface ValidationError extends BaseError {
    category: 'validation';
    field: string;
    value?: any;
    constraint?: string;
    validationRule?: string;
}

// Error handler interface
export interface ErrorHandler {
    // Error transformation
    handleS3Error: (error: any) => S3Error;
    handleNetworkError: (error: any) => NetworkError;
    handleFileSystemError: (error: any) => FileSystemError;
    handleAuthenticationError: (error: any) => AuthenticationError;
    handleAuthorizationError: (error: any) => AuthorizationError;
    handleConfigurationError: (error: any) => ConfigurationError;
    handleValidationError: (error: any) => ValidationError;

    // User-friendly error conversion
    toUserFriendlyError: (error: BaseError) => UserFriendlyError;

    // Error display and logging
    showErrorToast: (error: UserFriendlyError) => void;
    showErrorModal: (error: UserFriendlyError) => void;
    logError: (error: BaseError, context?: string) => void;

    // Error recovery
    canRetry: (error: BaseError) => boolean;
    getSuggestions: (error: BaseError) => string[];
    getHelpUrl: (error: BaseError) => string | null;
}

// Retry configuration
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffFactor: number;
    retryableErrors: ErrorCategory[];
}

// Error boundary state
export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: any;
    errorId: string;
}

// Error reporting
export interface ErrorReport {
    id: string;
    error: BaseError;
    userAgent: string;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    additionalContext?: Record<string, any>;
}

// Common error codes
export const ERROR_CODES = {
    // Network errors
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    NETWORK_OFFLINE: 'NETWORK_OFFLINE',
    NETWORK_DNS_FAILURE: 'NETWORK_DNS_FAILURE',
    NETWORK_CONNECTION_REFUSED: 'NETWORK_CONNECTION_REFUSED',

    // S3 errors
    S3_ACCESS_DENIED: 'S3_ACCESS_DENIED',
    S3_BUCKET_NOT_FOUND: 'S3_BUCKET_NOT_FOUND',
    S3_OBJECT_NOT_FOUND: 'S3_OBJECT_NOT_FOUND',
    S3_INVALID_CREDENTIALS: 'S3_INVALID_CREDENTIALS',
    S3_QUOTA_EXCEEDED: 'S3_QUOTA_EXCEEDED',
    S3_INVALID_BUCKET_NAME: 'S3_INVALID_BUCKET_NAME',

    // File system errors
    FS_FILE_NOT_FOUND: 'FS_FILE_NOT_FOUND',
    FS_PERMISSION_DENIED: 'FS_PERMISSION_DENIED',
    FS_DISK_FULL: 'FS_DISK_FULL',
    FS_PATH_TOO_LONG: 'FS_PATH_TOO_LONG',
    FS_INVALID_PATH: 'FS_INVALID_PATH',

    // Configuration errors
    CONFIG_INVALID_FORMAT: 'CONFIG_INVALID_FORMAT',
    CONFIG_MISSING_FIELD: 'CONFIG_MISSING_FIELD',
    CONFIG_INVALID_VALUE: 'CONFIG_INVALID_VALUE',
    CONFIG_ENCRYPTION_FAILED: 'CONFIG_ENCRYPTION_FAILED',
    CONFIG_DECRYPTION_FAILED: 'CONFIG_DECRYPTION_FAILED',

    // Validation errors
    VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
    VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
    VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
    VALIDATION_FILE_TOO_LARGE: 'VALIDATION_FILE_TOO_LARGE',
    VALIDATION_INVALID_FILE_TYPE: 'VALIDATION_INVALID_FILE_TYPE',

    // Upload errors
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    UPLOAD_CANCELLED: 'UPLOAD_CANCELLED',
    UPLOAD_FILE_CHANGED: 'UPLOAD_FILE_CHANGED',
    UPLOAD_MULTIPART_FAILED: 'UPLOAD_MULTIPART_FAILED',

    // Download errors
    DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
    DOWNLOAD_CANCELLED: 'DOWNLOAD_CANCELLED',
    DOWNLOAD_INSUFFICIENT_SPACE: 'DOWNLOAD_INSUFFICIENT_SPACE',

    // Generic errors
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    OPERATION_CANCELLED: 'OPERATION_CANCELLED',
    OPERATION_TIMEOUT: 'OPERATION_TIMEOUT'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];