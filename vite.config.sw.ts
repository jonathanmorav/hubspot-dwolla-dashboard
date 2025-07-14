import { defineConfig } from 'vite'
import { resolve } from 'path'

// Separate Vite config for building the service worker as IIFE
export default defineConfig({
  build: {
    // Output to a specific directory for service worker
    outDir: 'dist-sw',
    emptyOutDir: true,
    
    // Build as library with IIFE format
    lib: {
      entry: resolve(__dirname, 'src/background/service-worker-static.ts'),
      name: 'ServiceWorker',
      formats: ['iife'],
      fileName: () => 'service-worker.js'
    },
    
    rollupOptions: {
      output: {
        // Ensure IIFE format
        format: 'iife',
        // No external dependencies - bundle everything
        inlineDynamicImports: true,
        // Ensure no module preloading
        manualChunks: undefined,
        // Ensure the output is a single file
        entryFileNames: 'service-worker.js',
        chunkFileNames: 'service-worker.js',
        assetFileNames: 'service-worker.js'
      }
    },
    
    // Minify for production
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false
      },
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      }
    },
    
    // Target for Chrome extensions
    target: 'chrome89',
    
    // No source maps in production
    sourcemap: false
  },
  
  // Ensure we resolve Chrome API types
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // Define globals
  define: {
    'chrome': 'chrome'
  }
})