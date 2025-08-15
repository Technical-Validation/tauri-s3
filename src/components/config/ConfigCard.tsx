import React, { useState } from 'react';
import { S3Config } from '../../types/config';
import { StatusIndicator } from '../common/StatusIndicator';
import { Button } from '../common/Button';
import { useConfigTemplates } from '../../hooks/useConfigTemplates';

interface ConfigCardProps {
    config: S3Config;
    isActive: boolean;
    isSelected: boolean;
    viewMode: 'grid' | 'list';
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onTest: () => void;
    onSetActive: () => void;
    className?: string;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({
    config,
    isActive,
    isSelected,
    viewMode,
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    onTest,
    onSetActive,
    className = '',
}) => {
    const [showActions, setShowActions] = useState(false);
    const { templates } = useConfigTemplates();

    const template = templates.find(t => t.id === config.templateId);
    const connectionStatus = config.connectionStatus || 'unknown';

    const formatDate = (date: Date | undefined) => {
        if (!date) return '未知';
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'green';
            case 'error': return 'red';
            case 'testing': return 'yellow';
            default: return 'gray';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'connected': return '已连接';
            case 'error': return '连接错误';
            case 'testing': return '测试中';
            default: return '未测试';
        }
    };

    if (viewMode === 'list') {
        return (
            <div
                className={`
          bg-white border rounded-lg p-4 transition-all duration-200
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
          ${isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${className}
        `}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                        {/* Selection Checkbox */}
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={onSelect}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />

                        {/* Template Icon */}
                        <div className="text-2xl">{template?.icon || '⚙️'}</div>

                        {/* Config Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                    {config.name}
                                </h3>
                                {isActive && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        活跃
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span>{config.bucketName}</span>
                                <span>•</span>
                                <span>{config.region}</span>
                                {template && (
                                    <>
                                        <span>•</span>
                                        <span>{template.name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <StatusIndicator
                                status={getStatusColor(connectionStatus)}
                                size="sm"
                            />
                            <span className="text-sm text-gray-600">
                                {getStatusText(connectionStatus)}
                            </span>
                        </div>

                        {/* Last Used */}
                        <div className="text-sm text-gray-500 min-w-0">
                            <div>最后使用</div>
                            <div className="truncate">{formatDate(config.lastUsed)}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center gap-2 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onTest}
                            title="测试连接"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onEdit}
                            title="编辑配置"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </Button>
                        <ConfigCardMenu
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onSetActive={onSetActive}
                            isActive={isActive}
                        />
                    </div>
                </div>

                {/* Error Message */}
                {connectionStatus === 'error' && config.connectionError && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {config.connectionError}
                    </div>
                )}
            </div>
        );
    }

    // Grid view
    return (
        <div
            className={`
        relative bg-white border rounded-lg p-6 transition-all duration-200 cursor-pointer
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
        ${isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${className}
      `}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* Active Badge */}
            {isActive && (
                <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        活跃
                    </span>
                </div>
            )}

            {/* Template Icon */}
            <div className="text-center mb-4">
                <div className="text-4xl mb-2">{template?.icon || '⚙️'}</div>
                <div className="text-xs text-gray-500">{template?.name || '自定义'}</div>
            </div>

            {/* Config Info */}
            <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2 truncate" title={config.name}>
                    {config.name}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                    <div className="truncate" title={config.bucketName}>
                        <span className="font-medium">存储桶:</span> {config.bucketName}
                    </div>
                    <div className="truncate" title={config.region}>
                        <span className="font-medium">区域:</span> {config.region}
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <StatusIndicator
                    status={getStatusColor(connectionStatus)}
                    size="sm"
                />
                <span className="text-sm text-gray-600">
                    {getStatusText(connectionStatus)}
                </span>
            </div>

            {/* Tags */}
            {config.tags && config.tags.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                        {config.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                            >
                                {tag}
                            </span>
                        ))}
                        {config.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                +{config.tags.length - 3}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Last Used */}
            <div className="text-center text-xs text-gray-500 mb-4">
                最后使用: {formatDate(config.lastUsed)}
            </div>

            {/* Actions */}
            <div className={`flex justify-center gap-2 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTest();
                    }}
                    title="测试连接"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    title="编辑配置"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </Button>
                <ConfigCardMenu
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onSetActive={onSetActive}
                    isActive={isActive}
                />
            </div>

            {/* Error Message */}
            {connectionStatus === 'error' && config.connectionError && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <div className="font-medium mb-1">连接错误:</div>
                    <div className="truncate" title={config.connectionError}>
                        {config.connectionError}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ConfigCardMenuProps {
    onDuplicate: () => void;
    onDelete: () => void;
    onSetActive: () => void;
    isActive: boolean;
}

const ConfigCardMenu: React.FC<ConfigCardMenuProps> = ({
    onDuplicate,
    onDelete,
    onSetActive,
    isActive,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                title="更多操作"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                        <div className="py-1">
                            {!isActive && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetActive();
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    设为活跃配置
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                复制配置
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                删除配置
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ConfigCard;