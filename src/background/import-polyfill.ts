// Polyfill for dynamic imports in service worker
// This replaces Vite's default dynamic import handling which uses window/document

declare global {
  var __vite__mapDeps: (indexes: number[]) => string[]
}

// Simple dynamic import without preloading for service workers
export function serviceWorkerImport(path: string): Promise<any> {
  // Direct import without any DOM manipulation
  return import(path)
}

// Map dependencies if needed (Vite compatibility)
if (!globalThis.__vite__mapDeps) {
  globalThis.__vite__mapDeps = (indexes: number[]) => {
    // Return empty array - dependencies will be loaded on demand
    return []
  }
}