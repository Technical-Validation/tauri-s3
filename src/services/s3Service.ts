import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    ListPartsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Config } from '../types/config';
import { S3File, FileOperationResult } from '../types/file';
import { UploadTask, MultipartUploadInfo, UploadProgressEvent } from '../types/upload';
import { errorHandler } from './errorHandler';

// Semaphore for controlling concurrency
class Semaphore {
    private permits: number;
    private waitQueue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.permits > 0) {
                this.permits--;
                this.executeTask(task, resolve, reject);
            } else {
                this.waitQueue.push(() => {
                    this.permits--;
                    this.executeTask(task, resolve, reject);
                });
            }
        });
    }

    private async executeTask<T>(
        task: () => Promise<T>,
        resolve: (value: T) => void,
        reject: (reason: any) => void
    ) {
        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.release();
        }
    }

    private release() {
        this.permits++;
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            if (next) {
                next();
            }
        }
    }
}

// S3 Service configuration
interface S3ServiceConfig {
    maxRetries: number;
    requestTimeout: number;
    multipartThreshold: number; // 100MB default
    partSize: number; // 10MB default
}

const DEFAULT_CONFIG: S3ServiceConfig = {
    maxRetries: 3,
    requestTimeout: 30000,
    multipartThreshold: 100 * 1024 * 1024, // 100MB
    partSize: 10 * 1024 * 1024, // 10MB
};

// S3 Service class
export class S3Service {
    private client: S3Client | null = null;
    private config: S3Config | null = null;
    private serviceConfig: S3ServiceConfig;

    constructor(serviceConfig: Partial<S3ServiceConfig> = {}) {
        this.serviceConfig = { ...DEFAULT_CONFIG, ...serviceConfig };
    }

