# Development Guide

## Project Structure

```
s3-upload-tool/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── common/              # Reusable UI components
│   │   ├── config/              # Configuration management
│   │   ├── files/               # File browser components
│   │   ├── upload/              # Upload-related components
│   │   └── layout/              # Layout components
│   ├── stores/                  # Zustand state stores
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Business logic services
│   ├── types/                   # TypeScript type definitions
│   ├── pages/                   # Page components
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # App entry point
│   └── index.css                # Global styles
├── src-tauri/                   # Tauri backend (Rust)
│   ├── src/                     # Rust source code
│   ├── capabilities/            # Tauri permissions
│   ├── icons/                   # App icons
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── scripts/                     # Development scripts
├── dist/                        # Build output
└── node_modules/               # Node.js dependencies
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- Rust (latest stable)
- System dependencies for Tauri (see below)

### System Dependencies

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Fedora/RHEL/CentOS
```bash
sudo dnf install -y \
  webkit2gtk4.0-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

#### Arch Linux
```bash
sudo pacman -S --needed \
  webkit2gtk \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  gtk3 \
  libappindicator-gtk3 \
  librsvg \
  libvips
```

### Quick Setup

Run the automated setup script:
```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

### Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Rust (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

## Development Commands

### Frontend Development
```bash
npm run dev          # Start Vite dev server
npm run build        # Build frontend
npm run preview      # Preview built frontend
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
```

### Tauri Development
```bash
npm run tauri:dev    # Start Tauri development mode
npm run tauri:build  # Build complete application
npm run tauri        # Run Tauri CLI commands
```

## Code Style and Standards

### TypeScript
- Use strict TypeScript configuration
- Define proper interfaces for all data structures
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### React
- Use functional components with hooks
- Follow React best practices
- Use proper prop types and interfaces
- Implement error boundaries where needed

### Styling
- Use Tailwind CSS for styling
- Follow mobile-first responsive design
- Use semantic class names
- Maintain consistent spacing and colors

### Rust
- Follow Rust naming conventions
- Use proper error handling with Result types
- Add documentation comments for public functions
- Use clippy for code quality checks

## State Management

### Zustand Stores
- `configStore`: S3 configuration management
- `fileStore`: File browser state and operations
- `uploadStore`: Upload queue and progress tracking

### Store Structure
```typescript
interface Store {
  // State
  data: DataType;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadData: () => Promise<void>;
  updateData: (data: Partial<DataType>) => void;
  clearError: () => void;
}
```

## API Integration

### S3 Client
- Use AWS SDK for JavaScript v3
- Implement proper error handling
- Support custom endpoints
- Handle authentication securely

### Tauri Commands
- Define commands in Rust backend
- Use proper serialization/deserialization
- Implement error handling
- Add security validations

## Testing Strategy

### Unit Tests
- Test React components with React Testing Library
- Test custom hooks with @testing-library/react-hooks
- Test utility functions with Jest
- Test Rust functions with built-in test framework

### Integration Tests
- Test Tauri commands
- Test S3 operations
- Test file system operations
- Test configuration management

### E2E Tests
- Test complete user workflows
- Test error scenarios
- Test performance with large files
- Test security features

## Security Considerations

### Configuration Storage
- Encrypt sensitive data with AES-256
- Use PBKDF2 for key derivation
- Generate unique salt for each encryption
- Clear sensitive data from memory

### Network Security
- Enforce HTTPS connections
- Validate SSL certificates
- Support custom CA certificates
- Implement request timeouts

### Input Validation
- Validate all user inputs
- Sanitize file names and paths
- Check file types and sizes
- Prevent path traversal attacks

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Use code splitting for route-based chunks
- Optimize bundle size with tree shaking

### Backend
- Use async/await for I/O operations
- Implement connection pooling
- Cache frequently accessed data
- Use streaming for large file operations

## Debugging

### Frontend Debugging
```bash
# Enable React DevTools
npm run dev

# Debug with browser DevTools
# Open http://localhost:5173 in browser
```

### Backend Debugging
```bash
# Enable Rust logging
RUST_LOG=debug npm run tauri:dev

# Use Rust debugger
# Add breakpoints in VS Code with rust-analyzer
```

### Common Issues

1. **Build Failures**
   - Check system dependencies
   - Verify Node.js and Rust versions
   - Clear node_modules and reinstall

2. **Tauri Compilation Errors**
   - Install missing system libraries
   - Update Rust toolchain
   - Check Cargo.toml dependencies

3. **TypeScript Errors**
   - Run type checking: `npm run type-check`
   - Update type definitions
   - Check import/export statements

## Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation
4. Test on multiple platforms
5. Submit pull requests with clear descriptions

## Release Process

1. Update version in package.json and Cargo.toml
2. Run full test suite
3. Build for all target platforms
4. Create release notes
5. Tag release in git
6. Publish release artifacts