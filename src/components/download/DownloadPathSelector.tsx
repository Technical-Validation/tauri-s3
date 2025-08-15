import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { downloadService } from '../../services/downloadService';

interface DownloadPathSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (path: string) => void;
    fileName?: string;
    defaultPath?: string;
    title?: string;
    description?: string;
}

export const DownloadPathSelector: React.FC<DownloadPathSelectorProps> = ({
    isOpen,
    onClose,
    onConfirm,
    fileName,
    defaultPath,
    title = '选择下载位置',
    description = '请选择文件的保存位置'
}) => {
    const [selectedPath, setSelectedPath] = useState('');
    const [isValidPath, setIsValidPath] = useState(true);
    const [fileExists, setFileExists] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            initializePath();
        }
    }, [isOpen, fileName, defaultPath]);

    useEffect(() => {
        if (selectedPath) {
            validatePath(selectedPath);
        }
    }, [selectedPath]);

    const initializePath = async () => {
        if (defaultPath) {
            setSelectedPath(defaultPath);
        } else if (fileName) {
            try {
                const path = await downloadService.getDefaultDownloadPath(fileName);
                setSelectedPath(path);
            } catch (error) {
                console.error('Failed to get default download path:', error);
                setSelectedPath(fileName);
            }
        }
    };

    const validatePath = async (path: string) => {
        if (!path.trim()) {
            setIsValidPath(false);
            setFileExists(false);
            return;
        }

        try {
            const isValid = await downloadService.validateDownloadPath(path);
            setIsValidPath(isValid);

            if (isValid) {
                const exists = await downloadService.checkFileExists(path);
                setFileExists(exists);
            } else {
                setFileExists(false);
            }
        } catch (error) {
            console.error('Path validation error:', error);
            setIsValidPath(false);
            setFileExists(false);
        }
    };

    const handleBrowse = async () => {
        try {
            setLoading(true);
            const result = await downloadService.selectDownloadPath({
                defaultPath: fileName
            });

            if (!result.cancelled && result.path) {
                setSelectedPath(result.path);
            }
        } catch (error) {
            console.error('Failed to select download path:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBrowseDirectory = async () => {
        try {
            setLoading(true);
            const result = await downloadService.selectDownloadDirectory();

            if (!result.cancelled && result.path && fileName) {
                const fullPath = `${result.path}/${fileName}`;
                setSelectedPath(fullPath);
            }
        } catch (error) {
            console.error('Failed to select download directory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateUnique = async () => {
        if (!selectedPath) return;

        try {
            setLoading(true);
            const uniquePath = await downloadService.generateUniqueFilename(selectedPath);
            setSelectedPath(uniquePath);
        } catch (error) {
            console.error('Failed to generate unique filename:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (isValidPath && selectedPath.trim()) {
            onConfirm(selectedPath.trim());
            onClose();
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const renderPathStatus = () => {
        if (!selectedPath.trim()) {
            return (
                <p className="text-sm text-gray-500 mt-1">
                    请输入或选择文件保存路径
                </p>
            );
        }

        if (!isValidPath) {
            return (
                <p className="text-sm text-red-600 mt-1">
                    路径无效或无法访问
                </p>
            );
        }

        if (fileExists) {
            return (
                <div className="mt-1">
                    <p className="text-sm text-yellow-600">
                        文件已存在，下载时将覆盖现有文件
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleGenerateUnique}
                        disabled={loading}
                        className="mt-1"
                    >
                        生成唯一文件名
                    </Button>
                </div>
            );
        }

        return (
            <p className="text-sm text-green-600 mt-1">
                路径有效
            </p>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="lg"
        >
            <div className="space-y-4">
                <p className="text-gray-600">
                    {description}
                </p>

                {fileName && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            文件名
                        </label>
                        <div className="p-2 bg-gray-50 rounded border text-sm font-mono">
                            {fileName}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        保存路径
                    </label>
                    <div className="flex space-x-2">
                        <Input
                            value={selectedPath}
                            onChange={(e) => setSelectedPath(e.target.value)}
                            placeholder="输入完整的文件路径"
                            className="flex-1"
                        />
                        <Button
                            variant="secondary"
                            onClick={handleBrowse}
                            disabled={loading}
                        >
                            浏览文件
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleBrowseDirectory}
                            disabled={loading}
                        >
                            选择目录
                        </Button>
                    </div>
                    {renderPathStatus()}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">提示</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• 可以直接输入完整路径，或使用浏览按钮选择</li>
                        <li>• 如果目录不存在，下载时会自动创建</li>
                        <li>• 如果文件已存在，可以选择覆盖或生成唯一文件名</li>
                    </ul>
                </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
                <Button
                    variant="secondary"
                    onClick={handleCancel}
                >
                    取消
                </Button>
                <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={!isValidPath || !selectedPath.trim() || loading}
                >
                    确认下载
                </Button>
            </div>
        </Modal>
    );
};