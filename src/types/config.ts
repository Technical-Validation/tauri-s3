// S3 Configuration Interface
export interface S3Config {
  id: string;
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  connectionStatus?: 'connected' | 'error' | 'testing' | 'unknown';
  connectionError?: string;
  tags?: string[];
}

// Configuration Template Interface
export interface ConfigTemplate {
  id: string;
  name: string;
  provider: 'aws' | 'minio' | 'aliyun' | 'tencent' | 'custom';
  description: string;
  icon: string;
  defaultValues: Partial<S3Config>;
  requiredFields: string[];
  regions?: { value: string; label: string }[];
}

// Configuration validation result
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Configuration export/import options
export interface ConfigExportOptions {
  includeSensitiveData: boolean;
  encryptData?: boolean;
  exportPath?: string;
}

export interface ConfigImportOptions {
  overwriteExisting?: boolean;
  validateBeforeImport?: boolean;
  skipInvalid?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  conflicts: ConfigConflict[];
}

export interface ConfigConflict {
  existingConfig: S3Config;
  newConfig: Partial<S3Config>;
  conflictType: 'name' | 'duplicate';
}

export interface ConnectionTestResult {
  success: boolean;
  duration: number;
  details: {
    authentication: boolean;
    bucketAccess: boolean;
    permissions: string[];
    bucketInfo?: {
      region: string;
      creationDate: Date;
      objectCount?: number;
    };
  };
  error?: {
    code: string;
    message: string;
    suggestions: string[];
  };
}

// Configuration Store Interface
export interface ConfigStore {
  configs: S3Config[];
  activeConfigId: string | null;
  selectedConfigs: string[];
  searchQuery: string;
  sortBy: 'name' | 'lastUsed' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error: string | null;

  // CRUD operations
  addConfig: (config: Omit<S3Config, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateConfig: (id: string, config: Partial<S3Config>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  deleteConfigs: (ids: string[]) => Promise<void>;
  duplicateConfig: (id: string) => Promise<void>;
  getConfig: (id: string) => S3Config | null;

  // Selection and filtering
  setActiveConfig: (id: string) => void;
  toggleConfigSelection: (id: string) => void;
  selectAllConfigs: () => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  // Import/Export
  exportConfigs: (configIds?: string[], includeSensitive?: boolean) => Promise<void>;
  importConfigs: (file: File | string, options?: ConfigImportOptions) => Promise<ImportResult>;

  // Connection testing
  testConnection: (config: S3Config) => Promise<ConnectionTestResult>;
  testAllConnections: () => Promise<void>;

  // Templates
  getTemplates: () => ConfigTemplate[];
  createFromTemplate: (templateId: string) => Partial<S3Config>;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initializeFromBackend: () => Promise<void>;
}