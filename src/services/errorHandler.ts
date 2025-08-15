import {
    BaseError,
    S3Error,
    NetworkError,
    FileSystemError,
    AuthenticationError,
    AuthorizationError,
    ConfigurationError,
    ValidationError,
    UserFriendlyError,
    ErrorHandler as IErrorHandler,
    RetryConfig,
    ErrorCategory,
    ErrorSeverity,
    ERROR_CODES,
    ErrorCode
} from '../types/error';

// AWS SDK error types
interface AWSError {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
    requestId?: string;
    retryable?: boolean;
    time?: Date;
    region?: string;
    hostname?: string;
    retryDelay?: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    retryableErrors: ['network', 's3', 'file_system']
};

/**
 * Error Handler Service
 * Handles error transformation, user-friendly messaging, and retry logic
 */
export class ErrorHandler implements IErrorHandler {
    private retryConfig: RetryConfig;

    constructor(retryConfig: Partial<RetryConfig> = {}) {
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    }

    /**
     * Handle S3-specific errors
     */
    public handleS3Error(error: any): S3Error {
        const awsError = error as AWSError;
        const timestamp = new Date();

        // Determine error code based on AWS error
        let code: ErrorCode = ERROR_CODES.UNKNOWN_ERROR;
        let severity: ErrorSeverity = 'medium';

        if (awsError.name || awsError.code) {
            const errorName = awsError.name || awsError.code || '';

            switch (errorName) {
                case 'AccessDenied':
                case 'Forbidden':
                    code = ERROR_CODES.S3_ACCESS_DENIED;
                    severity = 'high';
                    break;
                case 'NoSuchBucket':
                    code = ERROR_CODES.S3_BUCKET_NOT_FOUND;
                    severity = 'high';
                    break;
                case 'NoSuchKey':
                    code = ERROR_CODES.S3_OBJECT_NOT_FOUND;
                    severity = 'medium';
                    break;
                case 'InvalidAccessKeyId':
                case 'SignatureDoesNotMatch':
                case 'TokenRefreshRequired':
                    code = ERROR_CODES.S3_INVALID_CREDENTIALS;
                    severity = 'critical';
                    break;
                case 'QuotaExceeded':
                case 'ServiceQuotaExceeded':
                    code = ERROR_CODES.S3_QUOTA_EXCEEDED;
                    severity = 'high';
                    break;
                case 'InvalidBucketName':
                    code = ERROR_CODES.S3_INVALID_BUCKET_NAME;
                    severity = 'high';
                    break;
                default:
                    if (awsError.statusCode) {
                        if (awsError.statusCode >= 500) {
                            severity = 'high';
                        } else if (awsError.statusCode >= 400) {
                            severity = 'medium';
                        }
                    }
                    break;
            }
        }

        return {
            code,
            message: awsError.message || 'An S3 error occurred',
            category: 's3',
            severity,
            timestamp,
            statusCode: awsError.statusCode,
            requestId: awsError.requestId,
            context: {
                awsErrorName: awsError.name,
                awsErrorCode: awsError.code,
                region: awsError.region,
                hostname: awsError.hostname,
                retryable: awsError.retryable
            },
            stack: error.stack
        };
    }

    /**
     * Handle network-related errors
     */
    public handleNetworkError(error: any): NetworkError {
        const timestamp = new Date();
        let code: ErrorCode = ERROR_CODES.UNKNOWN_ERROR;
        let severity: ErrorSeverity = 'medium';
        let timeout = false;
        let offline = false;
        let dns = false;

        const message = error.message || error.toString() || 'Network error occurred';

        // Analyze error message and properties
        if (message.includes('timeout') || error.code === 'ETIMEDOUT') {
            code = ERROR_CODES.NETWORK_TIMEOUT;
            timeout = true;
            severity = 'medium';
        } else if (message.includes('offline') || !navigator.onLine) {
            code = ERROR_CODES.NETWORK_OFFLINE;
            offline = true;
            severity = 'high';
        } else if (message.includes('ENOTFOUND') || message.includes('DNS')) {
            code = ERROR_CODES.NETWORK_DNS_FAILURE;
            dns = true;
            severity = 'high';
        } else if (message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
            code = ERROR_CODES.NETWORK_CONNECTION_REFUSED;
            severity = 'high';
        }

        return {
            code,
            message,
            category: 'network',
            severity,
            timestamp,
            statusCode: error.status || error.statusCode,
            timeout,
            offline,
            dns,
            context: {
                errorCode: error.code,
                errno: error.errno,
                syscall: error.syscall,
                hostname: error.hostname,
                port: error.port
            },
            stack: error.stack
        };
    }

