# S3 Upload Tool

一个基于 Tauri + React + TypeScript + Tailwind CSS 的 S3 文件管理工具。

## 功能特性

- 🔧 S3 配置管理
- 📁 文件浏览和管理
- ⬆️ 文件上传功能
- ⬇️ 文件下载功能
- 🔒 安全的凭据存储
- 📦 配置导入导出

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Tauri (Rust)
- **状态管理**: Zustand
- **路由**: React Router
- **S3 客户端**: AWS SDK for JavaScript v3
- **构建工具**: Vite

## 开发环境设置

### 前置要求

- Node.js (推荐 18+)
- Rust (通过 rustup 安装)
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

### 构建 Tauri 应用

```bash
npm run tauri build
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── common/         # 通用组件
│   ├── config/         # 配置相关组件
│   ├── files/          # 文件管理组件
│   ├── upload/         # 上传相关组件
│   └── layout/         # 布局组件
├── pages/              # 页面组件
├── stores/             # Zustand 状态管理
├── hooks/              # 自定义 Hooks
├── services/           # 服务层
├── types/              # TypeScript 类型定义
└── utils/              # 工具函数

src-tauri/              # Tauri 后端代码
├── src/                # Rust 源代码
├── icons/              # 应用图标
└── tauri.conf.json     # Tauri 配置
```

## 开发指南

1. 配置管理 - 在配置页面添加您的 S3 凭据
2. 文件浏览 - 浏览和管理 S3 存储桶中的文件
3. 文件上传 - 通过拖拽或选择文件进行上传
4. 文件下载 - 下载 S3 中的文件到本地

## 许可证

MIT License