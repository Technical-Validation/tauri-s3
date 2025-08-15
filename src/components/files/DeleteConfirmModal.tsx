import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { S3File } from '../../types/file';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    files: S3File[];
    onClose: () => void;
    onConfirm: (fileKeys: string[]) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    files,
    onClose,
    onConfirm,
}) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const fileKeys = files.map(file => file.key);
            await onConfirm(fileKeys);
            onClose();
        } catch (error) {
            // Error handling is done in the parent component
            console.error('Delete failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const isMultiple = files.length > 1;
    const hasDirectories = files.some(file => file.isDirectory);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="确认删除"
            size="md"
            closeOnOverlayClick={!loading}
            closeOnEscape={!loading}
        >
            <div className="space-y-4">
                {/* Warning icon */}
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">
                            {isMultiple ? `删除 ${files.length} 个项目` : '删除文件'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                            {isMultiple
                                ? '您确定要删除选中的文件吗？此操作无法撤销。'
                                : `您确定要删除 "${files[0]?.name}" 吗？此操作无法撤销。`
                            }
                        </p>
                        {hasDirectories && (
                            <p className="text-sm text-red-600 mt-2 font-medium">
                                ⚠️ 包含文件夹，文件夹内的所有内容也将被删除。
                            </p>
                        )}
                    </div>
                </div>

                {/* File list for multiple files */}
                {isMultiple && files.length <= 10 && (
                    <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium text-gray-700 mb-2">将要删除的文件：</p>
                        <ul className="space-y-1">
                            {files.map((file, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                                    {file.isDirectory ? (
                                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    <span className="truncate">{file.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Show count if too many files */}
                {isMultiple && files.length > 10 && (
                    <div className="bg-gray-50 rounded-md p-3">
                        <p className="text-sm text-gray-600">
                            包含 {files.length} 个文件和文件夹
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        取消
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={handleConfirm}
                        loading={loading}
                    >
                        {loading ? '删除中...' : '确认删除'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};