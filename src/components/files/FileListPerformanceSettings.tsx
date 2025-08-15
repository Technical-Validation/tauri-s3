import React, { useState } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface FileListPerformanceSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FileListPerformanceSettings: React.FC<FileListPerformanceSettingsProps> = ({
    isOpen,
    onClose,
}) => {
    const { getCacheStats, clearCache, preloadPaths } = useFileStore();
    const [isClearing, setIsClearing] = useState(false);
    const [isPreloading, setIsPreloading] = useState(false);
    const [preloadPathsInput, setPreloadPathsInput] = useState('');

    const cacheStats = getCacheStats();

    const handleClearCache = async () => {
        setIsClearing(true);
        try {
            clearCache();
            // Small delay to show the loading state
            await new Promise(resolve => setTimeout(resolve, 500));
        } finally {
            setIsClearing(false);
        }
    };

    const handlePreloadPaths = async () => {
        if (!preloadPathsInput.trim()) return;

        setIsPreloading(true);
        try {
            const paths = preloadPathsInput
                .split('\n')
                .map(path => path.trim())
                .filter(path => path.length > 0);

            await preloadPaths(paths);
            setPreloadPathsInput('');
        } catch (error) {
            console.error('Failed to preload paths:', error);
        } finally {
            setIsPreloading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="文件列表性能设置">
            <div className="space-y-6">
                {/* Cache Statistics */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">缓存统计</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">缓存条目数:</span>
                            <span className="text-sm font-medium text-gray-900">{cacheStats.totalEntries}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">缓存命中率:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {(cacheStats.hitRate * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">缓存大小:</span>
                            <span className="text-sm font-medium text-gray-900">{cacheStats.size} 项</span>
                        </div>
                    </div>
                </div>

                {/* Cache Management */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">缓存管理</h3>
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            onClick={handleClearCache}
                            disabled={isClearing}
                            className="w-full flex items-center justify-center space-x-2"
                        >
                            {isClearing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                    <span>清理中...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>清理缓存</span>
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-gray-500">
                            清理所有缓存的文件列表数据，下次访问时将重新加载
                        </p>
                    </div>
                </div>

                {/* Path Preloading */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">路径预加载</h3>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="preload-paths" className="block text-sm font-medium text-gray-700 mb-2">
                                预加载路径 (每行一个)
                            </label>
                            <textarea
                                id="preload-paths"
                                value={preloadPathsInput}
                                onChange={(e) => setPreloadPathsInput(e.target.value)}
                                placeholder="例如:&#10;folder1/&#10;folder2/subfolder/&#10;images/"
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <Button
                            variant="primary"
                            onClick={handlePreloadPaths}
                            disabled={isPreloading || !preloadPathsInput.trim()}
                            className="w-full flex items-center justify-center space-x-2"
                        >
                            {isPreloading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>预加载中...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>开始预加载</span>
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-gray-500">
                            预加载常用路径可以提高访问速度，建议在网络空闲时使用
                        </p>
                    </div>
                </div>

                {/* Performance Tips */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">性能建议</h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                        <ul className="text-sm text-blue-800 space-y-2">
                            <li className="flex items-start space-x-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>对于包含大量文件的文件夹，建议使用分页模式</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>虚拟滚动适合快速浏览大量文件</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>使用搜索和过滤功能可以快速定位文件</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>定期清理缓存可以释放内存空间</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button variant="outline" onClick={onClose}>
                    关闭
                </Button>
            </div>
        </Modal>
    );
};