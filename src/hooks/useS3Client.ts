import { useEffect, useCallback, useState } from 'react';
import { s3Service } from '../services/s3Service';
import { useConfigStore } from '../stores/configStore';
import { S3File, FileOperationResult } from '../types/file';
import { UploadProgressEvent } from '../types/upload';

// Hook return type
interface UseS3ClientReturn {
    isInitialized: boolean;
    isConnected: boolean;
    loading: boolean;
    error: string | null;

    // Connection methods
    testConnection: () => Promise<boolean>;
    reconnect: () => Promise<void>;

    // File operations
    listObjects: (prefix?: string, maxKeys?: number) => Promise<S3File[]>;
    getObjectMetadata: (key: string) => Promise<S3File | null>;
    getPresignedDownloadUrl: (key: string, expiresIn?: number) => Promise<string>;

    // Upload operations
    uploadFile: (
        key: string,
        file: File,
        options?: {
            contentType?: string;
            metadata?: Record<string, string>;
            storageClass?: string;
            onProgress?: (event: UploadProgressEvent) => void;
        }
    ) => Promise<string>;

    // File management operations
    deleteObject: (key: string) => Promise<FileOperationResult>;
    copyObject: (sourceKey: string, targetKey: string) => Promise<FileOperationResult>;
    moveObject: (sourceKey: string, targetKey: string) => Promise<FileOperationResult>;

    // Multipart upload operations
    shouldUseMultipartUpload: (fileSize: number) => boolean;
    calculatePartCount: (fileSize: number) => number;
    getPartSize: () => number;
}

/**
 * Custom hook for S3 client operations
 * Automatically initializes the S3 service when active config changes
 */
export const useS3Client = (): UseS3ClientReturn => {
    const { getActiveConfig } = useConfigStore();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize S3 service when active config changes
    useEffect(() => {
        const initializeS3Service = async () => {
            const activeConfig = getActiveConfig();

            if (!activeConfig) {
                setIsInitialized(false);
                setIsConnected(false);
                setError('No active S3 configuration found');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Initialize the S3 service
                s3Service.initialize(activeConfig);
                setIsInitialized(true);

                // Test connection
                const connected = await s3Service.testConnection();
                setIsConnected(connected);

                if (!connected) {
                    setError('Failed to connect to S3. Please check your configuration.');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize S3 service';
                setError(errorMessage);
                setIsInitialized(false);
                setIsConnected(false);
            } finally {
                setLoading(false);
            }
        };

        initializeS3Service();
    }, [getActiveConfig]);

    // Test connection method
    const testConnection = useCallback(async (): Promise<boolean> => {
        if (!isInitialized) {
            setError('S3 service not initialized');
            return false;
        }

        try {
            setLoading(true);
            setError(null);

            const connected = await s3Service.testConnection();
            setIsConnected(connected);

            if (!connected) {
                setError('Connection test failed');
            }

            return connected;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
            setError(errorMessage);
            setIsConnected(false);
            return false;
        } finally {
            setLoading(false);
        }
    }, [isInitialized]);

    // Reconnect method
    const reconnect = useCallback(async (): Promise<void> => {
        const activeConfig = getActiveConfig();

        if (!activeConfig) {
            setError('No active S3 configuration found');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Re-initialize the S3 service
            s3Service.initialize(activeConfig);
            setIsInitialized(true);

            // Test connection
            const connected = await s3Service.testConnection();
            setIsConnected(connected);

            if (!connected) {
                setError('Failed to reconnect to S3');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reconnect';
            setError(errorMessage);
            setIsInitialized(false);
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    }, [getActiveConfig]);

    // List objects method
    const listObjects = useCallback(async (prefix: string = '', maxKeys: number = 1000): Promise<S3File[]> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setLoading(true);
            setError(null);

            const files = await s3Service.listObjects(prefix, maxKeys);
            return files;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to list objects';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isInitialized, isConnected]);

    // Get object metadata method
    const getObjectMetadata = useCallback(async (key: string): Promise<S3File | null> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setError(null);
            return await s3Service.getObjectMetadata(key);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get object metadata';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, isConnected]);

    // Get presigned download URL method
    const getPresignedDownloadUrl = useCallback(async (key: string, expiresIn: number = 3600): Promise<string> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setError(null);
            return await s3Service.getPresignedDownloadUrl(key, expiresIn);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate download URL';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, isConnected]);

    // Upload file method
    const uploadFile = useCallback(async (
        key: string,
        file: File,
        options: {
            contentType?: string;
            metadata?: Record<string, string>;
            storageClass?: string;
            onProgress?: (event: UploadProgressEvent) => void;
        } = {}
    ): Promise<string> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setLoading(true);
            setError(null);

            const etag = await s3Service.putObject(key, file, options);
            return etag;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isInitialized, isConnected]);

    // Delete object method
    const deleteObject = useCallback(async (key: string): Promise<FileOperationResult> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setError(null);
            return await s3Service.deleteObject(key);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete object';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, isConnected]);

    // Copy object method
    const copyObject = useCallback(async (sourceKey: string, targetKey: string): Promise<FileOperationResult> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setError(null);
            return await s3Service.copyObject(sourceKey, targetKey);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to copy object';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, isConnected]);

    // Move object method
    const moveObject = useCallback(async (sourceKey: string, targetKey: string): Promise<FileOperationResult> => {
        if (!isInitialized || !isConnected) {
            throw new Error('S3 service not initialized or not connected');
        }

        try {
            setError(null);
            return await s3Service.moveObject(sourceKey, targetKey);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to move object';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, isConnected]);

    // Multipart upload utility methods
    const shouldUseMultipartUpload = useCallback((fileSize: number): boolean => {
        return s3Service.shouldUseMultipartUpload(fileSize);
    }, []);

    const calculatePartCount = useCallback((fileSize: number): number => {
        return s3Service.calculatePartCount(fileSize);
    }, []);

    const getPartSize = useCallback((): number => {
        return s3Service.getPartSize();
    }, []);

    return {
        isInitialized,
        isConnected,
        loading,
        error,
        testConnection,
        reconnect,
        listObjects,
        getObjectMetadata,
        getPresignedDownloadUrl,
        uploadFile,
        deleteObject,
        copyObject,
        moveObject,
        shouldUseMultipartUpload,
        calculatePartCount,
        getPartSize,
    };
};

export default useS3Client;