    /**
     * Handle file system errors
     */
    public handleFileSystemError(error: any): FileSystemError {
        const timestamp = new Date();
        let code: ErrorCode = ERROR_CODES.UNKNOWN_ERROR;
        let severity: ErrorSeverity = 'medium';
        let diskSpace = false;
        let permissions = false;

        const message = error.message || error.toString() || 'File system error occurred';

        // Analyze error based on common file system error patterns
        if (message.includes('ENOENT') || message.includes('not found')) {
            code = ERROR_CODES.FS_FILE_NOT_FOUND;
            severity = 'medium';
        } else if (message.includes('EACCES') || message.includes('permission denied')) {
            code = ERROR_CODES.FS_PERMISSION_DENIED;
            permissions = true;
            severity = 'high';
        } else if (message.includes('ENOSPC') || message.includes('no space left')) {
            code = ERROR_CODES.FS_DISK_FULL;
            diskSpace = true;
            severity = 'critical';
        } else if (message.includes('ENAMETOOLONG') || message.includes('path too long')) {
            code = ERROR_CODES.FS_PATH_TOO_LONG;
            severity = 'medium';
        } else if (message.includes('EINVAL') || message.includes('invalid')) {
            code = ERROR_CODES.FS_INVALID_PATH;
            severity = 'medium';
        }

        return {
            code,
            message,
            category: 'file_system',
            severity,
            timestamp,
            path: error.path,
            operation: error.operation,
            diskSpace,
            permissions,
            context: {
                errorCode: error.code,
                errno: error.errno,
                syscall: error.syscall
            },
            stack: error.stack
        };
    }

    /**
     * Handle authentication errors
     */
    public handleAuthenticationError(error: any): AuthenticationError {
        const timestamp = new Date();
        let code: ErrorCode = ERROR_CODES.S3_INVALID_CREDENTIALS;
        const severity: ErrorSeverity = 'critical';

        const message = error.message || 'Authentication failed';

        return {
            code,
            message,
            category: 'authentication',
            severity,
            timestamp,
            credentialsExpired: message.includes('expired'),
            invalidCredentials: message.includes('invalid') || message.includes('denied'),
            missingCredentials: message.includes('missing') || message.includes('required'),
            context: {
                originalError: error
            },
            stack: error.stack
        };
    }

    /**
     * Handle authorization errors
     */
    public handleAuthorizationError(error: any): AuthorizationError {
        const timestamp = new Date();
        const code: ErrorCode = ERROR_CODES.S3_ACCESS_DENIED;
        const severity: ErrorSeverity = 'high';

        const message = error.message || 'Access denied';

        return {
            code,
            message,
            category: 'authorization',
            severity,
            timestamp,
            resource: error.resource,
            action: error.action,
            requiredPermissions: error.requiredPermissions,
            context: {
                originalError: error
            },
            stack: error.stack
        };
    }

    /**
     * Handle configuration errors
     */
    public handleConfigurationError(error: any): ConfigurationError {
        const timestamp = new Date();
        let code: ErrorCode = ERROR_CODES.CONFIG_INVALID_FORMAT;
        const severity: ErrorSeverity = 'high';

        const message = error.message || 'Configuration error';

        if (message.includes('missing')) {
            code = ERROR_CODES.CONFIG_MISSING_FIELD;
        } else if (message.includes('invalid')) {
            code = ERROR_CODES.CONFIG_INVALID_VALUE;
        } else if (message.includes('encrypt')) {
            code = ERROR_CODES.CONFIG_ENCRYPTION_FAILED;
        } else if (message.includes('decrypt')) {
            code = ERROR_CODES.CONFIG_DECRYPTION_FAILED;
        }

        return {
            code,
            message,
            category: 'configuration',
            severity,
            timestamp,
            field: error.field,
            validationErrors: error.validationErrors,
            missingFields: error.missingFields,
            context: {
                originalError: error
            },
            stack: error.stack
        };
    }

