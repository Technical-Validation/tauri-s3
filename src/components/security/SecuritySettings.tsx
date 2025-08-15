import React, { useState, useEffect } from 'react';
import { SecurityService, EncryptionMetadata, SecureStorageOptions } from '../../services/securityService';
import { SecuritySettings as SecuritySettingsType } from '../../types/security';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface SecuritySettingsProps {
    onClose?: () => void;
    className?: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
    onClose,
    className = '',
}) => {
    const [settings, setSettings] = useState<SecuritySettingsType>(SecurityService.getSettings());
    const [hasChanges, setHasChanges] = useState(false);
    const [encryptionMetadata, setEncryptionMetadata] = useState<EncryptionMetadata | null>(null);
    const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [passwordLength, setPasswordLength] = useState(32);
    const [storageOptions, setStorageOptions] = useState<SecureStorageOptions>({
        enableEncryption: true,
        enableSecureDelete: true,
        enableMemoryProtection: true,
        keyDerivationIterations: 100000,
    });

    useEffect(() => {
        loadEncryptionMetadata();
        SecurityService.enableMemoryProtection();
    }, []);

    const loadEncryptionMetadata = async () => {
        try {
            const metadata = await SecurityService.getEncryptionMetadata();
            setEncryptionMetadata(metadata);
        } catch (error) {
            console.error('Failed to load encryption metadata:', error);
        }
    };

    const handleSettingChange = (key: keyof SecuritySettingsType, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        setHasChanges(true);
    };

    const handleSave = () => {
        SecurityService.updateSettings(settings);
        setHasChanges(false);
    };

    const handleReset = () => {
        const defaultSettings = SecurityService.getSettings();
        setSettings(defaultSettings);
        setHasChanges(false);
    };

    const handleGeneratePassword = () => {
        const password = SecurityService.generateSecurePassword(passwordLength);
        setGeneratedPassword(password);
    };

    const handleCopyPassword = async () => {
        if (generatedPassword) {
            try {
                await navigator.clipboard.writeText(generatedPassword);
                // Password will be automatically cleared from clipboard after 30 seconds
            } catch (error) {
                console.error('Failed to copy password:', error);
            }
        }
    };

    const handleStorageOptionChange = (key: keyof SecureStorageOptions, value: any) => {
        setStorageOptions(prev => ({ ...prev, [key]: value }));
    };

    const validateStorageOptions = () => {
        return SecurityService.validateEncryptionSettings(storageOptions);
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">安全设置</h3>
                {onClose && (
                    <Button onClick={onClose} variant="ghost" size="sm">
                        ✕
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {/* General Security Settings */}
                <div>
                    <h4 className="font-medium mb-3">常规设置</h4>
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings.enableSecurityWarnings}
                                onChange={(e) => handleSettingChange('enableSecurityWarnings', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用安全警告</span>
                        </label>

                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings.autoSecurityChecks}
                                onChange={(e) => handleSettingChange('autoSecurityChecks', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">自动安全检查</span>
                        </label>
                    </div>
                </div>

                {/* Network Security Settings */}
                <div>
                    <h4 className="font-medium mb-3">网络安全</h4>
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings.enableNetworkChecks}
                                onChange={(e) => handleSettingChange('enableNetworkChecks', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用网络安全检查</span>
                        </label>

                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings.enableCertificateValidation}
                                onChange={(e) => handleSettingChange('enableCertificateValidation', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用SSL证书验证</span>
                        </label>
                    </div>
                </div>

                {/* Configuration Security Settings */}
                <div>
                    <h4 className="font-medium mb-3">配置安全</h4>
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={settings.enableConfigurationChecks}
                                onChange={(e) => handleSettingChange('enableConfigurationChecks', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用配置安全检查</span>
                        </label>
                    </div>
                </div>

                {/* Timing Settings */}
                <div>
                    <h4 className="font-medium mb-3">时间设置</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                警告忽略超时 (小时)
                            </label>
                            <Input
                                type="number"
                                min="1"
                                max="168"
                                value={settings.warningDismissalTimeout}
                                onChange={(e) => handleSettingChange('warningDismissalTimeout', parseInt(e.target.value))}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                忽略的警告在此时间后会重新显示
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                自动检查间隔 (分钟)
                            </label>
                            <Input
                                type="number"
                                min="5"
                                max="1440"
                                value={settings.securityCheckInterval}
                                onChange={(e) => handleSettingChange('securityCheckInterval', parseInt(e.target.value))}
                                className="w-full"
                                disabled={!settings.autoSecurityChecks}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                自动安全检查的执行间隔
                            </p>
                        </div>
                    </div>
                </div>

                {/* Encryption Settings */}
                <div>
                    <h4 className="font-medium mb-3">加密设置</h4>
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={storageOptions.enableEncryption}
                                onChange={(e) => handleStorageOptionChange('enableEncryption', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用配置加密存储</span>
                        </label>

                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={storageOptions.enableSecureDelete}
                                onChange={(e) => handleStorageOptionChange('enableSecureDelete', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用安全删除</span>
                        </label>

                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={storageOptions.enableMemoryProtection}
                                onChange={(e) => handleStorageOptionChange('enableMemoryProtection', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">启用内存保护</span>
                        </label>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                密钥派生迭代次数
                            </label>
                            <Input
                                type="number"
                                min="50000"
                                max="1000000"
                                step="10000"
                                value={storageOptions.keyDerivationIterations}
                                onChange={(e) => handleStorageOptionChange('keyDerivationIterations', parseInt(e.target.value))}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                更高的迭代次数提供更好的安全性，但会增加处理时间
                            </p>
                        </div>

                        {encryptionMetadata && (
                            <div className="bg-gray-50 p-3 rounded-md">
                                <h5 className="text-sm font-medium mb-2">当前加密信息</h5>
                                <div className="text-xs text-gray-600 space-y-1">
                                    <div>算法: {encryptionMetadata.algorithm}</div>
                                    <div>版本: {encryptionMetadata.version}</div>
                                    <div>密钥派生: {encryptionMetadata.keyDerivation}</div>
                                    <div>迭代次数: {encryptionMetadata.iterations.toLocaleString()}</div>
                                    <div>盐值大小: {encryptionMetadata.saltSize} 字节</div>
                                    <div>随机数大小: {encryptionMetadata.nonceSize} 字节</div>
                                </div>
                            </div>
                        )}

                        {validateStorageOptions().length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                                <h5 className="text-sm font-medium text-yellow-800 mb-1">安全警告</h5>
                                <ul className="text-xs text-yellow-700 space-y-1">
                                    {validateStorageOptions().map((warning, index) => (
                                        <li key={index}>• {warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Password Generator */}
                <div>
                    <h4 className="font-medium mb-3">密码生成器</h4>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <label className="text-sm">长度:</label>
                            <Input
                                type="number"
                                min="8"
                                max="128"
                                value={passwordLength}
                                onChange={(e) => setPasswordLength(parseInt(e.target.value))}
                                className="w-20"
                            />
                            <Button
                                onClick={handleGeneratePassword}
                                variant="outline"
                                size="sm"
                            >
                                生成密码
                            </Button>
                        </div>

                        {generatedPassword && (
                            <div className="bg-gray-50 p-3 rounded-md">
                                <div className="flex items-center justify-between">
                                    <code className="text-sm font-mono break-all">{generatedPassword}</code>
                                    <Button
                                        onClick={handleCopyPassword}
                                        variant="ghost"
                                        size="sm"
                                        className="ml-2"
                                    >
                                        复制
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    密码已复制到剪贴板，将在30秒后自动清除
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Security Actions */}
                <div>
                    <h4 className="font-medium mb-3">安全操作</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                            onClick={() => SecurityService.clearAllWarnings()}
                            variant="outline"
                            size="sm"
                        >
                            清除所有警告
                        </Button>

                        <Button
                            onClick={() => SecurityService.clearSensitiveData()}
                            variant="outline"
                            size="sm"
                        >
                            清除敏感数据
                        </Button>

                        <Button
                            onClick={async () => {
                                if (confirm('确定要安全关闭应用程序吗？这将清除所有敏感数据。')) {
                                    await SecurityService.secureShutdown();
                                }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                            安全关闭
                        </Button>

                        <Button
                            onClick={async () => {
                                if (confirm('确定要删除加密配置吗？此操作不可撤销。')) {
                                    try {
                                        await SecurityService.secureDeleteConfiguration();
                                        alert('配置已安全删除');
                                    } catch (error) {
                                        alert(`删除失败: ${error}`);
                                    }
                                }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                            删除加密配置
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                        onClick={handleReset}
                        variant="outline"
                        disabled={!hasChanges}
                    >
                        重置
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges}
                    >
                        保存设置
                    </Button>
                </div>
            </div>
        </div>
    );
};