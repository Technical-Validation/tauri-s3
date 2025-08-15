import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { S3File } from '../../types/file';

interface RenameModalProps {
    isOpen: boolean;
    file: S3File | null;
    onClose: () => void;
    onConfirm: (oldKey: string, newKey: string) => Promise<void>;
}

export const RenameModal: React.FC<RenameModalProps> = ({
    isOpen,
    file,
    onClose,
    onConfirm,
}) => {
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen && file) {
            setNewName(file.name);
            setError('');
        } else {
            setNewName('');
            setError('');
            setLoading(false);
        }
    }, [isOpen, file]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file || !newName.trim()) {
            setError('请输入新的文件名');
            return;
        }

        if (newName.trim() === file.name) {
            onClose();
            return;
        }

        // Validate file name
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(newName)) {
            setError('文件名不能包含以下字符: < > : " / \\ | ? *');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Calculate new key by replacing the file name part
            const pathParts = file.key.split('/');
            pathParts[pathParts.length - 1] = newName.trim();
            const newKey = pathParts.join('/');

            await onConfirm(file.key, newKey);
            onClose();
        } catch (error) {
            setError(error instanceof Error ? error.message : '重命名失败');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    if (!file) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="重命名文件"
            size="md"
            closeOnOverlayClick={!loading}
            closeOnEscape={!loading}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <p className="text-sm text-gray-600 mb-4">
                        重命名 "{file.name}"
                    </p>

                    <Input
                        label="新文件名"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        error={error}
                        disabled={loading}
                        autoFocus
                        placeholder="输入新的文件名"
                    />
                </div>

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
                        type="submit"
                        variant="primary"
                        loading={loading}
                        disabled={!newName.trim() || newName.trim() === file.name}
                    >
                        重命名
                    </Button>
                </div>
            </form>
        </Modal>
    );
};