    /**
     * Handle validation errors
     */
    public handleValidationError(error: any): ValidationError {
        const timestamp = new Date();
        let code: ErrorCode = ERROR_CODES.VALIDATION_INVALID_FORMAT;
        const severity: ErrorSeverity = 'medium';

        const message = error.message || 'Validation failed';

        if (message.includes('required')) {
            code = ERROR_CODES.VALIDATION_REQUIRED_FIELD;
        } else if (message.includes('format')) {
            code = ERROR_CODES.VALIDATION_INVALID_FORMAT;
        } else if (message.includes('range') || message.includes('size')) {
            code = ERROR_CODES.VALIDATION_OUT_OF_RANGE;
        } else if (message.includes('too large')) {
            code = ERROR_CODES.VALIDATION_FILE_TOO_LARGE;
        } else if (message.includes('file type')) {
            code = ERROR_CODES.VALIDATION_INVALID_FILE_TYPE;
        }

        return {
            code,
            message,
            category: 'validation',
            severity,
            timestamp,
            field: error.field || 'unknown',
            value: error.value,
            constraint: error.constraint,
            validationRule: error.validationRule,
            context: {
                originalError: error
            },
            stack: error.stack
        };
    }

    /**
     * Convert any error to a user-friendly format
     */
    public toUserFriendlyError(error: BaseError): UserFriendlyError {
        const suggestions = this.getSuggestions(error);
        const retryable = this.canRetry(error);
        const helpUrl = this.getHelpUrl(error);

        // Generate user-friendly title and message based on error code
        let title = 'Error';
        let message = error.message;
        let actionable = true;

        switch (error.code) {
            case ERROR_CODES.NETWORK_TIMEOUT:
                title = 'Connection Timeout';
                message = 'The request timed out. Please check your internet connection and try again.';
                break;

            case ERROR_CODES.NETWORK_OFFLINE:
                title = 'No Internet Connection';
                message = 'You appear to be offline. Please check your internet connection.';
                break;

            case ERROR_CODES.NETWORK_DNS_FAILURE:
                title = 'DNS Resolution Failed';
                message = 'Unable to resolve the server address. Please check your DNS settings.';
                break;

            case ERROR_CODES.S3_ACCESS_DENIED:
                title = 'Access Denied';
                message = 'You don\'t have permission to perform this operation. Please check your credentials and permissions.';
                break;

            case ERROR_CODES.S3_BUCKET_NOT_FOUND:
                title = 'Bucket Not Found';
                message = 'The specified S3 bucket does not exist or you don\'t have access to it.';
                break;

            case ERROR_CODES.S3_OBJECT_NOT_FOUND:
                title = 'File Not Found';
                message = 'The requested file does not exist in the S3 bucket.';
                break;

            case ERROR_CODES.S3_INVALID_CREDENTIALS:
                title = 'Invalid Credentials';
                message = 'Your AWS credentials are invalid or have expired. Please update your configuration.';
                break;

            case ERROR_CODES.S3_QUOTA_EXCEEDED:
                title = 'Storage Quota Exceeded';
                message = 'You have exceeded your storage quota. Please free up space or upgrade your plan.';
                break;

            case ERROR_CODES.FS_FILE_NOT_FOUND:
                title = 'File Not Found';
                message = 'The specified file could not be found on your system.';
                break;

            case ERROR_CODES.FS_PERMISSION_DENIED:
                title = 'Permission Denied';
                message = 'You don\'t have permission to access this file or directory.';
                break;

            case ERROR_CODES.FS_DISK_FULL:
                title = 'Disk Full';
                message = 'There is not enough space on your disk to complete this operation.';
                actionable = false;
                break;

            case ERROR_CODES.CONFIG_INVALID_FORMAT:
                title = 'Invalid Configuration';
                message = 'The configuration file format is invalid. Please check the file and try again.';
                break;

            case ERROR_CODES.CONFIG_MISSING_FIELD:
                title = 'Missing Configuration';
                message = 'Required configuration fields are missing. Please complete your configuration.';
                break;

            case ERROR_CODES.VALIDATION_REQUIRED_FIELD:
                title = 'Required Field Missing';
                message = 'Please fill in all required fields.';
                break;

            case ERROR_CODES.VALIDATION_FILE_TOO_LARGE:
                title = 'File Too Large';
                message = 'The selected file is too large. Please choose a smaller file.';
                break;

            case ERROR_CODES.UPLOAD_FAILED:
                title = 'Upload Failed';
                message = 'The file upload failed. Please try again.';
                break;

            case ERROR_CODES.DOWNLOAD_FAILED:
                title = 'Download Failed';
                message = 'The file download failed. Please try again.';
                break;

            default:
                title = 'Unexpected Error';
                message = error.message || 'An unexpected error occurred. Please try again.';
                break;
        }

        return {
            title,
            message,
            actionable,
            retryable,
            suggestions,
            helpUrl
        };
    }

