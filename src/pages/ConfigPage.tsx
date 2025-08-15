import React, { useState, useEffect } from 'react';
import { MainContent } from '../components/layout';
import { ConfigList, ConfigForm } from '../components/config';
import { useConfig } from '../hooks/useConfig';
import { ImportResult } from '../types/config';
import { Toast } from '../components/common';

const ConfigPage = () => {
  const {
    configs,
    activeConfigId,
    selectedConfigs,
    searchQuery,
    sortBy,
    sortOrder,
    loading,
    error,
    setActiveConfig,
    toggleConfigSelection,
    selectAllConfigs,
    clearSelection,
    setSearchQuery,
    setSorting,
    deleteConfig,
    duplicateConfig,
    testConnection,
    initializeFromBackend,
  } = useConfig();

  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Initialize configs on mount
  useEffect(() => {
    initializeFromBackend();
  }, [initializeFromBackend]);

  // Show toast for errors
  useEffect(() => {
    if (error) {
      setToastMessage({
        type: 'error',
        message: error,
      });
    }
  }, [error]);

  const handleConfigEdit = (configId: string) => {
    setEditingConfigId(configId);
    setShowConfigForm(true);
  };

  const handleConfigDelete = async (configId: string) => {
    try {
      await deleteConfig(configId);
      setToastMessage({
        type: 'success',
        message: '配置删除成功',
      });
    } catch (error) {
      setToastMessage({
        type: 'error',
        message: error instanceof Error ? error.message : '删除配置失败',
      });
    }
  };

  const handleConfigDuplicate = async (configId: string) => {
    try {
      await duplicateConfig(configId);
      setToastMessage({
        type: 'success',
        message: '配置复制成功',
      });
    } catch (error) {
      setToastMessage({
        type: 'error',
        message: error instanceof Error ? error.message : '复制配置失败',
      });
    }
  };

  const handleConfigTest = async (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    try {
      const result = await testConnection(config);
      setToastMessage({
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `连接测试成功 (耗时: ${result.duration}ms)`
          : `连接测试失败: ${result.error?.message || '未知错误'}`,
      });
    } catch (error) {
      setToastMessage({
        type: 'error',
        message: error instanceof Error ? error.message : '连接测试失败',
      });
    }
  };

  const handleCreateNew = () => {
    setEditingConfigId(null);
    setShowConfigForm(true);
  };

  const handleFormClose = () => {
    setShowConfigForm(false);
    setEditingConfigId(null);
  };

  const handleImportComplete = (result: ImportResult) => {
    if (result.success) {
      setToastMessage({
        type: 'success',
        message: `导入成功: ${result.imported} 个配置已导入${result.skipped > 0 ? `, ${result.skipped} 个配置被跳过` : ''}`,
      });
    } else {
      setToastMessage({
        type: 'error',
        message: `导入失败: ${result.errors.join(', ')}`,
      });
    }
  };

  const handleBatchOperationComplete = (operation: string, success: boolean, message?: string) => {
    setToastMessage({
      type: success ? 'success' : 'error',
      message: message || `${operation} ${success ? '成功' : '失败'}`,
    });
  };

  return (
    <>
      <MainContent
        title="S3 配置管理"
        subtitle="管理您的 S3 连接配置，支持多环境和批量操作"
      >
        <div className="space-y-6">
          <ConfigList
            configs={configs}
            activeConfigId={activeConfigId}
            selectedConfigs={selectedConfigs}
            searchQuery={searchQuery}
            sortBy={sortBy}
            sortOrder={sortOrder}
            loading={loading}
            onConfigSelect={toggleConfigSelection}
            onConfigEdit={handleConfigEdit}
            onConfigDelete={handleConfigDelete}
            onConfigDuplicate={handleConfigDuplicate}
            onConfigTest={handleConfigTest}
            onSetActiveConfig={setActiveConfig}
            onToggleSelection={toggleConfigSelection}
            onSelectAll={selectAllConfigs}
            onClearSelection={clearSelection}
            onSearchChange={setSearchQuery}
            onSortChange={setSorting}
            onCreateNew={handleCreateNew}
            onImportComplete={handleImportComplete}
            onBatchOperationComplete={handleBatchOperationComplete}
          />
        </div>
      </MainContent>

      {/* Config Form Modal */}
      {showConfigForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingConfigId ? '编辑配置' : '新建配置'}
              </h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ConfigForm
              configId={editingConfigId}
              onSave={() => {
                handleFormClose();
                setToastMessage({
                  type: 'success',
                  message: editingConfigId ? '配置更新成功' : '配置创建成功',
                });
              }}
              onCancel={handleFormClose}
            />
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
};

export default ConfigPage