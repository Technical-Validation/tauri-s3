import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Mock Tauri API for E2E tests
const mockTauriApi = {
    invoke: vi.fn(),
    event: {
        listen: vi.fn(),
        emit: vi.fn(),
    },
    fs: {
        writeTextFile: vi.fn(),
        readTextFile: vi.fn(),
        exists: vi.fn(),
        removeFile: vi.fn(),
    },
    dialog: {
        save: vi.fn(),
        open: vi.fn(),
    },
}

// Global setup for E2E tests
beforeAll(() => {
    // Mock window.tauri
    Object.defineProperty(window, '__TAURI__', {
        value: mockTauriApi,
        writable: true,
    })

    // Mock window.tauri.invoke
    Object.defineProperty(window, '__TAURI_INVOKE__', {
        value: mockTauriApi.invoke,
        writable: true,
    })

    // Setup localStorage mock
    const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
    })

    // Setup sessionStorage mock
    Object.defineProperty(window, 'sessionStorage', {
        value: localStorageMock,
        writable: true,
    })
})

afterAll(() => {
    // Cleanup global mocks
    vi.clearAllMocks()
})

beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Reset default mock implementations
    mockTauriApi.invoke.mockResolvedValue(undefined)
    mockTauriApi.fs.exists.mockResolvedValue(false)
    mockTauriApi.fs.writeTextFile.mockResolvedValue(undefined)
    mockTauriApi.fs.readTextFile.mockResolvedValue('')
})

afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks()
})

export { mockTauriApi }