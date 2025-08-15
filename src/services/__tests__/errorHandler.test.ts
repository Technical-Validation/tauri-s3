import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ErrorHandler } from '../errorHandler';
import { ERROR_CODES, RetryConfig } from '../../types/error';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn();
Object.defineProperty(window, 'dispatchEvent', {
    value: mockDispatchEvent,
    writable: true
});

describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
        errorHandler = new ErrorHandler();
        vi.clearAllMocks();
    });

    describe('handleS3Error', () => {
        it('should handle AccessDenied error', () => {
            const awsError = {
                name: 'AccessDenied',
                message: 'Access denied to S3 bucket',
                statusCode: 403,
                requestId: 'req-123'
            };

            const result = errorHandler.handleS3Error(awsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.S3_ACCESS_DENIED,
                message: 'Access denied to S3 bucket',
                category: 's3',
                severity: 'high',
                statusCode: 403,
                requestId: 'req-123'
            });
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should handle NoSuchBucket error', () => {
            const awsError = {
                name: 'NoSuchBucket',
                message: 'The specified bucket does not exist',
                statusCode: 404
            };

            const result = errorHandler.handleS3Error(awsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.S3_BUCKET_NOT_FOUND,
                message: 'The specified bucket does not exist',
                category: 's3',
                severity: 'high',
                statusCode: 404
            });
        });

        it('should handle InvalidAccessKeyId error', () => {
            const awsError = {
                name: 'InvalidAccessKeyId',
                message: 'The AWS Access Key Id you provided does not exist',
                statusCode: 403
            };

            const result = errorHandler.handleS3Error(awsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.S3_INVALID_CREDENTIALS,
                message: 'The AWS Access Key Id you provided does not exist',
                category: 's3',
                severity: 'critical'
            });
        });

        it('should handle unknown S3 error', () => {
            const awsError = {
                name: 'UnknownError',
                message: 'Something went wrong',
                statusCode: 500
            };

            const result = errorHandler.handleS3Error(awsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.UNKNOWN_ERROR,
                message: 'Something went wrong',
                category: 's3',
                severity: 'high' // 500 status code
            });
        });
    });

    describe('handleNetworkError', () => {
        it('should handle timeout error', () => {
            const networkError = {
                message: 'Request timeout',
                code: 'ETIMEDOUT'
            };

            const result = errorHandler.handleNetworkError(networkError);

            expect(result).toMatchObject({
                code: ERROR_CODES.NETWORK_TIMEOUT,
                message: 'Request timeout',
                category: 'network',
                severity: 'medium',
                timeout: true,
                offline: false,
                dns: false
            });
        });

        it('should handle DNS failure', () => {
            const networkError = {
                message: 'getaddrinfo ENOTFOUND example.com',
                code: 'ENOTFOUND'
            };

            const result = errorHandler.handleNetworkError(networkError);

            expect(result).toMatchObject({
                code: ERROR_CODES.NETWORK_DNS_FAILURE,
                category: 'network',
                severity: 'high',
                dns: true
            });
        });

        it('should handle connection refused', () => {
            const networkError = {
                message: 'connect ECONNREFUSED 127.0.0.1:80',
                code: 'ECONNREFUSED'
            };

            const result = errorHandler.handleNetworkError(networkError);

            expect(result).toMatchObject({
                code: ERROR_CODES.NETWORK_CONNECTION_REFUSED,
                category: 'network',
                severity: 'high'
            });
        });
    });

    describe('handleFileSystemError', () => {
        it('should handle file not found error', () => {
            const fsError = {
                message: 'ENOENT: no such file or directory',
                code: 'ENOENT',
                path: '/path/to/file.txt'
            };

            const result = errorHandler.handleFileSystemError(fsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.FS_FILE_NOT_FOUND,
                category: 'file_system',
                severity: 'medium',
                path: '/path/to/file.txt',
                diskSpace: false,
                permissions: false
            });
        });

        it('should handle permission denied error', () => {
            const fsError = {
                message: 'EACCES: permission denied',
                code: 'EACCES',
                path: '/restricted/file.txt'
            };

            const result = errorHandler.handleFileSystemError(fsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.FS_PERMISSION_DENIED,
                category: 'file_system',
                severity: 'high',
                permissions: true
            });
        });

        it('should handle disk full error', () => {
            const fsError = {
                message: 'ENOSPC: no space left on device',
                code: 'ENOSPC'
            };

            const result = errorHandler.handleFileSystemError(fsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.FS_DISK_FULL,
                category: 'file_system',
                severity: 'critical',
                diskSpace: true
            });
        });
    });

    describe('toUserFriendlyError', () => {
        it('should convert S3 access denied error to user-friendly format', () => {
            const s3Error = errorHandler.handleS3Error({
                name: 'AccessDenied',
                message: 'Access denied'
            });

            const userFriendlyError = errorHandler.toUserFriendlyError(s3Error);

            expect(userFriendlyError).toMatchObject({
                title: 'Access Denied',
                message: 'You don\'t have permission to perform this operation. Please check your credentials and permissions.',
                actionable: true,
                retryable: false,
                suggestions: expect.arrayContaining([
                    'Verify your AWS credentials',
                    'Check your S3 bucket permissions'
                ])
            });
        });

        it('should convert network timeout error to user-friendly format', () => {
            const networkError = errorHandler.handleNetworkError({
                message: 'Request timeout',
                code: 'ETIMEDOUT'
            });

            const userFriendlyError = errorHandler.toUserFriendlyError(networkError);

            expect(userFriendlyError).toMatchObject({
                title: 'Connection Timeout',
                message: 'The request timed out. Please check your internet connection and try again.',
                actionable: true,
                retryable: true,
                suggestions: expect.arrayContaining([
                    'Check your internet connection',
                    'Try again in a few moments'
                ])
            });
        });

        it('should convert disk full error to user-friendly format', () => {
            const fsError = errorHandler.handleFileSystemError({
                message: 'ENOSPC: no space left on device',
                code: 'ENOSPC'
            });

            const userFriendlyError = errorHandler.toUserFriendlyError(fsError);

            expect(userFriendlyError).toMatchObject({
                title: 'Disk Full',
                message: 'There is not enough space on your disk to complete this operation.',
                actionable: false,
                retryable: false,
                suggestions: expect.arrayContaining([
                    'Free up disk space',
                    'Delete unnecessary files'
                ])
            });
        });
    });

    describe('canRetry', () => {
        it('should return true for retryable network errors', () => {
            const networkError = errorHandler.handleNetworkError({
                message: 'Request timeout',
                code: 'ETIMEDOUT'
            });

            expect(errorHandler.canRetry(networkError)).toBe(true);
        });

        it('should return false for access denied errors', () => {
            const s3Error = errorHandler.handleS3Error({
                name: 'AccessDenied',
                message: 'Access denied'
            });

            expect(errorHandler.canRetry(s3Error)).toBe(false);
        });

        it('should return false for critical errors', () => {
            const criticalError = errorHandler.handleS3Error({
                name: 'InvalidAccessKeyId',
                message: 'Invalid credentials'
            });

            expect(errorHandler.canRetry(criticalError)).toBe(false);
        });

        it('should return false for non-retryable categories', () => {
            const validationError = errorHandler.handleValidationError({
                message: 'Required field missing',
                field: 'email'
            });

            expect(errorHandler.canRetry(validationError)).toBe(false);
        });
    });

    describe('getSuggestions', () => {
        it('should return appropriate suggestions for network timeout', () => {
            const networkError = errorHandler.handleNetworkError({
                message: 'Request timeout',
                code: 'ETIMEDOUT'
            });

            const suggestions = errorHandler.getSuggestions(networkError);

            expect(suggestions).toContain('Check your internet connection');
            expect(suggestions).toContain('Try again in a few moments');
        });

        it('should return appropriate suggestions for invalid credentials', () => {
            const s3Error = errorHandler.handleS3Error({
                name: 'InvalidAccessKeyId',
                message: 'Invalid credentials'
            });

            const suggestions = errorHandler.getSuggestions(s3Error);

            expect(suggestions).toContain('Update your AWS access key and secret key');
            expect(suggestions).toContain('Check if your credentials have expired');
        });

        it('should return appropriate suggestions for disk full error', () => {
            const fsError = errorHandler.handleFileSystemError({
                message: 'ENOSPC: no space left on device',
                code: 'ENOSPC'
            });

            const suggestions = errorHandler.getSuggestions(fsError);

            expect(suggestions).toContain('Free up disk space');
            expect(suggestions).toContain('Delete unnecessary files');
        });
    });

    describe('showErrorToast', () => {
        it('should dispatch error toast event', () => {
            const userFriendlyError = {
                title: 'Test Error',
                message: 'This is a test error',
                actionable: true,
                retryable: false
            };

            errorHandler.showErrorToast(userFriendlyError);

            expect(mockDispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'show-error-toast',
                    detail: userFriendlyError
                })
            );
        });
    });

    describe('showErrorModal', () => {
        it('should dispatch error modal event', () => {
            const userFriendlyError = {
                title: 'Test Error',
                message: 'This is a test error',
                actionable: true,
                retryable: false
            };

            errorHandler.showErrorModal(userFriendlyError);

            expect(mockDispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'show-error-modal',
                    detail: userFriendlyError
                })
            );
        });
    });

    describe('logError', () => {
        it('should log error to console in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = errorHandler.handleNetworkError({
                message: 'Test error',
                code: 'TEST'
            });

            errorHandler.logError(error, 'test context');

            expect(mockConsoleError).toHaveBeenCalledWith(
                'Error Log:',
                expect.objectContaining({
                    code: error.code,
                    category: error.category,
                    message: error.message,
                    context: 'test context'
                })
            );

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('withRetry', () => {
        it('should succeed on first attempt', async () => {
            const operation = vi.fn().mockResolvedValue('success');

            const result = await errorHandler.withRetry(operation, 'test operation');

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on retryable error and eventually succeed', async () => {
            const operation = vi.fn()
                .mockRejectedValueOnce(new Error('Request timeout'))
                .mockRejectedValueOnce(new Error('Request timeout'))
                .mockResolvedValue('success');

            const result = await errorHandler.withRetry(operation, 'test operation');

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should not retry on non-retryable error', async () => {
            const operation = vi.fn().mockRejectedValue({
                name: 'AccessDenied',
                message: 'Access denied'
            });

            await expect(errorHandler.withRetry(operation, 'test operation')).rejects.toThrow();
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should fail after max attempts', async () => {
            const operation = vi.fn().mockRejectedValue(new Error('Request timeout'));

            await expect(errorHandler.withRetry(operation, 'test operation')).rejects.toThrow();
            expect(operation).toHaveBeenCalledTimes(3); // Default max attempts
        });

        it('should use exponential backoff', async () => {
            const operation = vi.fn()
                .mockRejectedValueOnce(new Error('Request timeout'))
                .mockRejectedValueOnce(new Error('Request timeout'))
                .mockResolvedValue('success');

            const startTime = Date.now();
            await errorHandler.withRetry(operation, 'test operation');
            const endTime = Date.now();

            // Should have taken at least some time for the delays
            expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second for delays
            expect(operation).toHaveBeenCalledTimes(3);
        });
    });

    describe('transformError', () => {
        it('should return already transformed error as-is', () => {
            const transformedError = {
                code: ERROR_CODES.NETWORK_TIMEOUT,
                message: 'Timeout',
                category: 'network' as const,
                severity: 'medium' as const,
                timestamp: new Date()
            };

            const result = errorHandler.transformError(transformedError);

            expect(result).toBe(transformedError);
        });

        it('should transform AWS error', () => {
            const awsError = {
                name: 'AccessDenied',
                message: 'Access denied'
            };

            const result = errorHandler.transformError(awsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.S3_ACCESS_DENIED,
                category: 's3',
                severity: 'high'
            });
        });

        it('should transform network error', () => {
            const networkError = {
                code: 'ETIMEDOUT',
                message: 'Request timeout'
            };

            const result = errorHandler.transformError(networkError);

            expect(result).toMatchObject({
                code: ERROR_CODES.NETWORK_TIMEOUT,
                category: 'network',
                severity: 'medium'
            });
        });

        it('should transform file system error', () => {
            const fsError = {
                code: 'ENOENT',
                message: 'File not found'
            };

            const result = errorHandler.transformError(fsError);

            expect(result).toMatchObject({
                code: ERROR_CODES.FS_FILE_NOT_FOUND,
                category: 'file_system',
                severity: 'medium'
            });
        });

        it('should transform validation error', () => {
            const validationError = {
                message: 'Validation failed: required field missing'
            };

            const result = errorHandler.transformError(validationError);

            expect(result).toMatchObject({
                code: ERROR_CODES.VALIDATION_REQUIRED_FIELD,
                category: 'validation',
                severity: 'medium'
            });
        });

        it('should transform unknown error', () => {
            const unknownError = {
                message: 'Something went wrong'
            };

            const result = errorHandler.transformError(unknownError);

            expect(result).toMatchObject({
                code: ERROR_CODES.UNKNOWN_ERROR,
                category: 'unknown',
                severity: 'medium'
            });
        });
    });

    describe('updateRetryConfig', () => {
        it('should update retry configuration', () => {
            const newConfig: Partial<RetryConfig> = {
                maxAttempts: 5,
                baseDelay: 2000
            };

            errorHandler.updateRetryConfig(newConfig);

            const config = errorHandler.getRetryConfig();
            expect(config.maxAttempts).toBe(5);
            expect(config.baseDelay).toBe(2000);
            expect(config.backoffFactor).toBe(2); // Should keep existing values
        });
    });

    describe('getRetryConfig', () => {
        it('should return current retry configuration', () => {
            const config = errorHandler.getRetryConfig();

            expect(config).toMatchObject({
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 30000,
                backoffFactor: 2,
                retryableErrors: ['network', 's3', 'file_system']
            });
        });
    });
});