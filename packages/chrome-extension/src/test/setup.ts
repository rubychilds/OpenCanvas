import { vi } from 'vitest';

/**
 * Create a fresh Chrome API mock for testing.
 *
 * Usage in tests:
 *   const mockChrome = createChromeMock();
 *   vi.stubGlobal('chrome', mockChrome);
 */
export function createChromeMock() {
  const storageData: Record<string, unknown> = {};
  const storageListeners: Array<(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void> = [];

  return {
    runtime: {
      id: 'test-extension-id',
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      lastError: null as chrome.runtime.LastError | null,
    },
    storage: {
      local: {
        get: vi.fn().mockImplementation((keys) => {
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            keys.forEach(k => { if (k in storageData) result[k] = storageData[k]; });
            return Promise.resolve(result);
          }
          return Promise.resolve(storageData);
        }),
        set: vi.fn().mockImplementation((items) => {
          const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
          Object.entries(items).forEach(([key, value]) => {
            changes[key] = { oldValue: storageData[key], newValue: value };
            storageData[key] = value;
          });
          storageListeners.forEach(listener => listener(changes));
          return Promise.resolve();
        }),
        remove: vi.fn().mockImplementation((keys) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(k => delete storageData[k]);
          return Promise.resolve();
        }),
      },
      onChanged: {
        addListener: vi.fn().mockImplementation((listener) => {
          storageListeners.push(listener);
        }),
        removeListener: vi.fn().mockImplementation((listener) => {
          const idx = storageListeners.indexOf(listener);
          if (idx > -1) storageListeners.splice(idx, 1);
        }),
      },
    },
    tabs: {
      create: vi.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      get: vi.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
      update: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// Note: Individual test files should call vi.stubGlobal('chrome', createChromeMock())
// in their beforeEach hooks to avoid side effects between tests.