    /**
     * Initialize S3 client with configuration
     */
    public initialize(config: S3Config): void {
        this.config = config;
        this.client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
            maxAttempts: this.serviceConfig.maxRetries,
            requestHandler: {
                requestTimeout: this.serviceConfig.requestTimeout,
            },
        });
    }

    /**
     * Get current S3 client instance
     */
    private getClient(): S3Client {
        if (!this.client) {
            throw new Error('S3 service not initialized. Call initialize() first.');
        }
        return this.client;
    }

    /**
     * Get current bucket name
     */
    private getBucketName(): string {
        if (!this.config) {
            throw new Error('S3 service not initialized. Call initialize() first.');
        }
        return this.config.bucketName;
    }

    /**
     * Test S3 connection by checking bucket access
     */
    public async testConnection(): Promise<boolean> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            await client.send(new HeadBucketCommand({ Bucket: bucketName }));
            return true;
        } catch (error) {
            const transformedError = errorHandler.transformError(error);
            errorHandler.logError(transformedError, 'S3 connection test');
            return false;
        }
    }

    /**
     * List objects in S3 bucket with optional prefix
     */
    public async listObjects(prefix: string = '', maxKeys: number = 1000): Promise<S3File[]> {
        return await errorHandler.withRetry(async () => {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: maxKeys,
                Delimiter: '/', // This helps separate folders from files
            });

            const response = await client.send(command);
            const files: S3File[] = [];

            // Add directories (common prefixes)
            if (response.CommonPrefixes) {
                for (const commonPrefix of response.CommonPrefixes) {
                    if (commonPrefix.Prefix) {
                        const name = commonPrefix.Prefix.replace(prefix, '').replace('/', '');
                        if (name) {
                            files.push({
                                key: commonPrefix.Prefix,
                                name,
                                size: 0,
                                lastModified: new Date(),
                                etag: '',
                                isDirectory: true,
                                storageClass: 'DIRECTORY',
                                contentType: 'application/x-directory',
                            });
                        }
                    }
                }
            }

            // Add files (contents)
            if (response.Contents) {
                for (const object of response.Contents) {
                    if (object.Key && object.Key !== prefix) {
                        const name = object.Key.replace(prefix, '');
                        // Skip if it's a directory marker or empty name
                        if (name && !name.endsWith('/')) {
                            files.push({
                                key: object.Key,
                                name,
                                size: object.Size || 0,
                                lastModified: object.LastModified || new Date(),
                                etag: object.ETag?.replace(/"/g, '') || '',
                                isDirectory: false,
                                storageClass: object.StorageClass,
                                contentType: await this.getContentType(object.Key),
                            });
                        }
                    }
                }
            }

            return files;
        }, `list objects (prefix: ${prefix})`);
    }

    /**
     * Get object metadata
     */
    public async getObjectMetadata(key: string): Promise<S3File | null> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new HeadObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const response = await client.send(command);

            return {
                key,
                name: key.split('/').pop() || key,
                size: response.ContentLength || 0,
                lastModified: response.LastModified || new Date(),
                etag: response.ETag?.replace(/"/g, '') || '',
                isDirectory: false,
                storageClass: response.StorageClass,
                contentType: response.ContentType,
                metadata: response.Metadata,
            };
        } catch (error) {
            console.error('Failed to get object metadata:', error);
            return null;
        }
    }

    /**
     * Get object content as stream or buffer
     */
    public async getObject(key: string): Promise<ReadableStream | null> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const response = await client.send(command);
            return response.Body as ReadableStream;
        } catch (error) {
            console.error('Failed to get object:', error);
            throw new Error(`Failed to get object: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate presigned URL for object download
     */
    public async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            return await getSignedUrl(client, command, { expiresIn });
        } catch (error) {
            console.error('Failed to generate presigned URL:', error);
            throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload object to S3 (simple upload for small files)
     */
    public async putObject(
        key: string,
        body: File | Blob | ArrayBuffer | Uint8Array,
        options: {
            contentType?: string;
            metadata?: Record<string, string>;
            storageClass?: string;
            onProgress?: (event: UploadProgressEvent) => void;
        } = {}
    ): Promise<string> {
        return await errorHandler.withRetry(async () => {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: body,
                ContentType: options.contentType || await this.getContentType(key),
                Metadata: options.metadata,
                StorageClass: options.storageClass,
            });

            const response = await client.send(command);
            return response.ETag?.replace(/"/g, '') || '';
        }, `upload object (${key})`);
    }

    /**
     * Delete object from S3
     */
    public async deleteObject(key: string): Promise<FileOperationResult> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            await client.send(command);

            return {
                success: true,
                affectedFiles: [key],
            };
        } catch (error) {
            console.error('Failed to delete object:', error);
            return {
                success: false,
                error: `Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`,
                affectedFiles: [key],
            };
        }
    }

    /**
     * Copy object within S3
     */
    public async copyObject(sourceKey: string, targetKey: string): Promise<FileOperationResult> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new CopyObjectCommand({
                Bucket: bucketName,
                Key: targetKey,
                CopySource: `${bucketName}/${sourceKey}`,
            });

            await client.send(command);

            return {
                success: true,
                affectedFiles: [sourceKey, targetKey],
            };
        } catch (error) {
            console.error('Failed to copy object:', error);
            return {
                success: false,
                error: `Failed to copy object: ${error instanceof Error ? error.message : 'Unknown error'}`,
                affectedFiles: [sourceKey, targetKey],
            };
        }
    }

    /**
     * Move object within S3 (copy + delete)
     */
    public async moveObject(sourceKey: string, targetKey: string): Promise<FileOperationResult> {
        try {
            // First copy the object
            const copyResult = await this.copyObject(sourceKey, targetKey);
            if (!copyResult.success) {
                return copyResult;
            }

            // Then delete the original
            const deleteResult = await this.deleteObject(sourceKey);
            if (!deleteResult.success) {
                // If delete fails, try to clean up the copy
                await this.deleteObject(targetKey);
                return deleteResult;
            }

            return {
                success: true,
                affectedFiles: [sourceKey, targetKey],
            };
        } catch (error) {
            console.error('Failed to move object:', error);
            return {
                success: false,
                error: `Failed to move object: ${error instanceof Error ? error.message : 'Unknown error'}`,
                affectedFiles: [sourceKey, targetKey],
            };
        }
    }

    /**
     * Initialize multipart upload for large files
     */
    public async createMultipartUpload(
        key: string,
        options: {
            contentType?: string;
            metadata?: Record<string, string>;
            storageClass?: string;
        } = {}
    ): Promise<string> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new CreateMultipartUploadCommand({
                Bucket: bucketName,
                Key: key,
                ContentType: options.contentType || await this.getContentType(key),
                Metadata: options.metadata,
                StorageClass: options.storageClass,
            });

            const response = await client.send(command);
            if (!response.UploadId) {
                throw new Error('Failed to create multipart upload: No upload ID returned');
            }

            return response.UploadId;
        } catch (error) {
            console.error('Failed to create multipart upload:', error);
            throw new Error(`Failed to create multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload a part in multipart upload
     */
    public async uploadPart(
        key: string,
        uploadId: string,
        partNumber: number,
        body: ArrayBuffer | Uint8Array
    ): Promise<{ etag: string; partNumber: number }> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new UploadPartCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
                PartNumber: partNumber,
                Body: body,
            });

            const response = await client.send(command);
            if (!response.ETag) {
                throw new Error('Failed to upload part: No ETag returned');
            }

            return {
                etag: response.ETag.replace(/"/g, ''),
                partNumber,
            };
        } catch (error) {
            console.error('Failed to upload part:', error);
            throw new Error(`Failed to upload part: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Complete multipart upload
     */
    public async completeMultipartUpload(
        key: string,
        uploadId: string,
        parts: Array<{ etag: string; partNumber: number }>
    ): Promise<string> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new CompleteMultipartUploadCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts.map(part => ({
                        ETag: part.etag,
                        PartNumber: part.partNumber,
                    })),
                },
            });

            const response = await client.send(command);
            return response.ETag?.replace(/"/g, '') || '';
        } catch (error) {
            console.error('Failed to complete multipart upload:', error);
            throw new Error(`Failed to complete multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Abort multipart upload
     */
    public async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new AbortMultipartUploadCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
            });

            await client.send(command);
        } catch (error) {
            console.error('Failed to abort multipart upload:', error);
            throw new Error(`Failed to abort multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List parts of multipart upload
     */
    public async listMultipartUploadParts(key: string, uploadId: string): Promise<Array<{ partNumber: number; etag: string; size: number }>> {
        try {
            const client = this.getClient();
            const bucketName = this.getBucketName();

            const command = new ListPartsCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
            });

            const response = await client.send(command);
            return response.Parts?.map(part => ({
                partNumber: part.PartNumber || 0,
                etag: part.ETag?.replace(/"/g, '') || '',
                size: part.Size || 0,
            })) || [];
        } catch (error) {
            console.error('Failed to list multipart upload parts:', error);
            throw new Error(`Failed to list multipart upload parts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Resume multipart upload by checking existing parts
     */
    public async resumeMultipartUpload(key: string, uploadId: string): Promise<Array<{ partNumber: number; etag: string; size: number }>> {
        try {
            return await this.listMultipartUploadParts(key, uploadId);
        } catch (error) {
            console.error('Failed to resume multipart upload:', error);
            throw new Error(`Failed to resume multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload multiple parts concurrently with retry logic
     */
    public async uploadPartsConcurrently(
        key: string,
        uploadId: string,
        parts: Array<{ partNumber: number; data: ArrayBuffer | Uint8Array }>,
        maxConcurrency: number = 3,
        maxRetries: number = 3,
        onProgress?: (partNumber: number, progress: number) => void
    ): Promise<Array<{ partNumber: number; etag: string }>> {
        const results: Array<{ partNumber: number; etag: string }> = [];
        const semaphore = new Semaphore(maxConcurrency);

        const uploadPromises = parts.map(async (part) => {
            return semaphore.acquire(async () => {
                let retries = 0;
                while (retries <= maxRetries) {
                    try {
                        const result = await this.uploadPart(key, uploadId, part.partNumber, part.data);
                        onProgress?.(part.partNumber, 100);
                        return result;
                    } catch (error) {
                        retries++;
                        if (retries > maxRetries) {
                            throw new Error(`Failed to upload part ${part.partNumber} after ${maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                        // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
                        onProgress?.(part.partNumber, 0); // Reset progress on retry
                    }
                }
                throw new Error(`Failed to upload part ${part.partNumber}`);
            });
        });

        const uploadResults = await Promise.all(uploadPromises);
        results.push(...uploadResults);

        return results.sort((a, b) => a.partNumber - b.partNumber);
    }

    /**
     * Calculate file checksum for integrity verification
     */
    public async calculateFileChecksum(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    resolve(hashHex);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Verify multipart upload integrity
     */
    public async verifyMultipartUploadIntegrity(
        key: string,
        uploadId: string,
        expectedChecksum: string
    ): Promise<boolean> {
        try {
            // This is a simplified verification - in practice, you might want to
            // implement more sophisticated integrity checks
            const parts = await this.listMultipartUploadParts(key, uploadId);
            return parts.length > 0; // Basic check that parts exist
        } catch (error) {
            console.error('Failed to verify multipart upload integrity:', error);
            return false;
        }
    }

    /**
     * Determine if file should use multipart upload
     */
    public shouldUseMultipartUpload(fileSize: number): boolean {
        return fileSize > this.serviceConfig.multipartThreshold;
    }

    /**
     * Calculate number of parts for multipart upload
     */
    public calculatePartCount(fileSize: number): number {
        return Math.ceil(fileSize / this.serviceConfig.partSize);
    }

    /**
     * Get part size for multipart upload
     */
    public getPartSize(): number {
        return this.serviceConfig.partSize;
    }

    /**
     * Get content type based on file extension
     */
    private async getContentType(key: string): Promise<string> {
        const extension = key.split('.').pop()?.toLowerCase();

        const mimeTypes: Record<string, string> = {
            // Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',

            // Documents
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

            // Text
            'txt': 'text/plain',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'csv': 'text/csv',

            // Archives
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',

            // Video
            'mp4': 'video/mp4',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'webm': 'video/webm',

            // Audio
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
        };

        return mimeTypes[extension || ''] || 'application/octet-stream';
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        this.client = null;
        this.config = null;
    }
}

// Create singleton instance
export const s3Service = new S3Service();

// Export default instance
export default s3Service;