    /**
     * Show error toast notification
     */
    public showErrorToast(error: UserFriendlyError): void {
        // This would integrate with your toast notification system
        console.error('Error Toast:', error);

        // Example implementation - you would replace this with your actual toast system
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('show-error-toast', {
                detail: error
            }));
        }
    }

    /**
     * Show error modal dialog
     */
    public showErrorModal(error: UserFriendlyError): void {
        // This would integrate with your modal system
        console.error('Error Modal:', error);

        // Example implementation - you would replace this with your actual modal system
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('show-error-modal', {
                detail: error
            }));
        }
    }

    /**
     * Log error for debugging and monitoring
     */
    public logError(error: BaseError, context?: string): void {
        const logEntry = {
            timestamp: error.timestamp,
            code: error.code,
            category: error.category,
            severity: error.severity,
            message: error.message,
            context: context || 'unknown',
            errorContext: error.context,
            stack: error.stack
        };

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error Log:', logEntry);
        }

        // In production, you might want to send this to a logging service
        // Example: sendToLoggingService(logEntry);
    }

    /**
     * Determine if an error is retryable
     */
    public canRetry(error: BaseError): boolean {
        // Check if error category is retryable
        if (!this.retryConfig.retryableErrors.includes(error.category)) {
            return false;
        }

        // Specific error codes that are not retryable
        const nonRetryableErrors = [
            ERROR_CODES.S3_ACCESS_DENIED,
            ERROR_CODES.S3_INVALID_CREDENTIALS,
            ERROR_CODES.S3_BUCKET_NOT_FOUND,
            ERROR_CODES.FS_PERMISSION_DENIED,
            ERROR_CODES.FS_FILE_NOT_FOUND,
            ERROR_CODES.CONFIG_INVALID_FORMAT,
            ERROR_CODES.VALIDATION_REQUIRED_FIELD,
            ERROR_CODES.VALIDATION_INVALID_FORMAT
        ];

        if (nonRetryableErrors.includes(error.code)) {
            return false;
        }

        // Check severity - critical errors are usually not retryable
        if (error.severity === 'critical') {
            return false;
        }

        return true;
    }

    /**
     * Get suggestions for resolving the error
     */
    public getSuggestions(error: BaseError): string[] {
        const suggestions: string[] = [];

        switch (error.code) {
            case ERROR_CODES.NETWORK_TIMEOUT:
                suggestions.push('Check your internet connection');
                suggestions.push('Try again in a few moments');
                suggestions.push('Contact your network administrator if the problem persists');
                break;

            case ERROR_CODES.NETWORK_OFFLINE:
                suggestions.push('Check your internet connection');
                suggestions.push('Verify your network settings');
                suggestions.push('Try connecting to a different network');
                break;

            case ERROR_CODES.S3_ACCESS_DENIED:
                suggestions.push('Verify your AWS credentials');
                suggestions.push('Check your S3 bucket permissions');
                suggestions.push('Ensure your IAM user has the required permissions');
                break;

            case ERROR_CODES.S3_INVALID_CREDENTIALS:
                suggestions.push('Update your AWS access key and secret key');
                suggestions.push('Check if your credentials have expired');
                suggestions.push('Verify the credentials are for the correct AWS account');
                break;

            case ERROR_CODES.S3_BUCKET_NOT_FOUND:
                suggestions.push('Verify the bucket name is correct');
                suggestions.push('Check if the bucket exists in the specified region');
                suggestions.push('Ensure you have access to the bucket');
                break;

            case ERROR_CODES.FS_DISK_FULL:
                suggestions.push('Free up disk space');
                suggestions.push('Delete unnecessary files');
                suggestions.push('Move files to external storage');
                break;

            case ERROR_CODES.FS_PERMISSION_DENIED:
                suggestions.push('Run the application as administrator');
                suggestions.push('Check file and folder permissions');
                suggestions.push('Ensure the file is not in use by another application');
                break;

            case ERROR_CODES.CONFIG_MISSING_FIELD:
                suggestions.push('Complete all required configuration fields');
                suggestions.push('Check the configuration documentation');
                suggestions.push('Import a valid configuration file');
                break;

            case ERROR_CODES.VALIDATION_FILE_TOO_LARGE:
                suggestions.push('Choose a smaller file');
                suggestions.push('Compress the file before uploading');
                suggestions.push('Split large files into smaller parts');
                break;

            default:
                if (this.canRetry(error)) {
                    suggestions.push('Try the operation again');
                    suggestions.push('Wait a moment and retry');
                }
                suggestions.push('Check the application logs for more details');
                break;
        }

        return suggestions;
    }

    /**
     * Get help URL for the error
     */
    public getHelpUrl(error: BaseError): string | null {
        // This would return URLs to your documentation or help system
        const baseHelpUrl = 'https://docs.example.com/troubleshooting';

        switch (error.category) {
            case 's3':
                return `${baseHelpUrl}/s3-errors`;
            case 'network':
                return `${baseHelpUrl}/network-errors`;
            case 'file_system':
                return `${baseHelpUrl}/file-system-errors`;
            case 'configuration':
                return `${baseHelpUrl}/configuration-errors`;
            case 'validation':
                return `${baseHelpUrl}/validation-errors`;
            default:
                return `${baseHelpUrl}/general`;
        }
    }

    /**
     * Execute operation with retry logic and exponential backoff
     */
    public async withRetry<T>(
        operation: () => Promise<T>,
        context: string = 'unknown operation'
    ): Promise<T> {
        let lastError: any;
        let attempt = 0;

        while (attempt < this.retryConfig.maxAttempts) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                attempt++;

                // Transform error to determine if it's retryable
                const transformedError = this.transformError(error);

                // Log the error
                this.logError(transformedError, `${context} (attempt ${attempt})`);

                // Check if we should retry
                if (attempt >= this.retryConfig.maxAttempts || !this.canRetry(transformedError)) {
                    throw error;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
                    this.retryConfig.maxDelay
                );

                // Add jitter to prevent thundering herd
                const jitteredDelay = delay + Math.random() * 1000;

                console.log(`Retrying ${context} in ${Math.round(jitteredDelay)}ms (attempt ${attempt + 1}/${this.retryConfig.maxAttempts})`);

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, jitteredDelay));
            }
        }

        throw lastError;
    }

    /**
     * Transform any error to the appropriate typed error
     */
    public transformError(error: any): BaseError {
        // Check if it's already a transformed error
        if (error.category && error.code && error.timestamp) {
            return error as BaseError;
        }

        // Determine error type and transform accordingly
        const message = error.message || error.toString() || 'Unknown error';

        // Check for specific network error codes first (more specific)
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
            return this.handleNetworkError(error);
        }

        // Check for specific file system error codes (more specific)
        if (error.code === 'ENOENT' || error.code === 'EACCES' ||
            error.code === 'ENOSPC' || error.code === 'ENAMETOOLONG' ||
            error.code === 'EINVAL') {
            return this.handleFileSystemError(error);
        }

        // Check for AWS/S3 errors (AWS error names or S3-specific indicators)
        if (error.name || error.requestId || error.statusCode ||
            message.includes('AWS') || message.includes('S3') ||
            message.includes('bucket') || message.includes('AccessDenied')) {
            return this.handleS3Error(error);
        }

        // Check for network errors by message content
        if (message.includes('network') || message.includes('timeout') ||
            message.includes('connection') || message.includes('DNS')) {
            return this.handleNetworkError(error);
        }

        // Check for file system errors by message content
        if (message.includes('file') || message.includes('directory') ||
            message.includes('path') || message.includes('permission')) {
            return this.handleFileSystemError(error);
        }

        // Check for validation errors
        if (message.includes('validation') || message.includes('invalid') ||
            message.includes('required')) {
            return this.handleValidationError(error);
        }

        // Check for configuration errors
        if (message.includes('config') || message.includes('setting')) {
            return this.handleConfigurationError(error);
        }

        // Default to generic error
        return {
            code: ERROR_CODES.UNKNOWN_ERROR,
            message,
            category: 'unknown',
            severity: 'medium',
            timestamp: new Date(),
            context: {
                originalError: error
            },
            stack: error.stack
        };
    }

    /**
     * Update retry configuration
     */
    public updateRetryConfig(config: Partial<RetryConfig>): void {
        this.retryConfig = { ...this.retryConfig, ...config };
    }

    /**
     * Get current retry configuration
     */
    public getRetryConfig(): RetryConfig {
        return { ...this.retryConfig };
    }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Export default instance
export default errorHandler;