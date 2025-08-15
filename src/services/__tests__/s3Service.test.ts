import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { S3Service } from '../s3Service';
import { S3Config } from '../../types/config';

// Create mock send function
const mockSend = vi.fn();

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({
        send: mockSend,
    })),
    ListObjectsV2Command: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    HeadBucketCommand: vi.fn().mockImplementation((input) => ({ input })),
    HeadObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    CopyObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    CreateMultipartUploadCommand: vi.fn().mockImplementation((input) => ({ input })),
    UploadPartCommand: vi.fn().mockImplementation((input) => ({ input })),
    CompleteMultipartUploadCommand: vi.fn().mockImplementation((input) => ({ input })),
    AbortMultipartUploadCommand: vi.fn().mockImplementation((input) => ({ input })),
    ListPartsCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn(),
}));

describe('S3Service', () => {
    let s3Service: S3Service;
    const mockConfig: S3Config = {
        id: 'test-config',
        name: 'Test Config',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        bucketName: 'test-bucket',
    };

    beforeEach(() => {
        s3Service = new S3Service();
        // Reset mocks
        vi.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize S3 client successfully', () => {
            // Test that initialization doesn't throw an error
            expect(() => s3Service.initialize(mockConfig)).not.toThrow();
        });
    });

    describe('multipart upload operations', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should create multipart upload', async () => {
            const mockUploadId = 'test-upload-id';
            mockSend.mockResolvedValueOnce({ UploadId: mockUploadId });

            const uploadId = await s3Service.createMultipartUpload('test-key');

            expect(uploadId).toBe(mockUploadId);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: mockConfig.bucketName,
                        Key: 'test-key'
                    })
                })
            );
        });

        it('should upload part', async () => {
            const mockETag = 'test-etag';
            mockSend.mockResolvedValueOnce({ ETag: `"${mockETag}"` });

            const result = await s3Service.uploadPart('test-key', 'upload-id', 1, new ArrayBuffer(1024));

            expect(result).toEqual({
                etag: mockETag,
                partNumber: 1
            });
        });

        it('should complete multipart upload', async () => {
            const mockETag = 'completed-etag';
            mockSend.mockResolvedValueOnce({ ETag: `"${mockETag}"` });

            const parts = [
                { etag: 'etag1', partNumber: 1 },
                { etag: 'etag2', partNumber: 2 }
            ];

            const result = await s3Service.completeMultipartUpload('test-key', 'upload-id', parts);

            expect(result).toBe(mockETag);
        });

        it('should abort multipart upload', async () => {
            mockSend.mockResolvedValueOnce({});

            await expect(s3Service.abortMultipartUpload('test-key', 'upload-id')).resolves.not.toThrow();

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: mockConfig.bucketName,
                        Key: 'test-key',
                        UploadId: 'upload-id'
                    })
                })
            );
        });

        it('should list multipart upload parts', async () => {
            const mockParts = [
                { PartNumber: 1, ETag: '"etag1"', Size: 1024 },
                { PartNumber: 2, ETag: '"etag2"', Size: 1024 }
            ];
            mockSend.mockResolvedValueOnce({ Parts: mockParts });

            const result = await s3Service.listMultipartUploadParts('test-key', 'upload-id');

            expect(result).toEqual([
                { partNumber: 1, etag: 'etag1', size: 1024 },
                { partNumber: 2, etag: 'etag2', size: 1024 }
            ]);
        });

        it('should resume multipart upload', async () => {
            const mockParts = [
                { PartNumber: 1, ETag: '"etag1"', Size: 1024 },
                { PartNumber: 2, ETag: '"etag2"', Size: 1024 }
            ];
            mockSend.mockResolvedValueOnce({ Parts: mockParts });

            const result = await s3Service.resumeMultipartUpload('test-key', 'upload-id');

            expect(result).toEqual([
                { partNumber: 1, etag: 'etag1', size: 1024 },
                { partNumber: 2, etag: 'etag2', size: 1024 }
            ]);
        });

        it('should upload parts concurrently', async () => {
            const mockETag1 = 'etag1';
            const mockETag2 = 'etag2';

            mockSend
                .mockResolvedValueOnce({ ETag: `"${mockETag1}"` })
                .mockResolvedValueOnce({ ETag: `"${mockETag2}"` });

            const parts = [
                { partNumber: 1, data: new ArrayBuffer(1024) },
                { partNumber: 2, data: new ArrayBuffer(1024) }
            ];

            const result = await s3Service.uploadPartsConcurrently(
                'test-key',
                'upload-id',
                parts,
                2,
                1
            );

            expect(result).toEqual([
                { partNumber: 1, etag: mockETag1 },
                { partNumber: 2, etag: mockETag2 }
            ]);
        });

        it('should calculate file checksum', async () => {
            // Mock crypto.subtle.digest
            const mockDigest = new ArrayBuffer(32);
            const mockArray = new Uint8Array(mockDigest);
            mockArray.fill(255); // Fill with 0xFF to get predictable hex output

            Object.defineProperty(global, 'crypto', {
                value: {
                    subtle: {
                        digest: vi.fn().mockResolvedValue(mockDigest)
                    }
                },
                writable: true
            });

            const file = new File(['test content'], 'test.txt');
            const checksum = await s3Service.calculateFileChecksum(file);

            expect(checksum).toBe('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        });

        it('should verify multipart upload integrity', async () => {
            const mockParts = [
                { PartNumber: 1, ETag: '"etag1"', Size: 1024 }
            ];
            mockSend.mockResolvedValueOnce({ Parts: mockParts });

            const result = await s3Service.verifyMultipartUploadIntegrity(
                'test-key',
                'upload-id',
                'test-checksum'
            );

            expect(result).toBe(true);
        });

        it('should handle concurrent upload with retries', async () => {
            // First call fails, second succeeds
            mockSend
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ ETag: '"etag1"' });

            const parts = [
                { partNumber: 1, data: new ArrayBuffer(1024) }
            ];

            const result = await s3Service.uploadPartsConcurrently(
                'test-key',
                'upload-id',
                parts,
                1,
                2
            );

            expect(result).toEqual([
                { partNumber: 1, etag: 'etag1' }
            ]);
            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retries in concurrent upload', async () => {
            mockSend.mockRejectedValue(new Error('Persistent error'));

            const parts = [
                { partNumber: 1, data: new ArrayBuffer(1024) }
            ];

            await expect(
                s3Service.uploadPartsConcurrently(
                    'test-key',
                    'upload-id',
                    parts,
                    1,
                    1
                )
            ).rejects.toThrow('Failed to upload part 1 after 1 retries');
        });

        it('should determine if file should use multipart upload', () => {
            const smallFile = 50 * 1024 * 1024; // 50MB
            const largeFile = 150 * 1024 * 1024; // 150MB

            expect(s3Service.shouldUseMultipartUpload(smallFile)).toBe(false);
            expect(s3Service.shouldUseMultipartUpload(largeFile)).toBe(true);
        });

        it('should calculate part count correctly', () => {
            const fileSize = 105 * 1024 * 1024; // 105MB
            const partCount = s3Service.calculatePartCount(fileSize);

            // With 10MB parts, 105MB should need 11 parts
            expect(partCount).toBe(11);
        });

        it('should return correct part size', () => {
            const partSize = s3Service.getPartSize();
            expect(partSize).toBe(10 * 1024 * 1024); // 10MB
        });
    });

    describe('testConnection', () => {
        it('should return true when connection test succeeds', async () => {
            s3Service.initialize(mockConfig);
            mockSend.mockResolvedValue({});

            const result = await s3Service.testConnection();

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: { Bucket: mockConfig.bucketName }
                })
            );
        });

        it('should return false when connection test fails', async () => {
            s3Service.initialize(mockConfig);
            mockSend.mockRejectedValue(new Error('Connection failed'));

            const result = await s3Service.testConnection();

            expect(result).toBe(false);
        });

        it('should return false when not initialized', async () => {
            const result = await s3Service.testConnection();
            expect(result).toBe(false);
        });
    });

    describe('listObjects', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should list objects successfully', async () => {
            const mockResponse = {
                Contents: [
                    {
                        Key: 'test-file.txt',
                        Size: 1024,
                        LastModified: new Date('2023-01-01'),
                        ETag: '"abc123"',
                        StorageClass: 'STANDARD',
                    },
                ],
                CommonPrefixes: [
                    { Prefix: 'folder/' },
                ],
            };

            mockSend.mockResolvedValue(mockResponse);

            const result = await s3Service.listObjects();

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                key: 'folder/',
                name: 'folder',
                isDirectory: true,
                storageClass: 'DIRECTORY',
            });
            expect(result[1]).toMatchObject({
                key: 'test-file.txt',
                name: 'test-file.txt',
                size: 1024,
                isDirectory: false,
                etag: 'abc123',
            });
        });

        it('should handle empty bucket', async () => {
            mockSend.mockResolvedValue({});

            const result = await s3Service.listObjects();

            expect(result).toEqual([]);
        });

        it('should throw error when listing fails', async () => {
            mockSend.mockRejectedValue(new Error('Access denied'));

            await expect(s3Service.listObjects()).rejects.toThrow(
                'Access denied'
            );
        });
    });

    describe('getObjectMetadata', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should get object metadata successfully', async () => {
            const mockResponse = {
                ContentLength: 1024,
                LastModified: new Date('2023-01-01'),
                ETag: '"abc123"',
                StorageClass: 'STANDARD',
                ContentType: 'text/plain',
                Metadata: { 'custom-key': 'custom-value' },
            };

            mockSend.mockResolvedValue(mockResponse);

            const result = await s3Service.getObjectMetadata('test-file.txt');

            expect(result).toMatchObject({
                key: 'test-file.txt',
                name: 'test-file.txt',
                size: 1024,
                isDirectory: false,
                etag: 'abc123',
                storageClass: 'STANDARD',
                contentType: 'text/plain',
                metadata: { 'custom-key': 'custom-value' },
            });
        });

        it('should return null when object not found', async () => {
            mockSend.mockRejectedValue(new Error('Not found'));

            const result = await s3Service.getObjectMetadata('nonexistent.txt');

            expect(result).toBeNull();
        });
    });

    describe('putObject', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should upload object successfully', async () => {
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const mockResponse = { ETag: '"abc123"' };

            mockSend.mockResolvedValue(mockResponse);

            const result = await s3Service.putObject('test.txt', mockFile);

            expect(result).toBe('abc123');
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: mockConfig.bucketName,
                        Key: 'test.txt',
                        Body: mockFile,
                        ContentType: 'text/plain',
                    })
                })
            );
        });

        it('should throw error when upload fails', async () => {
            const mockFile = new File(['test content'], 'test.txt');
            mockSend.mockRejectedValue(new Error('Upload failed'));

            await expect(s3Service.putObject('test.txt', mockFile)).rejects.toThrow(
                'Upload failed'
            );
        });
    });

    describe('deleteObject', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should delete object successfully', async () => {
            mockSend.mockResolvedValue({});

            const result = await s3Service.deleteObject('test.txt');

            expect(result).toEqual({
                success: true,
                affectedFiles: ['test.txt'],
            });
        });

        it('should return error result when delete fails', async () => {
            mockSend.mockRejectedValue(new Error('Delete failed'));

            const result = await s3Service.deleteObject('test.txt');

            expect(result).toEqual({
                success: false,
                error: 'Failed to delete object: Delete failed',
                affectedFiles: ['test.txt'],
            });
        });
    });

    describe('copyObject', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should copy object successfully', async () => {
            mockSend.mockResolvedValue({});

            const result = await s3Service.copyObject('source.txt', 'target.txt');

            expect(result).toEqual({
                success: true,
                affectedFiles: ['source.txt', 'target.txt'],
            });
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: mockConfig.bucketName,
                        Key: 'target.txt',
                        CopySource: `${mockConfig.bucketName}/source.txt`,
                    })
                })
            );
        });
    });

    describe('multipart upload utilities', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should determine when to use multipart upload', () => {
            const smallFile = 50 * 1024 * 1024; // 50MB
            const largeFile = 150 * 1024 * 1024; // 150MB

            expect(s3Service.shouldUseMultipartUpload(smallFile)).toBe(false);
            expect(s3Service.shouldUseMultipartUpload(largeFile)).toBe(true);
        });

        it('should calculate part count correctly', () => {
            const fileSize = 150 * 1024 * 1024; // 150MB
            const partCount = s3Service.calculatePartCount(fileSize);

            expect(partCount).toBe(15); // 150MB / 10MB per part
        });

        it('should return correct part size', () => {
            const partSize = s3Service.getPartSize();

            expect(partSize).toBe(10 * 1024 * 1024); // 10MB
        });
    });

    describe('createMultipartUpload', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should create multipart upload successfully', async () => {
            const mockResponse = { UploadId: 'upload-123' };
            mockSend.mockResolvedValue(mockResponse);

            const result = await s3Service.createMultipartUpload('large-file.bin');

            expect(result).toBe('upload-123');
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: mockConfig.bucketName,
                        Key: 'large-file.bin',
                        ContentType: 'application/octet-stream',
                    })
                })
            );
        });

        it('should throw error when no upload ID returned', async () => {
            mockSend.mockResolvedValue({});

            await expect(s3Service.createMultipartUpload('large-file.bin')).rejects.toThrow(
                'Failed to create multipart upload: No upload ID returned'
            );
        });
    });

    describe('uploadPart', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should upload part successfully', async () => {
            const mockResponse = { ETag: '"part-etag"' };
            mockSend.mockResolvedValue(mockResponse);

            const partData = new ArrayBuffer(1024);
            const result = await s3Service.uploadPart('large-file.bin', 'upload-123', 1, partData);

            expect(result).toEqual({
                etag: 'part-etag',
                partNumber: 1,
            });
        });
    });

    describe('completeMultipartUpload', () => {
        beforeEach(() => {
            s3Service.initialize(mockConfig);
        });

        it('should complete multipart upload successfully', async () => {
            const mockResponse = { ETag: '"final-etag"' };
            mockSend.mockResolvedValue(mockResponse);

            const parts = [
                { etag: 'part1-etag', partNumber: 1 },
                { etag: 'part2-etag', partNumber: 2 },
            ];

            const result = await s3Service.completeMultipartUpload('large-file.bin', 'upload-123', parts);

            expect(result).toBe('final-etag');
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: mockConfig.bucketName,
                        Key: 'large-file.bin',
                        UploadId: 'upload-123',
                        MultipartUpload: {
                            Parts: [
                                { ETag: 'part1-etag', PartNumber: 1 },
                                { ETag: 'part2-etag', PartNumber: 2 },
                            ],
                        },
                    })
                })
            );
        });
    });
});